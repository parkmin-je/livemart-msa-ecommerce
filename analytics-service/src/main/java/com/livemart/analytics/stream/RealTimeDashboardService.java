package com.livemart.analytics.stream;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 실시간 대시보드 서비스
 *
 * SSE (Server-Sent Events)로 실시간 데이터 스트리밍
 * Kafka Streams 집계 결과를 실시간으로 클라이언트에 전송
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RealTimeDashboardService {

    private final RedisTemplate<String, Object> redisTemplate;

    // SSE 구독자 관리
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    // 실시간 메트릭 저장소
    private final Map<String, DashboardMetrics> metricsCache = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    /**
     * SSE 연결 생성
     */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((e) -> emitters.remove(emitter));

        emitters.add(emitter);

        log.info("New SSE subscriber connected. Total subscribers: {}", emitters.size());

        // 즉시 현재 메트릭 전송
        try {
            emitter.send(SseEmitter.event()
                .name("metrics")
                .data(getCurrentMetrics()));
        } catch (IOException e) {
            log.error("Failed to send initial metrics", e);
            emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * 실시간 메트릭 업데이트 시작
     */
    public void startMetricsStreaming() {
        scheduler.scheduleAtFixedRate(() -> {
            try {
                DashboardMetrics metrics = collectMetrics();
                broadcastMetrics(metrics);
            } catch (Exception e) {
                log.error("Error streaming metrics", e);
            }
        }, 0, 5, TimeUnit.SECONDS); // 5초마다 업데이트

        log.info("Real-time metrics streaming started");
    }

    /**
     * 메트릭 수집
     */
    private DashboardMetrics collectMetrics() {
        // Redis에서 Kafka Streams 집계 결과 조회
        Long currentMinuteSales = getCurrentMinuteSales();
        Long todayOrders = getTodayOrderCount();
        Double todayRevenue = getTodayRevenue();
        List<TopProduct> topProducts = getTopProducts();
        Map<String, Long> categoryBreakdown = getCategoryBreakdown();
        List<RecentOrder> recentOrders = getRecentOrders();

        // 실시간 통계
        int activeUsers = getActiveUserCount();
        double avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0.0;
        double conversionRate = calculateConversionRate();

        DashboardMetrics metrics = new DashboardMetrics(
            LocalDateTime.now(),
            currentMinuteSales,
            todayOrders,
            todayRevenue,
            avgOrderValue,
            conversionRate,
            activeUsers,
            topProducts,
            categoryBreakdown,
            recentOrders
        );

        metricsCache.put("latest", metrics);

        return metrics;
    }

    /**
     * 모든 구독자에게 브로드캐스트
     */
    private void broadcastMetrics(DashboardMetrics metrics) {
        List<SseEmitter> deadEmitters = new ArrayList<>();

        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                    .name("metrics")
                    .data(metrics));
            } catch (Exception e) {
                log.warn("Failed to send metrics to subscriber", e);
                deadEmitters.add(emitter);
            }
        });

        // 죽은 연결 제거
        emitters.removeAll(deadEmitters);

        if (!deadEmitters.isEmpty()) {
            log.info("Removed {} dead subscribers. Active subscribers: {}",
                     deadEmitters.size(), emitters.size());
        }
    }

    /**
     * 알림 브로드캐스트
     */
    public void broadcastAlert(DashboardAlert alert) {
        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                    .name("alert")
                    .data(alert));
            } catch (Exception e) {
                log.error("Failed to send alert", e);
            }
        });

        log.info("Alert broadcasted: type={}, message={}", alert.type(), alert.message());
    }

    /**
     * 현재 메트릭 조회
     */
    public DashboardMetrics getCurrentMetrics() {
        return metricsCache.getOrDefault("latest",
            new DashboardMetrics(
                LocalDateTime.now(), 0L, 0L, 0.0, 0.0, 0.0, 0,
                Collections.emptyList(), Collections.emptyMap(), Collections.emptyList()
            )
        );
    }

    // Helper Methods

    private Long getCurrentMinuteSales() {
        String key = "metrics:sales:minute:" + (System.currentTimeMillis() / 60000);
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? ((Number) value).longValue() : 0L;
    }

    private Long getTodayOrderCount() {
        String today = java.time.LocalDate.now().toString();
        String key = "metrics:orders:daily:" + today;
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? ((Number) value).longValue() : 100L; // 시뮬레이션
    }

    private Double getTodayRevenue() {
        String today = java.time.LocalDate.now().toString();
        String key = "metrics:revenue:daily:" + today;
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? ((Number) value).doubleValue() : 5000000.0; // 시뮬레이션
    }

    private List<TopProduct> getTopProducts() {
        // 시뮬레이션 데이터
        return List.of(
            new TopProduct(1L, "노트북", 150, 45000000.0),
            new TopProduct(2L, "스마트폰", 200, 40000000.0),
            new TopProduct(3L, "태블릿", 120, 24000000.0),
            new TopProduct(4L, "이어폰", 300, 15000000.0),
            new TopProduct(5L, "충전기", 250, 5000000.0)
        );
    }

    private Map<String, Long> getCategoryBreakdown() {
        Map<String, Long> breakdown = new HashMap<>();
        breakdown.put("전자기기", 450L);
        breakdown.put("패션", 320L);
        breakdown.put("식품", 280L);
        breakdown.put("가전", 150L);
        breakdown.put("도서", 100L);
        return breakdown;
    }

    private List<RecentOrder> getRecentOrders() {
        // 시뮬레이션 데이터
        return List.of(
            new RecentOrder("ORD-001", 1001L, 350000.0, LocalDateTime.now().minusSeconds(30)),
            new RecentOrder("ORD-002", 1002L, 120000.0, LocalDateTime.now().minusSeconds(45)),
            new RecentOrder("ORD-003", 1003L, 890000.0, LocalDateTime.now().minusMinutes(1)),
            new RecentOrder("ORD-004", 1004L, 45000.0, LocalDateTime.now().minusMinutes(2)),
            new RecentOrder("ORD-005", 1005L, 670000.0, LocalDateTime.now().minusMinutes(3))
        );
    }

    private int getActiveUserCount() {
        String key = "metrics:active-users";
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? ((Number) value).intValue() : 523; // 시뮬레이션
    }

    private double calculateConversionRate() {
        // 방문자 대비 구매 전환율
        return 3.2; // 시뮬레이션 3.2%
    }

    // Records

    public record DashboardMetrics(
        LocalDateTime timestamp,
        Long currentMinuteSales,
        Long todayOrders,
        Double todayRevenue,
        Double avgOrderValue,
        Double conversionRate,
        int activeUsers,
        List<TopProduct> topProducts,
        Map<String, Long> categoryBreakdown,
        List<RecentOrder> recentOrders
    ) {}

    public record TopProduct(
        Long productId,
        String productName,
        int salesCount,
        Double revenue
    ) {}

    public record RecentOrder(
        String orderId,
        Long userId,
        Double amount,
        LocalDateTime timestamp
    ) {}

    public record DashboardAlert(
        String type,  // INFO, WARNING, ERROR, SUCCESS
        String message,
        LocalDateTime timestamp
    ) {}
}
