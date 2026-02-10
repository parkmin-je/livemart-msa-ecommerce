package com.livemart.product.grpc;

import com.livemart.product.domain.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * gRPC 전송용 DTO (proto 메시지 대체)
 */
@Getter
@Builder
@AllArgsConstructor
public class ProductGrpcDto {
    private Long id;
    private String name;
    private String description;
    private double price;
    private int stockQuantity;
    private String categoryName;
    private String status;
    private String imageUrl;
    private Long sellerId;

    public static ProductGrpcDto from(Product product) {
        return ProductGrpcDto.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice().doubleValue())
                .stockQuantity(product.getStockQuantity())
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .status(product.getStatus().name())
                .imageUrl(product.getImageUrl())
                .sellerId(product.getSellerId())
                .build();
    }
}
