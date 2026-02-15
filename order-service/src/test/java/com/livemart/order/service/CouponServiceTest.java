package com.livemart.order.service;

import com.livemart.order.domain.Coupon;
import com.livemart.order.domain.CouponUsage;
import com.livemart.order.dto.CouponRequest;
import com.livemart.order.dto.CouponResponse;
import com.livemart.order.repository.CouponRepository;
import com.livemart.order.repository.CouponUsageRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CouponService 단위 테스트")
class CouponServiceTest {

    @InjectMocks
    private CouponService couponService;

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private CouponUsageRepository couponUsageRepository;

    @Nested
    @DisplayName("쿠폰 생성")
    class CreateCouponTest {

        @Test
        @DisplayName("퍼센트 할인 쿠폰 생성")
        void createCoupon_percentage() {
            CouponRequest request = CouponRequest.builder()
                    .code("SPRING2025")
                    .name("봄맞이 할인")
                    .discountType(Coupon.DiscountType.PERCENTAGE)
                    .discountValue(new BigDecimal("15"))
                    .totalQuantity(100)
                    .startDate(LocalDateTime.now())
                    .endDate(LocalDateTime.now().plusDays(30))
                    .build();

            given(couponRepository.existsByCode("SPRING2025")).willReturn(false);
            given(couponRepository.save(any(Coupon.class))).willAnswer(inv -> inv.getArgument(0));

            CouponResponse response = couponService.createCoupon(request);

            assertThat(response.getCode()).isEqualTo("SPRING2025");
            assertThat(response.getDiscountType()).isEqualTo(Coupon.DiscountType.PERCENTAGE);
        }

        @Test
        @DisplayName("중복 쿠폰 코드 생성 시 예외")
        void createCoupon_duplicateCode() {
            CouponRequest request = CouponRequest.builder().code("EXISTING").build();
            given(couponRepository.existsByCode("EXISTING")).willReturn(true);

            assertThatThrownBy(() -> couponService.createCoupon(request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("이미 존재하는 쿠폰");
        }
    }

    @Nested
    @DisplayName("쿠폰 적용")
    class ApplyCouponTest {

        @Test
        @DisplayName("퍼센트 할인 쿠폰 적용")
        void applyCoupon_percentage() {
            Coupon coupon = Coupon.builder()
                    .id(1L)
                    .code("SALE10")
                    .discountType(Coupon.DiscountType.PERCENTAGE)
                    .discountValue(new BigDecimal("10"))
                    .totalQuantity(100)
                    .usedQuantity(0)
                    .active(true)
                    .startDate(LocalDateTime.now().minusDays(1))
                    .endDate(LocalDateTime.now().plusDays(30))
                    .build();

            given(couponRepository.findByCode("SALE10")).willReturn(Optional.of(coupon));
            given(couponUsageRepository.existsByCouponIdAndUserId(1L, 10L)).willReturn(false);
            given(couponUsageRepository.save(any(CouponUsage.class))).willAnswer(inv -> inv.getArgument(0));

            BigDecimal discount = couponService.applyCoupon("SALE10", 10L, "ORD-001", new BigDecimal("50000"));

            assertThat(discount).isEqualByComparingTo(new BigDecimal("5000"));
            assertThat(coupon.getUsedQuantity()).isEqualTo(1);
        }

        @Test
        @DisplayName("정액 할인 쿠폰 적용")
        void applyCoupon_fixedAmount() {
            Coupon coupon = Coupon.builder()
                    .id(2L)
                    .code("FIXED3000")
                    .discountType(Coupon.DiscountType.FIXED_AMOUNT)
                    .discountValue(new BigDecimal("3000"))
                    .totalQuantity(50)
                    .usedQuantity(0)
                    .active(true)
                    .startDate(LocalDateTime.now().minusDays(1))
                    .endDate(LocalDateTime.now().plusDays(30))
                    .build();

            given(couponRepository.findByCode("FIXED3000")).willReturn(Optional.of(coupon));
            given(couponUsageRepository.existsByCouponIdAndUserId(2L, 10L)).willReturn(false);
            given(couponUsageRepository.save(any(CouponUsage.class))).willAnswer(inv -> inv.getArgument(0));

            BigDecimal discount = couponService.applyCoupon("FIXED3000", 10L, "ORD-002", new BigDecimal("50000"));

            assertThat(discount).isEqualByComparingTo(new BigDecimal("3000"));
        }

        @Test
        @DisplayName("이미 사용한 쿠폰 적용 시 예외")
        void applyCoupon_alreadyUsed() {
            Coupon coupon = Coupon.builder().id(1L).code("USED").build();

            given(couponRepository.findByCode("USED")).willReturn(Optional.of(coupon));
            given(couponUsageRepository.existsByCouponIdAndUserId(1L, 10L)).willReturn(true);

            assertThatThrownBy(() -> couponService.applyCoupon("USED", 10L, "ORD-003", new BigDecimal("10000")))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("이미 사용한 쿠폰");
        }
    }

    @Nested
    @DisplayName("할인 미리보기")
    class PreviewDiscountTest {

        @Test
        @DisplayName("최대 할인 금액 적용")
        void previewDiscount_withMaxDiscount() {
            Coupon coupon = Coupon.builder()
                    .code("MAX5000")
                    .discountType(Coupon.DiscountType.PERCENTAGE)
                    .discountValue(new BigDecimal("20"))
                    .maximumDiscountAmount(new BigDecimal("5000"))
                    .totalQuantity(100)
                    .usedQuantity(0)
                    .active(true)
                    .startDate(LocalDateTime.now().minusDays(1))
                    .endDate(LocalDateTime.now().plusDays(30))
                    .build();

            given(couponRepository.findByCode("MAX5000")).willReturn(Optional.of(coupon));

            CouponResponse.DiscountPreview preview = couponService.previewDiscount("MAX5000", new BigDecimal("100000"));

            assertThat(preview.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("5000"));
            assertThat(preview.getFinalAmount()).isEqualByComparingTo(new BigDecimal("95000"));
        }
    }
}
