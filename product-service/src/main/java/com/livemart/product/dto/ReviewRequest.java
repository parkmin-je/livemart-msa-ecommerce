package com.livemart.product.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewRequest {

    @NotNull(message = "사용자 ID는 필수입니다")
    private Long userId;

    @NotBlank(message = "사용자 이름은 필수입니다")
    private String userName;

    @NotNull(message = "평점은 필수입니다")
    @Min(value = 1, message = "평점은 1 이상이어야 합니다")
    @Max(value = 5, message = "평점은 5 이하여야 합니다")
    private Integer rating;

    @NotBlank(message = "리뷰 제목은 필수입니다")
    @Size(max = 500, message = "제목은 500자 이내여야 합니다")
    private String title;

    @Size(max = 5000, message = "내용은 5000자 이내여야 합니다")
    private String content;

    private String imageUrls;
}
