package com.livemart.order.domain.model;

import jakarta.persistence.Embeddable;
import java.util.Objects;

/**
 * 배송 주소 Value Object
 *
 * @Embeddable: JPA에서 Order 테이블에 인라인으로 저장
 * 불변 객체 — setter 없음, 생성 후 변경 불가
 */
@Embeddable
public final class Address {

    private final String street;
    private final String city;
    private final String district;
    private final String postalCode;
    private final String detail;

    // JPA requires no-arg constructor
    protected Address() {
        this.street = null;
        this.city = null;
        this.district = null;
        this.postalCode = null;
        this.detail = null;
    }

    private Address(String street, String city, String district, String postalCode, String detail) {
        this.street = Objects.requireNonNull(street, "도로명주소는 필수입니다");
        this.city = Objects.requireNonNull(city, "시/도는 필수입니다");
        this.district = district;
        this.postalCode = Objects.requireNonNull(postalCode, "우편번호는 필수입니다");
        this.detail = detail;
    }

    public static Address of(String street, String city, String district,
                             String postalCode, String detail) {
        return new Address(street, city, district, postalCode, detail);
    }

    /**
     * 단순 주소 문자열에서 생성 (레거시 호환)
     * 예: "서울시 강남구 테헤란로 123 4층"
     */
    public static Address fromString(String fullAddress) {
        Objects.requireNonNull(fullAddress, "주소는 null일 수 없습니다");
        if (fullAddress.isBlank()) {
            throw new IllegalArgumentException("주소는 빈 문자열일 수 없습니다");
        }
        // 단순 파싱 (실제 서비스에서는 카카오/네이버 주소 API 활용)
        return new Address(fullAddress, "서울", null, "00000", null);
    }

    public String getStreet() { return street; }
    public String getCity() { return city; }
    public String getDistrict() { return district; }
    public String getPostalCode() { return postalCode; }
    public String getDetail() { return detail; }

    /**
     * 전체 주소 문자열 반환
     */
    public String toFullAddress() {
        StringBuilder sb = new StringBuilder();
        if (postalCode != null) sb.append("[").append(postalCode).append("] ");
        if (city != null) sb.append(city).append(" ");
        if (district != null) sb.append(district).append(" ");
        if (street != null) sb.append(street);
        if (detail != null && !detail.isBlank()) sb.append(" ").append(detail);
        return sb.toString().trim();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Address other)) return false;
        return Objects.equals(street, other.street)
            && Objects.equals(city, other.city)
            && Objects.equals(district, other.district)
            && Objects.equals(postalCode, other.postalCode)
            && Objects.equals(detail, other.detail);
    }

    @Override
    public int hashCode() {
        return Objects.hash(street, city, district, postalCode, detail);
    }

    @Override
    public String toString() {
        return toFullAddress();
    }
}
