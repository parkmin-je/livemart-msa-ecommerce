package com.livemart.order.grpc;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * gRPC 연결 상태 확인 컨트롤러
 */
@Tag(name = "gRPC Health", description = "gRPC 연결 상태 확인 API")
@RestController
@RequestMapping("/api/grpc")
@RequiredArgsConstructor
public class GrpcHealthController {

    private final ProductGrpcClient productGrpcClient;

    @Operation(summary = "gRPC 채널 상태 확인")
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> checkGrpcHealth() {
        boolean active = productGrpcClient.isChannelActive();
        return ResponseEntity.ok(Map.of(
                "grpcChannel", active ? "ACTIVE" : "INACTIVE",
                "targetService", "product-service",
                "protocol", "gRPC",
                "port", 9090
        ));
    }

    @Operation(summary = "gRPC 재고 확인 테스트")
    @GetMapping("/stock-check/{productId}")
    public ResponseEntity<ProductGrpcClient.StockCheckResponse> testStockCheck(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "1") int quantity) {
        return ResponseEntity.ok(productGrpcClient.checkStock(productId, quantity));
    }
}
