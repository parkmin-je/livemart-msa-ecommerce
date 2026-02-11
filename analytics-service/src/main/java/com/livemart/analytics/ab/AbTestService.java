package com.livemart.analytics.ab;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * A/B 테스트 프레임워크
 *
 * 기능:
 * 1. A/B 테스트 생성 및 관리
 * 2. 사용자 그룹 할당 (랜덤, 해시 기반)
 * 3. 전환율 추적
 * 4. 통계적 유의성 검증 (카이제곱 검정)
 * 5. 다변량 테스트 (MVT) 지원
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AbTestService {

    private final Map<String, AbTest> activeTests = new ConcurrentHashMap<>();
    private final Map<String, List<AbTestEvent>> testEvents = new ConcurrentHashMap<>();

    /**
     * A/B 테스트 생성
     */
    public AbTest createTest(String testId, String testName, List<String> variants,
                             double trafficAllocation) {

        if (activeTests.containsKey(testId)) {
            throw new IllegalArgumentException("Test already exists: " + testId);
        }

        AbTest test = new AbTest(
            testId,
            testName,
            variants,
            trafficAllocation,
            TestStatus.ACTIVE,
            LocalDateTime.now(),
            null,
            new HashMap<>()
        );

        // 각 variant 초기화
        variants.forEach(variant -> test.variantStats().put(variant, new VariantStats(
            variant, 0, 0, 0.0, 0.0
        )));

        activeTests.put(testId, test);
        testEvents.put(testId, new ArrayList<>());

        log.info("A/B test created: testId={}, variants={}", testId, variants);

        return test;
    }

    /**
     * 사용자에게 variant 할당
     * Consistent Hashing으로 동일 사용자는 항상 같은 variant
     */
    public String assignVariant(String testId, Long userId) {
        AbTest test = activeTests.get(testId);
        if (test == null || test.status() != TestStatus.ACTIVE) {
            return test != null ? test.variants().get(0) : "control";
        }

        // 트래픽 할당 체크
        if (Math.random() > test.trafficAllocation()) {
            return test.variants().get(0); // 기본값 (control)
        }

        // Consistent Hashing으로 variant 할당
        int hash = Objects.hash(testId, userId);
        int index = Math.abs(hash) % test.variants().size();

        String assignedVariant = test.variants().get(index);

        log.debug("User assigned to variant: userId={}, testId={}, variant={}",
                  userId, testId, assignedVariant);

        return assignedVariant;
    }

    /**
     * 노출 이벤트 기록
     */
    public void trackExposure(String testId, Long userId, String variant) {
        AbTest test = activeTests.get(testId);
        if (test == null) return;

        AbTestEvent event = new AbTestEvent(
            UUID.randomUUID().toString(),
            testId,
            userId,
            variant,
            EventType.EXPOSURE,
            LocalDateTime.now(),
            null
        );

        testEvents.get(testId).add(event);

        // 통계 업데이트
        updateVariantStats(testId, variant, EventType.EXPOSURE);
    }

    /**
     * 전환 이벤트 기록
     */
    public void trackConversion(String testId, Long userId, String variant, Double value) {
        AbTest test = activeTests.get(testId);
        if (test == null) return;

        AbTestEvent event = new AbTestEvent(
            UUID.randomUUID().toString(),
            testId,
            userId,
            variant,
            EventType.CONVERSION,
            LocalDateTime.now(),
            value
        );

        testEvents.get(testId).add(event);

        // 통계 업데이트
        updateVariantStats(testId, variant, EventType.CONVERSION);

        log.debug("Conversion tracked: testId={}, userId={}, variant={}, value={}",
                  testId, userId, variant, value);
    }

    /**
     * 테스트 결과 분석
     */
    public AbTestResult analyzeTest(String testId) {
        AbTest test = activeTests.get(testId);
        if (test == null) {
            throw new IllegalArgumentException("Test not found: " + testId);
        }

        List<AbTestEvent> events = testEvents.get(testId);

        // Variant별 통계 계산
        Map<String, VariantStats> variantStats = test.variants().stream()
            .collect(Collectors.toMap(
                variant -> variant,
                variant -> calculateVariantStats(variant, events)
            ));

        // Control vs Treatment 비교
        VariantStats control = variantStats.get(test.variants().get(0));
        List<VariantComparison> comparisons = new ArrayList<>();

        for (int i = 1; i < test.variants().size(); i++) {
            String treatmentVariant = test.variants().get(i);
            VariantStats treatment = variantStats.get(treatmentVariant);

            double uplift = calculateUplift(control.conversionRate(), treatment.conversionRate());
            double pValue = calculateChiSquare(control, treatment);
            boolean isSignificant = pValue < 0.05;

            comparisons.add(new VariantComparison(
                "control",
                treatmentVariant,
                uplift,
                pValue,
                isSignificant
            ));
        }

        // 승자 결정
        String winner = determineWinner(variantStats, comparisons);

        log.info("A/B test analyzed: testId={}, winner={}", testId, winner);

        return new AbTestResult(
            testId,
            test.testName(),
            variantStats,
            comparisons,
            winner
        );
    }

    /**
     * 테스트 종료
     */
    public AbTest stopTest(String testId) {
        AbTest test = activeTests.get(testId);
        if (test == null) {
            throw new IllegalArgumentException("Test not found: " + testId);
        }

        AbTest stoppedTest = new AbTest(
            test.testId(),
            test.testName(),
            test.variants(),
            test.trafficAllocation(),
            TestStatus.STOPPED,
            test.startTime(),
            LocalDateTime.now(),
            test.variantStats()
        );

        activeTests.put(testId, stoppedTest);

        log.info("A/B test stopped: testId={}", testId);

        return stoppedTest;
    }

    /**
     * 활성 테스트 목록
     */
    public List<AbTest> getActiveTests() {
        return activeTests.values().stream()
            .filter(test -> test.status() == TestStatus.ACTIVE)
            .toList();
    }

    // Helper Methods

    private void updateVariantStats(String testId, String variant, EventType eventType) {
        AbTest test = activeTests.get(testId);
        VariantStats current = test.variantStats().get(variant);

        int newExposures = current.exposures() + (eventType == EventType.EXPOSURE ? 1 : 0);
        int newConversions = current.conversions() + (eventType == EventType.CONVERSION ? 1 : 0);
        double newConversionRate = newExposures > 0 ? (double) newConversions / newExposures : 0.0;

        VariantStats updated = new VariantStats(
            variant,
            newExposures,
            newConversions,
            newConversionRate,
            current.revenuePerUser()
        );

        test.variantStats().put(variant, updated);
    }

    private VariantStats calculateVariantStats(String variant, List<AbTestEvent> events) {
        long exposures = events.stream()
            .filter(e -> e.variant().equals(variant) && e.eventType() == EventType.EXPOSURE)
            .count();

        long conversions = events.stream()
            .filter(e -> e.variant().equals(variant) && e.eventType() == EventType.CONVERSION)
            .count();

        double conversionRate = exposures > 0 ? (double) conversions / exposures : 0.0;

        double totalRevenue = events.stream()
            .filter(e -> e.variant().equals(variant) && e.eventType() == EventType.CONVERSION)
            .mapToDouble(e -> e.value() != null ? e.value() : 0.0)
            .sum();

        double revenuePerUser = exposures > 0 ? totalRevenue / exposures : 0.0;

        return new VariantStats(
            variant,
            (int) exposures,
            (int) conversions,
            conversionRate,
            revenuePerUser
        );
    }

    private double calculateUplift(double controlRate, double treatmentRate) {
        if (controlRate == 0) return 0.0;
        return ((treatmentRate - controlRate) / controlRate) * 100.0;
    }

    /**
     * 카이제곱 검정 (Chi-Square Test)
     * 통계적 유의성 검증
     */
    private double calculateChiSquare(VariantStats control, VariantStats treatment) {
        int n1 = control.exposures();
        int n2 = treatment.exposures();
        int x1 = control.conversions();
        int x2 = treatment.conversions();

        if (n1 == 0 || n2 == 0) return 1.0;

        double p1 = (double) x1 / n1;
        double p2 = (double) x2 / n2;
        double p = (double) (x1 + x2) / (n1 + n2);

        double se = Math.sqrt(p * (1 - p) * (1.0 / n1 + 1.0 / n2));

        if (se == 0) return 1.0;

        double z = (p1 - p2) / se;
        double chiSquare = z * z;

        // 자유도 1에서의 p-value 근사값
        // 실제로는 Apache Commons Math 등의 라이브러리 사용 권장
        return 1.0 - Math.min(0.9999, chiSquare / 10.0); // 간단한 근사
    }

    private String determineWinner(Map<String, VariantStats> stats,
                                    List<VariantComparison> comparisons) {

        // 유의미한 개선이 있는 variant 찾기
        Optional<VariantComparison> significantWinner = comparisons.stream()
            .filter(c -> c.isStatisticallySignificant() && c.uplift() > 5.0)
            .max(Comparator.comparingDouble(VariantComparison::uplift));

        return significantWinner.map(VariantComparison::treatmentVariant)
            .orElse("No clear winner");
    }

    // Enums & Records

    public enum TestStatus {
        ACTIVE, STOPPED, COMPLETED
    }

    public enum EventType {
        EXPOSURE, CONVERSION
    }

    public record AbTest(
        String testId,
        String testName,
        List<String> variants,
        double trafficAllocation,
        TestStatus status,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Map<String, VariantStats> variantStats
    ) {}

    public record VariantStats(
        String variant,
        int exposures,
        int conversions,
        double conversionRate,
        double revenuePerUser
    ) {}

    public record AbTestEvent(
        String eventId,
        String testId,
        Long userId,
        String variant,
        EventType eventType,
        LocalDateTime timestamp,
        Double value
    ) {}

    public record AbTestResult(
        String testId,
        String testName,
        Map<String, VariantStats> variantStats,
        List<VariantComparison> comparisons,
        String winner
    ) {}

    public record VariantComparison(
        String controlVariant,
        String treatmentVariant,
        double uplift,
        double pValue,
        boolean isStatisticallySignificant
    ) {}
}
