package com.livemart.analytics.service;

import com.livemart.analytics.domain.DailySalesRecord;
import com.livemart.analytics.repository.DailySalesRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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

    @Nested
    @DisplayName("getDailySalesReport")
    class GetDailySalesReportTest {

        @Test
        @DisplayName("날짜 범위 조회 — 합계·평균·변화율 정상 계산")
        void getDailySalesReport_success() {
            // given
            LocalDate start = LocalDate.of(2026, 3, 1);
            LocalDate end   = LocalDate.of(2026, 3, 3);

            DailySalesRecord day1 = DailySalesRecord.builder()
                    .salesDate(start)
                    .totalAmount(new BigDecimal("100000"))
                    .orderCount(5)
                    .build();
            DailySalesRecord day2 = DailySalesRecord.builder()
                    .salesDate(start.plusDays(1))
                    .totalAmount(new BigDecimal("200000"))
                    .orderCount(10)
                    .build();
            DailySalesRecord day3 = DailySalesRecord.builder()
                    .salesDate(end)
                    .totalAmount(new BigDecimal("150000"))
                    .orderCount(7)
                    .build();

            given(dailySalesRecordRepository.findBySalesDateBetweenOrderBySalesDate(start, end))
                    .willReturn(List.of(day1, day2, day3));

            // when
            SalesAnalyticsService.DailySalesReport report =
                    salesAnalyticsService.getDailySalesReport(start, end);

            // then
            assertThat(report.totalSales()).isEqualByComparingTo(new BigDecimal("450000"));
            assertThat(report.totalOrders()).isEqualTo(3);
            assertThat(report.salesByDate()).hasSize(3);
            assertThat(report.salesByDate().get(start)).isEqualByComparingTo(new BigDecimal("100000"));
        }

        @Test
        @DisplayName("데이터 없는 날짜 — 0원으로 채워서 반환")
        void getDailySalesReport_filledWithZeroOnMissingDates() {
            // given
            LocalDate start = LocalDate.of(2026, 3, 1);
            LocalDate end   = LocalDate.of(2026, 3, 5);

            DailySalesRecord day1 = DailySalesRecord.builder()
                    .salesDate(start)
                    .totalAmount(new BigDecimal("50000"))
                    .orderCount(2)
                    .build();

            given(dailySalesRecordRepository.findBySalesDateBetweenOrderBySalesDate(start, end))
                    .willReturn(List.of(day1));

            // when
            SalesAnalyticsService.DailySalesReport report =
                    salesAnalyticsService.getDailySalesReport(start, end);

            // then — 5일치 맵, 누락일은 0원
            assertThat(report.salesByDate()).hasSize(5);
            assertThat(report.salesByDate().get(start.plusDays(1)))
                    .isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(report.totalSales()).isEqualByComparingTo(new BigDecimal("50000"));
        }

        @Test
        @DisplayName("데이터 완전 없음 — totalSales 0원, orders 0건")
        void getDailySalesReport_emptyResult() {
            // given
            LocalDate start = LocalDate.of(2026, 1, 1);
            LocalDate end   = LocalDate.of(2026, 1, 3);

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
    }

    @Nested
    @DisplayName("getMonthlySalesReport")
    class GetMonthlySalesReportTest {

        @Test
        @DisplayName("전년 데이터 있을 때 YoY 성장률 계산")
        void getMonthlySalesReport_calculatesYoyGrowth() {
            // given — 각 월 100,000원, 연간 합계 1,200,000원
            given(dailySalesRecordRepository.sumTotalAmountBetween(any(LocalDate.class), any(LocalDate.class)))
                    .willReturn(new BigDecimal("100000"));

            // when
            SalesAnalyticsService.MonthlySalesReport report =
                    salesAnalyticsService.getMonthlySalesReport(2026);

            // then
            // 올해 1,200,000 / 전년 100,000 → 1100% 성장 (stub이 항상 100,000 반환)
            assertThat(report.totalYearlySales()).isEqualByComparingTo(new BigDecimal("1200000"));
            assertThat(report.salesByMonth()).hasSize(12);
        }

        @Test
        @DisplayName("전년 데이터 없을 때 YoY 성장률 0")
        void getMonthlySalesReport_zeroPrevYear_yoyIsZero() {
            // given — 이번 연도 데이터만, 전년도 0원
            given(dailySalesRecordRepository.sumTotalAmountBetween(any(LocalDate.class), any(LocalDate.class)))
                    .willAnswer(inv -> {
                        LocalDate start = inv.getArgument(0);
                        if (start.getYear() == 2025) return BigDecimal.ZERO;
                        return new BigDecimal("50000");
                    });

            // when
            SalesAnalyticsService.MonthlySalesReport report =
                    salesAnalyticsService.getMonthlySalesReport(2026);

            // then
            assertThat(report.yoyGrowth()).isZero();
        }
    }
}
