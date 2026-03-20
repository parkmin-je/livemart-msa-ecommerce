package com.livemart.user.service;

import com.livemart.user.domain.Address;
import com.livemart.user.dto.AddressRequest;
import com.livemart.user.dto.AddressResponse;
import com.livemart.user.repository.AddressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AddressService {

    private final AddressRepository addressRepository;

    public List<AddressResponse> getAddresses(Long userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                .stream()
                .map(AddressResponse::from)
                .toList();
    }

    @Transactional
    public AddressResponse addAddress(Long userId, AddressRequest request) {
        if (request.isDefault()) {
            addressRepository.clearDefaultByUserId(userId);
        }

        Address address = Address.builder()
                .userId(userId)
                .alias(request.getAlias())
                .recipient(request.getRecipient())
                .phone(request.getPhone())
                .zipCode(request.getZipCode())
                .address(request.getAddress())
                .detailAddress(request.getDetailAddress())
                .isDefault(request.isDefault())
                .build();

        Address saved = addressRepository.save(address);
        log.info("Address added: userId={}, addressId={}", userId, saved.getId());
        return AddressResponse.from(saved);
    }

    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new IllegalArgumentException("배송지를 찾을 수 없습니다"));
        addressRepository.delete(address);
        log.info("Address deleted: userId={}, addressId={}", userId, addressId);
    }
}
