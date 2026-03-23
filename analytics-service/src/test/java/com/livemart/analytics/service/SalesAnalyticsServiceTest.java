package com.livemart.analytics.service;

import com.livemart.analytics.domain.DailySalesRecord;
import com.livemart.analytics.repository.DailySalesRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("SalesAnalyticsService 단위 테스트")
class SalesAnalyticsServiceTest {

    @Mock
    private DailySalesRecordRepository dailySalesRecordRepository;

    @InjectMocks
    private SalesAnalyticsService salesAnalyticsService;

    // ── getDailySalesReport ───────────────────────────────────────────────────

    @Test
    @DisplayName("데이터 2건 조회 — totalSales 합계, totalOrders = 2")
    void getDailySalesReport_withData_returnsSummary() {
        // given
        LocalDate start = LocalDate.of(2024, 6, 1);
        LocalDate end   = LocalDate.of(2024, 6, 2);

        DailySalesRecord day1 = DailySalesRecord.builder()
                .salesDate(start)
                .totalAmount(new BigDecimal("300000"))
                .orderCount(3)
                .build();
        DailySalesRecord day2 = DailySalesRecord.builder()
                .salesDate(end)
                .totalAmount(new BigDecimal("200000"))
                .orderCount(2)
                .build();

        given(dailySalesRecordRepository.findBySalesDateBetweenOrderBySalesDate(start, end))
                .willReturn(List.of(day1, day2));

        // when
        SalesAnalyticsService.DailySalesReport report =
                salesAnalyticsService.getDailySalesReport(start, end);

        // then
        assertThat(report.totalSales()).isEqualByComparingTo(new BigDecimal("500000"));
        assertThat(report.totalOrders()).isEqualTo(2);
        assertThat(report.salesByDate()).hasSize(2);
    }

    @Test
    @DisplayName("데이터 없음 — totalSales = 0, totalOrders = 0")
    void getDailySalesReport_noData_returnsZeros() {
        // given
        LocalDate start = LocalDate.of(2024, 1, 1);
        LocalDate end   = LocalDate.of(2024, 1, 3);

        given(dailySalesRecordRepository.findBySalesDateBetweenOrderBySalesDate(start, end))
                .willReturn(List.of());

        // when
        SalesAnalyticsService.DailySalesReport report =
                salesAnalyticsService.getDailySalesReport(start, end);

        // then
        assertThat(report.totalSales()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(report.totalOrders()).isZero();
        assertThat(report.avgDailySales()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("오늘 매출이 어제보다 높으면 changeRate > 0")
    void getDailySalesReport_todaySalesHigherThanYesterday_positiveChangeRate() {
        // given — endDate=today, endDate-1=yesterday
        LocalDate yesterday = LocalDate.of(2024, 6, 10);
        LocalDate today     = LocalDate.of(2024, 6, 11);

        DailySalesRecord dayYesterday = DailySalesRecord.builder()
                .salesDate(yesterday)
                .totalAmount(new BigDecimal("100000"))
                .orderCount(5)
                .build();
        DailySalesRecord dayToday = DailySalesRecord.builder()
                .salesDate(today)
                .totalAmount(new BigDecimal("150000"))
                .orderCount(7)
                .build();

        given(dailySalesRecordRepository.findBySalesDateBetweenOrderBySalesDate(yesterday, today))
                .willReturn(List.of(dayYesterday, dayToday));

        // when
        SalesAnalyticsService.DailySalesReport report =
                salesAnalyticsService.getDailySalesReport(yesterday, today);

        // then: todaySales(150,000) > yesterdaySales(100,000) → changeRate = 50.0
        assertThat(report.changeRate()).isGreaterThan(0.0);
    }

    // ── getMonthlySalesReport ─────────────────────────────────────────────────

    @Test
    @DisplayName("2024년 월별 보고서 — 12개월 반환, 최고 매출월 정상 식별")
    void getMonthlySalesReport_year2024_returnsTwelveMonths() {
        // given — 8월에만 높은 매출, 나머지는 50,000원
        given(dailySalesRecordRepository.sumTotalAmountBetween(any(LocalDate.class), any(LocalDate.class)))
                .willAnswer(inv -> {
                    LocalDate start = inv.getArgument(0);
                    // 전년(2023) 집계 요청
                    if (start.getYear() == 2023) return new BigDecimal("50000");
                    // 이번 연도(2024) 8월
                    if (start.getMonthValue() == 8) return new BigDecimal("999999");
                    return new BigDecimal("50000");
                });

        // when
        SalesAnalyticsService.MonthlySalesReport report =
                salesAnalyticsService.getMonthlySalesReport(2024);

        // then
        assertThat(report.salesByMonth()).hasSize(12);
        assertThat(report.peakMonth()).isEqualTo(YearMonth.of(2024, 8));
    }

    @Test
    @DisplayName("현재 연도 1,200만원 / 전년도 1,000만원 — yoyGrowth = 20.0")
    void getMonthlySalesReport_withPrevYearData_calculatesYoyGrowth() {
        // given
        // 이번 연도(2024) 12개월 각 1,000,000원 → 합계 12,000,000
        // 전년(2023) sumTotalAmountBetween 한 번 → 10,000,000
        given(dailySalesRecordRepository.sumTotalAmountBetween(any(LocalDate.class), any(LocalDate.class)))
                .willAnswer(inv -> {
                    LocalDate start = inv.getArgument(0);
                    // 전년(2023) 전체 집계: start = 2023-01-01
                    if (start.getYear() == 2023) return new BigDecimal("10000000");
                    // 이번 연도 각 달: 1,000,000 × 12 = 12,000,000
                    return new BigDecimal("1000000");
                });

        // when
        SalesAnalyticsService.MonthlySalesReport report =
                salesAnalyticsService.getMonthlySalesReport(2024);

        // then: yoyGrowth = (12,000,000 - 10,000,000) / 10,000,000 * 100 = 20.0
        assertThat(report.totalYearlySales()).isEqualByComparingTo(new BigDecimal("12000000"));
        assertThat(report.yoyGrowth()).isEqualTo(20.0);
    }
}
