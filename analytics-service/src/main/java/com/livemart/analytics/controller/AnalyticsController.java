package com.livemart.analytics.controller;

import com.livemart.analytics.service.SalesAnalyticsService;
import com.livemart.analytics.service.SalesAnalyticsService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * 데이터 분석 & BI API
 */
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final SalesAnalyticsService salesAnalyticsService;

    /**
     * 일별 매출 리포트
     */
    @GetMapping("/sales/daily")
    public ResponseEntity<DailySalesReport> getDailySales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        DailySalesReport report = salesAnalyticsService.getDailySalesReport(startDate, endDate);
        return ResponseEntity.ok(report);
    }

    /**
     * 월별 매출 리포트
     */
    @GetMapping("/sales/monthly")
    public ResponseEntity<MonthlySalesReport> getMonthlySales(@RequestParam int year) {
        MonthlySalesReport report = salesAnalyticsService.getMonthlySalesReport(year);
        return ResponseEntity.ok(report);
    }

    /**
     * 카테고리별 매출 분석
     */
    @GetMapping("/sales/by-category")
    public ResponseEntity<CategorySalesReport> getCategorySales() {
        CategorySalesReport report = salesAnalyticsService.getCategorySalesReport();
        return ResponseEntity.ok(report);
    }

    /**
     * 상품 판매 순위
     */
    @GetMapping("/products/ranking")
    public ResponseEntity<ProductRankingReport> getProductRanking(
            @RequestParam(defaultValue = "10") int limit) {

        ProductRankingReport report = salesAnalyticsService.getProductRankingReport(limit);
        return ResponseEntity.ok(report);
    }

    /**
     * RFM 분석 (고객 세분화)
     */
    @GetMapping("/customers/rfm")
    public ResponseEntity<RfmAnalysisReport> getRfmAnalysis() {
        RfmAnalysisReport report = salesAnalyticsService.getRfmAnalysis();
        return ResponseEntity.ok(report);
    }

    /**
     * 코호트 분석 (리텐션)
     */
    @GetMapping("/customers/cohort")
    public ResponseEntity<CohortAnalysisReport> getCohortAnalysis(
            @RequestParam(defaultValue = "12") int months) {

        CohortAnalysisReport report = salesAnalyticsService.getCohortAnalysis(months);
        return ResponseEntity.ok(report);
    }

    /**
     * 매출 예측
     */
    @GetMapping("/sales/forecast")
    public ResponseEntity<SalesForecastReport> getSalesForecast(
            @RequestParam(defaultValue = "30") int days) {

        SalesForecastReport report = salesAnalyticsService.getSalesForecast(days);
        return ResponseEntity.ok(report);
    }

    /**
     * 대시보드 요약 정보
     */
    @GetMapping("/dashboard/summary")
    public ResponseEntity<DashboardSummary> getDashboardSummary() {
        LocalDate today = LocalDate.now();
        LocalDate lastWeek = today.minusDays(7);
        LocalDate lastMonth = today.minusMonths(1);

        DailySalesReport todayReport = salesAnalyticsService.getDailySalesReport(today, today);
        DailySalesReport weekReport = salesAnalyticsService.getDailySalesReport(lastWeek, today);
        MonthlySalesReport yearReport = salesAnalyticsService.getMonthlySalesReport(today.getYear());
        CategorySalesReport categoryReport = salesAnalyticsService.getCategorySalesReport();

        DashboardSummary summary = new DashboardSummary(
            todayReport.totalSales(),
            todayReport.changeRate(),
            weekReport.totalSales(),
            yearReport.totalYearlySales(),
            weekReport.totalOrders(),
            categoryReport.topCategories().size(),
            yearReport.yoyGrowth()
        );

        return ResponseEntity.ok(summary);
    }

    // DTOs

    public record DashboardSummary(
        java.math.BigDecimal todaySales,
        double todayChangeRate,
        java.math.BigDecimal weekSales,
        java.math.BigDecimal yearSales,
        int weekOrders,
        int activeCategories,
        double yoyGrowth
    ) {}
}
