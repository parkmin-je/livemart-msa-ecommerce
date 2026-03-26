package com.livemart.user.dto;

import com.livemart.user.domain.Address;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class AddressResponse {

    private Long id;
    private String alias;
    private String recipient;
    private String phone;
    private String zipCode;
    private String address;
    private String detailAddress;
    private boolean isDefault;
    private LocalDateTime createdAt;

    public static AddressResponse from(Address a) {
        return AddressResponse.builder()
                .id(a.getId())
                .alias(a.getAlias())
                .recipient(a.getRecipient())
                .phone(a.getPhone())
                .zipCode(a.getZipCode())
                .address(a.getAddress())
                .detailAddress(a.getDetailAddress())
                .isDefault(Boolean.TRUE.equals(a.getIsDefault()))
                .createdAt(a.getCreatedAt())
                .build();
    }
}
