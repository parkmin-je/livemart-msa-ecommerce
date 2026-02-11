package com.livemart.analytics.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 매출 분석 서비스
 *
 * 기능:
 * 1. 일/주/월별 매출 분석
 * 2. 카테고리별 매출 분석
 * 3. 상품별 판매 순위
 * 4. 고객 구매 패턴 분석
 * 5. RFM 분석 (Recency, Frequency, Monetary)
 * 6. 코호트 분석
 * 7. 예측 분석 (선형 회귀)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SalesAnalyticsService {

    // 임시 데이터 저장소 (실제로는 DB에서 조회)
    private final Map<LocalDate, BigDecimal> dailySales = new HashMap<>();
    private final Map<String, BigDecimal> categorySales = new HashMap<>();
    private final Map<Long, List<Purchase>> customerPurchases = new HashMap<>();

    /**
     * 일별 매출 집계
     */
    public DailySalesReport getDailySalesReport(LocalDate startDate, LocalDate endDate) {
        Map<LocalDate, BigDecimal> salesByDate = new TreeMap<>();
        BigDecimal totalSales = BigDecimal.ZERO;
        int totalOrders = 0;

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            BigDecimal dailyAmount = dailySales.getOrDefault(current, BigDecimal.ZERO);
            salesByDate.put(current, dailyAmount);
            totalSales = totalSales.add(dailyAmount);
            totalOrders += (dailyAmount.compareTo(BigDecimal.ZERO) > 0) ? 1 : 0;
            current = current.plusDays(1);
        }

        BigDecimal avgDailySales = totalOrders > 0
            ? totalSales.divide(BigDecimal.valueOf(totalOrders), 2, BigDecimal.ROUND_HALF_UP)
            : BigDecimal.ZERO;

        // 전일 대비 증감률
        BigDecimal todaySales = salesByDate.getOrDefault(endDate, BigDecimal.ZERO);
        BigDecimal yesterdaySales = salesByDate.getOrDefault(endDate.minusDays(1), BigDecimal.ZERO);
        double changeRate = yesterdaySales.compareTo(BigDecimal.ZERO) > 0
            ? ((todaySales.subtract(yesterdaySales)).divide(yesterdaySales, 4, BigDecimal.ROUND_HALF_UP))
                .multiply(BigDecimal.valueOf(100)).doubleValue()
            : 0.0;

        log.info("Daily sales report generated: totalSales={}, totalOrders={}", totalSales, totalOrders);

        return new DailySalesReport(
            salesByDate,
            totalSales,
            totalOrders,
            avgDailySales,
            changeRate
        );
    }

    /**
     * 월별 매출 집계
     */
    public MonthlySalesReport getMonthlySalesReport(int year) {
        Map<YearMonth, BigDecimal> salesByMonth = new TreeMap<>();
        BigDecimal totalYearlySales = BigDecimal.ZERO;

        for (int month = 1; month <= 12; month++) {
            YearMonth yearMonth = YearMonth.of(year, month);
            BigDecimal monthlySales = calculateMonthlySales(yearMonth);
            salesByMonth.put(yearMonth, monthlySales);
            totalYearlySales = totalYearlySales.add(monthlySales);
        }

        // 최고 매출 월
        YearMonth peakMonth = salesByMonth.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(null);

        // 평균 월 매출
        BigDecimal avgMonthlySales = totalYearlySales.divide(BigDecimal.valueOf(12), 2, BigDecimal.ROUND_HALF_UP);

        // 전년 대비 성장률 (시뮬레이션)
        double yoyGrowth = 15.5; // TODO: 실제 전년도 데이터와 비교

        return new MonthlySalesReport(
            salesByMonth,
            totalYearlySales,
            avgMonthlySales,
            peakMonth,
            yoyGrowth
        );
    }

    /**
     * 카테고리별 매출 분석
     */
    public CategorySalesReport getCategorySalesReport() {
        BigDecimal totalSales = categorySales.values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 카테고리별 비율 계산
        Map<String, CategoryStats> categoryStats = categorySales.entrySet().stream()
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                entry -> {
                    BigDecimal amount = entry.getValue();
                    double percentage = totalSales.compareTo(BigDecimal.ZERO) > 0
                        ? amount.divide(totalSales, 4, BigDecimal.ROUND_HALF_UP)
                            .multiply(BigDecimal.valueOf(100)).doubleValue()
                        : 0.0;
                    return new CategoryStats(entry.getKey(), amount, percentage);
                }
            ));

        // 상위 5개 카테고리
        List<CategoryStats> topCategories = categoryStats.values().stream()
            .sorted(Comparator.comparing(CategoryStats::salesAmount).reversed())
            .limit(5)
            .toList();

        return new CategorySalesReport(
            categoryStats,
            topCategories,
            totalSales
        );
    }

    /**
     * 상품별 판매 순위
     */
    public ProductRankingReport getProductRankingReport(int limit) {
        // 시뮬레이션 데이터
        List<ProductSales> productSales = generateSimulatedProductSales();

        // 매출액 기준 정렬
        List<ProductSales> topByRevenue = productSales.stream()
            .sorted(Comparator.comparing(ProductSales::revenue).reversed())
            .limit(limit)
            .toList();

        // 판매량 기준 정렬
        List<ProductSales> topByQuantity = productSales.stream()
            .sorted(Comparator.comparing(ProductSales::quantity).reversed())
            .limit(limit)
            .toList();

        return new ProductRankingReport(
            topByRevenue,
            topByQuantity
        );
    }

    /**
     * RFM 분석 (고객 세분화)
     * - Recency: 최근 구매일
     * - Frequency: 구매 빈도
     * - Monetary: 구매 금액
     */
    public RfmAnalysisReport getRfmAnalysis() {
        List<CustomerRfm> customerRfms = new ArrayList<>();

        customerPurchases.forEach((customerId, purchases) -> {
            // Recency: 마지막 구매로부터 경과 일수
            LocalDateTime lastPurchase = purchases.stream()
                .map(Purchase::purchaseDate)
                .max(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());
            long recency = java.time.Duration.between(lastPurchase, LocalDateTime.now()).toDays();

            // Frequency: 총 구매 횟수
            int frequency = purchases.size();

            // Monetary: 총 구매 금액
            BigDecimal monetary = purchases.stream()
                .map(Purchase::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // RFM 점수 계산 (1-5점)
            int recencyScore = calculateRecencyScore(recency);
            int frequencyScore = calculateFrequencyScore(frequency);
            int monetaryScore = calculateMonetaryScore(monetary);

            // 고객 세그먼트 분류
            String segment = classifyCustomerSegment(recencyScore, frequencyScore, monetaryScore);

            customerRfms.add(new CustomerRfm(
                customerId,
                recency,
                frequency,
                monetary,
                recencyScore,
                frequencyScore,
                monetaryScore,
                segment
            ));
        });

        // 세그먼트별 통계
        Map<String, Long> segmentCounts = customerRfms.stream()
            .collect(Collectors.groupingBy(CustomerRfm::segment, Collectors.counting()));

        log.info("RFM analysis completed: totalCustomers={}, segments={}",
                 customerRfms.size(), segmentCounts);

        return new RfmAnalysisReport(
            customerRfms,
            segmentCounts
        );
    }

    /**
     * 코호트 분석 (월별 리텐션)
     */
    public CohortAnalysisReport getCohortAnalysis(int months) {
        Map<YearMonth, Map<Integer, Double>> cohortData = new TreeMap<>();

        YearMonth currentMonth = YearMonth.now();
        for (int i = 0; i < months; i++) {
            YearMonth cohortMonth = currentMonth.minusMonths(i);
            Map<Integer, Double> retentionRates = calculateRetentionRates(cohortMonth, months - i);
            cohortData.put(cohortMonth, retentionRates);
        }

        return new CohortAnalysisReport(cohortData);
    }

    /**
     * 매출 예측 (단순 선형 회귀)
     */
    public SalesForecastReport getSalesForecast(int futureDays) {
        // 과거 30일 데이터로 학습
        List<LocalDate> dates = new ArrayList<>();
        List<Double> sales = new ArrayList<>();

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            dates.add(current);
            sales.add(dailySales.getOrDefault(current, BigDecimal.ZERO).doubleValue());
            current = current.plusDays(1);
        }

        // 선형 회귀 계산
        LinearRegressionResult regression = calculateLinearRegression(sales);

        // 예측
        Map<LocalDate, BigDecimal> forecast = new TreeMap<>();
        for (int i = 1; i <= futureDays; i++) {
            LocalDate forecastDate = endDate.plusDays(i);
            double predictedValue = regression.slope() * (dates.size() + i) + regression.intercept();
            forecast.put(forecastDate, BigDecimal.valueOf(Math.max(0, predictedValue)));
        }

        return new SalesForecastReport(
            forecast,
            regression.slope(),
            regression.intercept(),
            regression.rSquared()
        );
    }

    // Helper Methods

    private BigDecimal calculateMonthlySales(YearMonth yearMonth) {
        return dailySales.entrySet().stream()
            .filter(entry -> YearMonth.from(entry.getKey()).equals(yearMonth))
            .map(Map.Entry::getValue)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<ProductSales> generateSimulatedProductSales() {
        List<ProductSales> products = new ArrayList<>();
        Random random = new Random();

        for (long i = 1; i <= 50; i++) {
            products.add(new ProductSales(
                i,
                "Product " + i,
                random.nextInt(1000) + 100,
                BigDecimal.valueOf(random.nextDouble() * 50000 + 10000)
            ));
        }

        return products;
    }

    private int calculateRecencyScore(long days) {
        if (days <= 30) return 5;
        if (days <= 60) return 4;
        if (days <= 90) return 3;
        if (days <= 180) return 2;
        return 1;
    }

    private int calculateFrequencyScore(int frequency) {
        if (frequency >= 20) return 5;
        if (frequency >= 10) return 4;
        if (frequency >= 5) return 3;
        if (frequency >= 2) return 2;
        return 1;
    }

    private int calculateMonetaryScore(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.valueOf(10000)) >= 0) return 5;
        if (amount.compareTo(BigDecimal.valueOf(5000)) >= 0) return 4;
        if (amount.compareTo(BigDecimal.valueOf(2000)) >= 0) return 3;
        if (amount.compareTo(BigDecimal.valueOf(500)) >= 0) return 2;
        return 1;
    }

    private String classifyCustomerSegment(int r, int f, int m) {
        int totalScore = r + f + m;

        if (r >= 4 && f >= 4 && m >= 4) return "Champions";        // 최고 고객
        if (r >= 3 && f >= 3 && m >= 3) return "Loyal Customers";  // 충성 고객
        if (r >= 4 && f <= 2) return "Promising";                   // 잠재 고객
        if (r <= 2 && f >= 3) return "At Risk";                     // 이탈 위험
        if (r <= 2 && f <= 2) return "Lost";                        // 이탈 고객
        return "Others";
    }

    private Map<Integer, Double> calculateRetentionRates(YearMonth cohortMonth, int periods) {
        Map<Integer, Double> rates = new HashMap<>();

        for (int period = 0; period < periods; period++) {
            // 시뮬레이션: 리텐션율이 점차 감소
            double retentionRate = 100.0 * Math.pow(0.85, period);
            rates.put(period, retentionRate);
        }

        return rates;
    }

    private LinearRegressionResult calculateLinearRegression(List<Double> values) {
        int n = values.size();
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (int i = 0; i < n; i++) {
            double x = i;
            double y = values.get(i);
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        double slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        double intercept = (sumY - slope * sumX) / n;

        // R-squared 계산
        double meanY = sumY / n;
        double ssTotal = 0, ssResidual = 0;
        for (int i = 0; i < n; i++) {
            double predicted = slope * i + intercept;
            ssTotal += Math.pow(values.get(i) - meanY, 2);
            ssResidual += Math.pow(values.get(i) - predicted, 2);
        }
        double rSquared = 1 - (ssResidual / ssTotal);

        return new LinearRegressionResult(slope, intercept, rSquared);
    }

    // DTOs & Records

    public record DailySalesReport(
        Map<LocalDate, BigDecimal> salesByDate,
        BigDecimal totalSales,
        int totalOrders,
        BigDecimal avgDailySales,
        double changeRate
    ) {}

    public record MonthlySalesReport(
        Map<YearMonth, BigDecimal> salesByMonth,
        BigDecimal totalYearlySales,
        BigDecimal avgMonthlySales,
        YearMonth peakMonth,
        double yoyGrowth
    ) {}

    public record CategorySalesReport(
        Map<String, CategoryStats> categoryStats,
        List<CategoryStats> topCategories,
        BigDecimal totalSales
    ) {}

    public record CategoryStats(
        String category,
        BigDecimal salesAmount,
        double percentage
    ) {}

    public record ProductRankingReport(
        List<ProductSales> topByRevenue,
        List<ProductSales> topByQuantity
    ) {}

    public record ProductSales(
        Long productId,
        String productName,
        int quantity,
        BigDecimal revenue
    ) {}

    public record RfmAnalysisReport(
        List<CustomerRfm> customerRfms,
        Map<String, Long> segmentCounts
    ) {}

    public record CustomerRfm(
        Long customerId,
        long recency,
        int frequency,
        BigDecimal monetary,
        int recencyScore,
        int frequencyScore,
        int monetaryScore,
        String segment
    ) {}

    public record CohortAnalysisReport(
        Map<YearMonth, Map<Integer, Double>> cohortData
    ) {}

    public record SalesForecastReport(
        Map<LocalDate, BigDecimal> forecast,
        double trend,
        double baseline,
        double confidence
    ) {}

    public record Purchase(
        Long orderId,
        LocalDateTime purchaseDate,
        BigDecimal amount
    ) {}

    private record LinearRegressionResult(
        double slope,
        double intercept,
        double rSquared
    ) {}
}
