package com.livemart.common.cdn;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CDN (Content Delivery Network) 서비스
 *
 * 기능:
 * 1. 정적 파일 업로드 (이미지, CSS, JS)
 * 2. CDN URL 생성
 * 3. 캐시 무효화 (Cache Purge)
 * 4. 파일 버전 관리
 * 5. 멀티 CDN 지원 (Cloudflare, AWS CloudFront)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CdnService {

    @Value("${cdn.provider:cloudflare}")
    private String cdnProvider;

    @Value("${cdn.base-url:https://cdn.livemart.com}")
    private String cdnBaseUrl;

    @Value("${cdn.storage-path:/var/cdn/files}")
    private String storagePath;

    // 파일 메타데이터 저장소
    private final Map<String, CdnFile> fileRegistry = new ConcurrentHashMap<>();

    /**
     * 파일 업로드 및 CDN 배포
     */
    public CdnUploadResult uploadFile(MultipartFile file, CdnUploadOptions options) {
        try {
            // 1. 파일 검증
            validateFile(file);

            // 2. 파일 해시 생성 (중복 방지)
            String fileHash = calculateFileHash(file.getBytes());

            // 3. 파일명 생성 (해시 기반)
            String fileName = generateFileName(file.getOriginalFilename(), fileHash);

            // 4. 파일 저장
            String filePath = saveFile(file, fileName, options.directory());

            // 5. CDN URL 생성
            String cdnUrl = generateCdnUrl(filePath, options.version());

            // 6. 메타데이터 저장
            CdnFile cdnFile = new CdnFile(
                fileHash,
                fileName,
                filePath,
                cdnUrl,
                file.getContentType(),
                file.getSize(),
                options.version(),
                LocalDateTime.now(),
                options.cacheControl()
            );

            fileRegistry.put(fileHash, cdnFile);

            log.info("File uploaded to CDN: fileName={}, size={}, url={}",
                     fileName, file.getSize(), cdnUrl);

            return new CdnUploadResult(
                true,
                cdnUrl,
                fileHash,
                file.getSize(),
                "File uploaded successfully"
            );

        } catch (Exception e) {
            log.error("Failed to upload file to CDN", e);
            return new CdnUploadResult(
                false,
                null,
                null,
                0L,
                "Upload failed: " + e.getMessage()
            );
        }
    }

    /**
     * 파일 삭제 및 CDN 캐시 무효화
     */
    public boolean deleteFile(String fileHash) {
        CdnFile file = fileRegistry.get(fileHash);

        if (file == null) {
            log.warn("File not found for deletion: hash={}", fileHash);
            return false;
        }

        try {
            // 1. 파일 시스템에서 삭제
            Path path = Paths.get(storagePath, file.filePath());
            Files.deleteIfExists(path);

            // 2. CDN 캐시 무효화
            purgeCdnCache(file.cdnUrl());

            // 3. 레지스트리에서 제거
            fileRegistry.remove(fileHash);

            log.info("File deleted from CDN: hash={}, url={}", fileHash, file.cdnUrl());

            return true;

        } catch (IOException e) {
            log.error("Failed to delete file", e);
            return false;
        }
    }

    /**
     * CDN 캐시 무효화 (Purge)
     */
    public void purgeCdnCache(String url) {
        switch (cdnProvider.toLowerCase()) {
            case "cloudflare" -> purgeCloudflare(url);
            case "cloudfront" -> purgeCloudFront(url);
            case "akamai" -> purgeAkamai(url);
            default -> log.warn("Unknown CDN provider: {}", cdnProvider);
        }
    }

    /**
     * 전체 캐시 무효화
     */
    public void purgeAllCache() {
        log.info("Purging all CDN cache...");

        fileRegistry.values().forEach(file -> purgeCdnCache(file.cdnUrl()));

        log.info("All CDN cache purged: totalFiles={}", fileRegistry.size());
    }

    /**
     * 파일 버전 업데이트
     */
    public String updateFileVersion(String fileHash, String newVersion) {
        CdnFile file = fileRegistry.get(fileHash);

        if (file == null) {
            throw new IllegalArgumentException("File not found: " + fileHash);
        }

        // 새 CDN URL 생성 (버전 포함)
        String newCdnUrl = generateCdnUrl(file.filePath(), newVersion);

        // 메타데이터 업데이트
        CdnFile updatedFile = new CdnFile(
            file.fileHash(),
            file.fileName(),
            file.filePath(),
            newCdnUrl,
            file.contentType(),
            file.fileSize(),
            newVersion,
            file.uploadedAt(),
            file.cacheControl()
        );

        fileRegistry.put(fileHash, updatedFile);

        log.info("File version updated: hash={}, oldUrl={}, newUrl={}",
                 fileHash, file.cdnUrl(), newCdnUrl);

        return newCdnUrl;
    }

    /**
     * CDN 통계
     */
    public CdnStats getStats() {
        long totalFiles = fileRegistry.size();
        long totalSize = fileRegistry.values().stream()
            .mapToLong(CdnFile::fileSize)
            .sum();

        Map<String, Long> fileTypeStats = new HashMap<>();
        fileRegistry.values().forEach(file -> {
            String type = file.contentType().split("/")[0];
            fileTypeStats.merge(type, 1L, Long::sum);
        });

        return new CdnStats(
            totalFiles,
            totalSize,
            cdnProvider,
            fileTypeStats
        );
    }

    /**
     * 파일 목록 조회
     */
    public List<CdnFile> listFiles(String directory) {
        if (directory == null || directory.isEmpty()) {
            return new ArrayList<>(fileRegistry.values());
        }

        return fileRegistry.values().stream()
            .filter(file -> file.filePath().startsWith(directory))
            .sorted(Comparator.comparing(CdnFile::uploadedAt).reversed())
            .toList();
    }

    // Helper Methods

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // 최대 파일 크기 체크 (100MB)
        long maxSize = 100 * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File too large: " + file.getSize());
        }

        // 허용된 파일 타입 체크
        String contentType = file.getContentType();
        if (contentType == null || !isAllowedContentType(contentType)) {
            throw new IllegalArgumentException("Invalid content type: " + contentType);
        }
    }

    private boolean isAllowedContentType(String contentType) {
        List<String> allowed = Arrays.asList(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "text/css", "text/javascript", "application/javascript",
            "video/mp4", "application/pdf"
        );

        return allowed.stream().anyMatch(contentType::startsWith);
    }

    private String calculateFileHash(byte[] data) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data);

        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }

        return hexString.toString().substring(0, 16);
    }

    private String generateFileName(String originalName, String hash) {
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalName.substring(dotIndex);
        }

        return hash + extension;
    }

    private String saveFile(MultipartFile file, String fileName, String directory) throws IOException {
        Path directoryPath = Paths.get(storagePath, directory);
        Files.createDirectories(directoryPath);

        Path filePath = directoryPath.resolve(fileName);
        file.transferTo(filePath.toFile());

        return directory + "/" + fileName;
    }

    private String generateCdnUrl(String filePath, String version) {
        String url = cdnBaseUrl + "/" + filePath;

        if (version != null && !version.isEmpty()) {
            url += "?v=" + version;
        }

        return url;
    }

    private void purgeCloudflare(String url) {
        // Cloudflare API 호출 (실제 구현)
        log.info("Purging Cloudflare cache: url={}", url);
        // TODO: HTTP 요청으로 Cloudflare Purge API 호출
    }

    private void purgeCloudFront(String url) {
        // AWS CloudFront Invalidation (실제 구현)
        log.info("Purging CloudFront cache: url={}", url);
        // TODO: AWS SDK로 CloudFront Invalidation 요청
    }

    private void purgeAkamai(String url) {
        // Akamai Fast Purge (실제 구현)
        log.info("Purging Akamai cache: url={}", url);
        // TODO: Akamai API 호출
    }

    // Records

    public record CdnUploadOptions(
        String directory,
        String version,
        String cacheControl
    ) {
        public CdnUploadOptions {
            if (directory == null) directory = "uploads";
            if (version == null) version = "";
            if (cacheControl == null) cacheControl = "public, max-age=31536000";
        }
    }

    public record CdnUploadResult(
        boolean success,
        String cdnUrl,
        String fileHash,
        long fileSize,
        String message
    ) {}

    public record CdnFile(
        String fileHash,
        String fileName,
        String filePath,
        String cdnUrl,
        String contentType,
        long fileSize,
        String version,
        LocalDateTime uploadedAt,
        String cacheControl
    ) {}

    public record CdnStats(
        long totalFiles,
        long totalSize,
        String provider,
        Map<String, Long> fileTypeStats
    ) {}
}
