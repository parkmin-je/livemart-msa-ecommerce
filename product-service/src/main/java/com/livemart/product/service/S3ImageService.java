package com.livemart.product.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3ImageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket:livemart-product-images}")
    private String bucketName;

    @Value("${aws.s3.cdn-url:}")
    private String cdnUrl;

    public String uploadImage(MultipartFile file, Long productId) throws IOException {
        String extension = getExtension(file.getOriginalFilename());
        String key = String.format("products/%d/%s%s", productId, UUID.randomUUID(), extension);

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        log.info("Image uploaded: bucket={}, key={}", bucketName, key);

        if (cdnUrl != null && !cdnUrl.isEmpty()) {
            return cdnUrl + "/" + key;
        }
        return getPublicUrl(key);
    }

    public void deleteImage(String imageUrl) {
        String key = extractKeyFromUrl(imageUrl);
        if (key == null) return;

        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
            log.info("Image deleted: key={}", key);
        } catch (S3Exception e) {
            log.warn("Failed to delete image: key={}, error={}", key, e.getMessage());
        }
    }

    public String getPresignedUrl(String key, Duration expiration) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build())
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    private String getPublicUrl(String key) {
        return String.format("https://%s.s3.ap-northeast-2.amazonaws.com/%s", bucketName, key);
    }

    private String extractKeyFromUrl(String url) {
        if (url == null) return null;
        int idx = url.indexOf("products/");
        return idx >= 0 ? url.substring(idx) : null;
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : ".jpg";
    }
}
