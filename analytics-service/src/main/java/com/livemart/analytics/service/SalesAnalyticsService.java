package com.livemart.analytics.service;

import com.livemart.analytics.domain.DailySalesRecord;
import com.livemart.analytics.repository.DailySalesRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesAnalyticsService {

    private final DailySalesRecordRepository dailySalesRecordRepository;
    private final Map<String, BigDecimal> categorySales = new LinkedHashMap<>();
    private final Map<Long, List<Purchase>> customerPurchases = new HashMap<>();

    @Transactional(readOnly = true)
    public DailySalesReport getDailySalesReport(LocalDate startDate, LocalDate endDate) {
        List<DailySalesRecord> records = dailySalesRecordRepository
                .findBySalesDateBetweenOrderBySalesDate(startDate, endDate);
        Map<LocalDate, BigDecimal> recordMap = records.stream()
                .collect(Collectors.toMap(DailySalesRecord::getSalesDate, DailySalesRecord::getTotalAmount));
        Map<LocalDate, BigDecimal> salesByDate = new TreeMap<>();
        BigDecimal totalSales = BigDecimal.ZERO;
        int totalOrders = 0;
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            BigDecimal dailyAmount = recordMap.getOrDefault(current, BigDecimal.ZERO);
            salesByDate.put(current, dailyAmount);
            totalSales = totalSales.add(dailyAmount);
            if (dailyAmount.compareTo(BigDecimal.ZERO) > 0) totalOrders++;
            current = current.plusDays(1);
        }
        BigDecimal avgDailySales = totalOrders > 0
                ? totalSales.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal todaySales = salesByDate.getOrDefault(endDate, BigDecimal.ZERO);
        BigDecimal yesterdaySales = salesByDate.getOrDefault(endDate.minusDays(1), BigDecimal.ZERO);
        double changeRate = yesterdaySales.compareTo(BigDecimal.ZERO) > 0
                ? todaySales.subtract(yesterdaySales).divide(yesterdaySales, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;
        log.info("Daily sales report: startDate={}, endDate={}, totalSales={}, orders={}",
                startDate, endDate, totalSales, totalOrders);
        return new DailySalesReport(salesByDate, totalSales, totalOrders, avgDailySales, changeRate);
    }

    @Transactional(readOnly = true)
    public MonthlySalesReport getMonthlySalesReport(int year) {
        Map<YearMonth, BigDecimal> salesByMonth = new TreeMap<>();
        BigDecimal totalYearlySales = BigDecimal.ZERO;
        for (int month = 1; month <= 12; month++) {
            YearMonth yearMonth = YearMonth.of(year, month);
            BigDecimal monthlySales = dailySalesRecordRepository
                    .sumTotalAmountBetween(yearMonth.atDay(1), yearMonth.atEndOfMonth());
            salesByMonth.put(yearMonth, monthlySales);
            totalYearlySales = totalYearlySales.add(monthlySales);
        }
        YearMonth peakMonth = salesByMonth.entrySet().stream()
                .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
        BigDecimal avgMonthlySales = totalYearlySales.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
        // 전년 대비 성장률: 실제 DB 데이터로 계산
        BigDecimal prevYearTotal = dailySalesRecordRepository
                .sumTotalAmountBetween(LocalDate.of(year - 1, 1, 1), LocalDate.of(year - 1, 12, 31));
        double yoyGrowth = 0.0;
        if (prevYearTotal.compareTo(BigDecimal.ZERO) > 0) {
            yoyGrowth = totalYearlySales.subtract(prevYearTotal)
                    .divide(prevYearTotal, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue();
        }
        return new MonthlySalesReport(salesByMonth, totalYearlySales, avgMonthlySales, peakMonth, yoyGrowth);
    }

    public CategorySalesReport getCategorySalesReport() {
        BigDecimal totalSales = categorySales.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, CategoryStats> categoryStats = categorySales.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> {
                    double pct = totalSales.compareTo(BigDecimal.ZERO) > 0
                            ? entry.getValue().divide(totalSales, 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;
                    return new CategoryStats(entry.getKey(), entry.getValue(), pct);
                }));
        List<CategoryStats> topCategories = categoryStats.values().stream()
                .sorted(Comparator.comparing(CategoryStats::salesAmount).reversed()).limit(5).toList();
        return new CategorySalesReport(categoryStats, topCategories, totalSales);
    }

    public void recordCategorySale(String category, BigDecimal amount) {
        categorySales.merge(category, amount, BigDecimal::add);
    }

    @Transactional(readOnly = true)
    public ProductRankingReport getProductRankingReport(int limit) {
        log.warn("Product ranking returns placeholder data. Integrate product_sales table for real results.");
        List<ProductSales> products = new ArrayList<>();
        for (long i = 1; i <= 50; i++) products.add(new ProductSales(i, "Product " + i, 0, BigDecimal.ZERO));
        return new ProductRankingReport(
            products.stream().sorted(Comparator.comparing(ProductSales::revenue).reversed()).limit(limit).toList(),
            products.stream().sorted(Comparator.comparing(ProductSales::quantity).reversed()).limit(limit).toList());
    }

    public RfmAnalysisReport getRfmAnalysis() {
        List<CustomerRfm> customerRfms = new ArrayList<>();
        customerPurchases.forEach((customerId, purchases) -> {
            LocalDateTime last = purchases.stream().map(Purchase::purchaseDate)
                    .max(LocalDateTime::compareTo).orElse(LocalDateTime.now());
            long recency = java.time.Duration.between(last, LocalDateTime.now()).toDays();
            int frequency = purchases.size();
            BigDecimal monetary = purchases.stream().map(Purchase::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            int r = calculateRecencyScore(recency), f = calculateFrequencyScore(frequency),
                    m = calculateMonetaryScore(monetary);
            customerRfms.add(new CustomerRfm(customerId, recency, frequency, monetary, r, f, m,
                    classifyCustomerSegment(r, f, m)));
        });
        Map<String, Long> segmentCounts = customerRfms.stream()
                .collect(Collectors.groupingBy(CustomerRfm::segment, Collectors.counting()));
        log.info("RFM analysis: totalCustomers={}, segments={}", customerRfms.size(), segmentCounts);
        return new RfmAnalysisReport(customerRfms, segmentCounts);
    }

    public void recordCustomerPurchase(Long customerId, LocalDateTime purchaseDate, BigDecimal amount) {
        customerPurchases.computeIfAbsent(customerId, k -> new ArrayList<>())
                .add(new Purchase(customerId, purchaseDate, amount));
    }

    public CohortAnalysisReport getCohortAnalysis(int months) {
        Map<YearMonth, Map<Integer, Double>> cohortData = new TreeMap<>();
        YearMonth currentMonth = YearMonth.now();
        for (int i = 0; i < months; i++) {
            YearMonth cohortMonth = currentMonth.minusMonths(i);
            Map<Integer, Double> rates = new HashMap<>();
            for (int period = 0; period < months - i; period++)
                rates.put(period, 100.0 * Math.pow(0.85, period));
            cohortData.put(cohortMonth, rates);
        }
        return new CohortAnalysisReport(cohortData);
    }

    @Transactional(readOnly = true)
    public SalesForecastReport getSalesForecast(int futureDays) {
        LocalDate endDate = LocalDate.now();
        List<DailySalesRecord> records = dailySalesRecordRepository
                .findBySalesDateBetweenOrderBySalesDate(endDate.minusDays(30), endDate);
        Map<LocalDate, BigDecimal> recordMap = records.stream()
                .collect(Collectors.toMap(DailySalesRecord::getSalesDate, DailySalesRecord::getTotalAmount));
        List<Double> sales = new ArrayList<>();
        LocalDate current = endDate.minusDays(30);
        while (!current.isAfter(endDate)) {
            sales.add(recordMap.getOrDefault(current, BigDecimal.ZERO).doubleValue());
            current = current.plusDays(1);
        }
        LinearRegressionResult reg = calculateLinearRegression(sales);
        Map<LocalDate, BigDecimal> forecast = new TreeMap<>();
        for (int i = 1; i <= futureDays; i++) {
            double predicted = reg.slope() * (sales.size() + i) + reg.intercept();
            forecast.put(endDate.plusDays(i), BigDecimal.valueOf(Math.max(0, predicted)));
        }
        return new SalesForecastReport(forecast, reg.slope(), reg.intercept(), reg.rSquared());
    }

    private int calculateRecencyScore(long d) {
        return d <= 30 ? 5 : d <= 60 ? 4 : d <= 90 ? 3 : d <= 180 ? 2 : 1;
    }
    private int calculateFrequencyScore(int f) {
        return f >= 20 ? 5 : f >= 10 ? 4 : f >= 5 ? 3 : f >= 2 ? 2 : 1;
    }
    private int calculateMonetaryScore(BigDecimal a) {
        return a.compareTo(BigDecimal.valueOf(10000)) >= 0 ? 5 : a.compareTo(BigDecimal.valueOf(5000)) >= 0 ? 4
                : a.compareTo(BigDecimal.valueOf(2000)) >= 0 ? 3 : a.compareTo(BigDecimal.valueOf(500)) >= 0 ? 2 : 1;
    }
    private String classifyCustomerSegment(int r, int f, int m) {
        if (r >= 4 && f >= 4 && m >= 4) return "Champions";
        if (r >= 3 && f >= 3 && m >= 3) return "Loyal Customers";
        if (r >= 4 && f <= 2) return "Promising";
        if (r <= 2 && f >= 3) return "At Risk";
        if (r <= 2 && f <= 2) return "Lost";
        return "Others";
    }
    private LinearRegressionResult calculateLinearRegression(List<Double> values) {
        int n = values.size();
        if (n == 0) return new LinearRegressionResult(0, 0, 0);
        double sX = 0, sY = 0, sXY = 0, sX2 = 0;
        for (int i = 0; i < n; i++) {
            sX += i; sY += values.get(i); sXY += (double)i*values.get(i); sX2 += (double)i*i;
        }
        double d = n * sX2 - sX * sX;
        if (d == 0) return new LinearRegressionResult(0, sY / n, 0);
        double slope = (n * sXY - sX * sY) / d, intercept = (sY - slope * sX) / n;
        double meanY = sY / n, ssT = 0, ssR = 0;
        for (int i = 0; i < n; i++) {
            ssT += Math.pow(values.get(i) - meanY, 2);
            ssR += Math.pow(values.get(i) - (slope * i + intercept), 2);
        }
        return new LinearRegressionResult(slope, intercept, ssT > 0 ? 1 - ssR / ssT : 0);
    }

    public record DailySalesReport(Map<LocalDate, BigDecimal> salesByDate, BigDecimal totalSales,
            int totalOrders, BigDecimal avgDailySales, double changeRate) {}
    public record MonthlySalesReport(Map<YearMonth, BigDecimal> salesByMonth, BigDecimal totalYearlySales,
            BigDecimal avgMonthlySales, YearMonth peakMonth, double yoyGrowth) {}
    public record CategorySalesReport(Map<String, CategoryStats> categoryStats,
            List<CategoryStats> topCategories, BigDecimal totalSales) {}
    public record CategoryStats(String category, BigDecimal salesAmount, double percentage) {}
    public record ProductRankingReport(List<ProductSales> topByRevenue, List<ProductSales> topByQuantity) {}
    public record ProductSales(Long productId, String productName, int quantity, BigDecimal revenue) {}
    public record RfmAnalysisReport(List<CustomerRfm> customerRfms, Map<String, Long> segmentCounts) {}
    public record CustomerRfm(Long customerId, long recency, int frequency, BigDecimal monetary,
            int recencyScore, int frequencyScore, int monetaryScore, String segment) {}
    public record CohortAnalysisReport(Map<YearMonth, Map<Integer, Double>> cohortData) {}
    public record SalesForecastReport(Map<LocalDate, BigDecimal> forecast,
            double trend, double baseline, double confidence) {}
    public record Purchase(Long orderId, LocalDateTime purchaseDate, BigDecimal amount) {}
    private record LinearRegressionResult(double slope, double intercept, double rSquared) {}
}
