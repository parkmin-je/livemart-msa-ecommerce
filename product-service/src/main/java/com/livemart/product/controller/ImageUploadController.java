package com.livemart.product.controller;

import com.livemart.product.service.S3ImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Tag(name = "Image API", description = "상품 이미지 업로드 API (AWS S3)")
@RestController
@RequestMapping("/api/products/{productId}/images")
@RequiredArgsConstructor
public class ImageUploadController {

    private final S3ImageService s3ImageService;

    @Operation(summary = "상품 이미지 업로드", description = "AWS S3에 상품 이미지를 업로드합니다")
    @PostMapping
    public ResponseEntity<Map<String, String>> uploadImage(
            @PathVariable Long productId,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "이미지 파일만 업로드 가능합니다"));
        }

        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일 크기는 10MB 이하여야 합니다"));
        }

        String imageUrl = s3ImageService.uploadImage(file, productId);
        return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
    }

    @Operation(summary = "상품 이미지 삭제")
    @DeleteMapping
    public ResponseEntity<Void> deleteImage(
            @PathVariable Long productId,
            @RequestParam String imageUrl) {
        s3ImageService.deleteImage(imageUrl);
        return ResponseEntity.ok().build();
    }
}
