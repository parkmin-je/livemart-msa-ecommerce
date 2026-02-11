package com.livemart.analytics.controller;

import com.livemart.analytics.ab.AbTestService;
import com.livemart.analytics.ab.AbTestService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * A/B 테스트 API
 */
@RestController
@RequestMapping("/api/v1/ab-test")
@RequiredArgsConstructor
public class AbTestController {

    private final AbTestService abTestService;

    /**
     * A/B 테스트 생성
     */
    @PostMapping("/tests")
    public ResponseEntity<AbTest> createTest(@RequestBody CreateTestRequest request) {
        AbTest test = abTestService.createTest(
            request.testId(),
            request.testName(),
            request.variants(),
            request.trafficAllocation()
        );
        return ResponseEntity.ok(test);
    }

    /**
     * Variant 할당 (사용자 요청 시)
     */
    @GetMapping("/tests/{testId}/assign")
    public ResponseEntity<VariantAssignment> assignVariant(
            @PathVariable String testId,
            @RequestParam Long userId) {

        String variant = abTestService.assignVariant(testId, userId);

        // 노출 이벤트 기록
        abTestService.trackExposure(testId, userId, variant);

        return ResponseEntity.ok(new VariantAssignment(testId, userId, variant));
    }

    /**
     * 전환 이벤트 기록
     */
    @PostMapping("/tests/{testId}/conversion")
    public ResponseEntity<String> trackConversion(
            @PathVariable String testId,
            @RequestBody ConversionRequest request) {

        abTestService.trackConversion(
            testId,
            request.userId(),
            request.variant(),
            request.value()
        );

        return ResponseEntity.ok("Conversion tracked");
    }

    /**
     * 테스트 결과 분석
     */
    @GetMapping("/tests/{testId}/results")
    public ResponseEntity<AbTestResult> getTestResults(@PathVariable String testId) {
        AbTestResult result = abTestService.analyzeTest(testId);
        return ResponseEntity.ok(result);
    }

    /**
     * 테스트 중지
     */
    @PostMapping("/tests/{testId}/stop")
    public ResponseEntity<AbTest> stopTest(@PathVariable String testId) {
        AbTest test = abTestService.stopTest(testId);
        return ResponseEntity.ok(test);
    }

    /**
     * 활성 테스트 목록
     */
    @GetMapping("/tests/active")
    public ResponseEntity<List<AbTest>> getActiveTests() {
        List<AbTest> tests = abTestService.getActiveTests();
        return ResponseEntity.ok(tests);
    }

    // DTOs

    public record CreateTestRequest(
        String testId,
        String testName,
        List<String> variants,
        double trafficAllocation
    ) {}

    public record VariantAssignment(
        String testId,
        Long userId,
        String variant
    ) {}

    public record ConversionRequest(
        Long userId,
        String variant,
        Double value
    ) {}
}
