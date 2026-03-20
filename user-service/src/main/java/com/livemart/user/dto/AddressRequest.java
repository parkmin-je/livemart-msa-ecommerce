package com.livemart.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AddressRequest {

    @NotBlank
    private String alias;

    @NotBlank
    private String recipient;

    @NotBlank
    private String phone;

    @NotBlank
    private String zipCode;

    @NotBlank
    private String address;

    private String detailAddress;

    private boolean isDefault;
}
