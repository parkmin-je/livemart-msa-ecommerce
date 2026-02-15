package com.livemart.product.controller;

import com.livemart.product.dto.SellerDashboardResponse;
import com.livemart.product.service.SellerDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Seller Dashboard API", description = "판매자 대시보드 API")
@RestController
@RequestMapping("/api/sellers/{sellerId}/dashboard")
@RequiredArgsConstructor
public class SellerDashboardController {

    private final SellerDashboardService sellerDashboardService;

    @Operation(summary = "판매자 대시보드 조회")
    @GetMapping
    public ResponseEntity<SellerDashboardResponse> getDashboard(@PathVariable Long sellerId) {
        return ResponseEntity.ok(sellerDashboardService.getDashboard(sellerId));
    }
}
