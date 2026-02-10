package com.livemart.product.grpc;

import com.livemart.product.domain.Product;
import com.livemart.product.repository.ProductRepository;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.Optional;

/**
 * gRPC 서버 구현 - 상품 조회 및 재고 관리
 * proto 정의 기반의 고성능 바이너리 통신
 *
 * 실제 운영에서는 proto 파일에서 자동 생성된 스텁을 사용하지만,
 * 여기서는 포트폴리오 목적으로 gRPC 패턴을 수동 구현합니다.
 */
@Slf4j
@GrpcService
@RequiredArgsConstructor
public class ProductGrpcServer {

    private final ProductRepository productRepository;

    /**
     * gRPC 단건 상품 조회
     */
    public void getProduct(Long productId, StreamObserver<ProductGrpcDto> responseObserver) {
        log.info("gRPC 상품 조회 요청: productId={}", productId);

        Optional<Product> product = productRepository.findById(productId);

        if (product.isPresent()) {
            ProductGrpcDto dto = ProductGrpcDto.from(product.get());
            responseObserver.onNext(dto);
            responseObserver.onCompleted();
        } else {
            responseObserver.onError(
                    Status.NOT_FOUND
                            .withDescription("상품을 찾을 수 없습니다: " + productId)
                            .asRuntimeException()
            );
        }
    }

    /**
     * gRPC 재고 확인
     */
    public StockCheckResult checkStock(Long productId, int requiredQuantity) {
        log.info("gRPC 재고 확인: productId={}, required={}", productId, requiredQuantity);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> Status.NOT_FOUND
                        .withDescription("상품을 찾을 수 없습니다")
                        .asRuntimeException());

        boolean available = product.getStockQuantity() >= requiredQuantity;

        return new StockCheckResult(available, product.getStockQuantity());
    }

    /**
     * gRPC 재고 차감
     */
    public StockDeductResult deductStock(Long productId, int quantity) {
        log.info("gRPC 재고 차감: productId={}, quantity={}", productId, quantity);

        Product product = productRepository.findByIdWithLock(productId)
                .orElseThrow(() -> Status.NOT_FOUND
                        .withDescription("상품을 찾을 수 없습니다")
                        .asRuntimeException());

        if (product.getStockQuantity() < quantity) {
            return new StockDeductResult(false, product.getStockQuantity(), "재고 부족");
        }

        int newStock = product.getStockQuantity() - quantity;
        product.updateStock(newStock);

        return new StockDeductResult(true, newStock, "재고 차감 완료");
    }

    public record StockCheckResult(boolean available, int currentStock) {}
    public record StockDeductResult(boolean success, int remainingStock, String message) {}
}
