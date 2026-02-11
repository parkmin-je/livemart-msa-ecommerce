package com.livemart.analytics.stream;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.kstream.*;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.time.Duration;
import java.util.Properties;

/**
 * Kafka Streams를 이용한 실시간 주문 이벤트 처리
 *
 * 기능:
 * 1. 실시간 매출 집계 (시간 윈도우)
 * 2. 상품별 판매량 카운팅
 * 3. 이상 거래 감지
 * 4. 사용자별 구매 패턴 분석
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventProcessor {

    private KafkaStreams streams;

    @PostConstruct
    public void init() {
        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-analytics-stream");
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass());

        StreamsBuilder builder = new StreamsBuilder();

        // 주문 이벤트 스트림
        KStream<String, String> orderEvents = builder.stream("order-events");

        // 1. 실시간 매출 집계 (1분 윈도우)
        buildSalesAggregation(orderEvents);

        // 2. 상품별 판매량 카운팅
        buildProductSalesCount(orderEvents);

        // 3. 이상 거래 감지
        buildAnomalyDetection(orderEvents);

        // 4. 사용자별 구매 패턴 분석
        buildUserBehaviorAnalysis(orderEvents);

        streams = new KafkaStreams(builder.build(), props);
        streams.start();

        log.info("Kafka Streams started: order-analytics-stream");
    }

    /**
     * 실시간 매출 집계 (Tumbling Window - 1분)
     */
    private void buildSalesAggregation(KStream<String, String> orderEvents) {
        orderEvents
            .filter((key, value) -> value.contains("\"status\":\"COMPLETED\""))
            .mapValues(this::extractAmount)
            .groupByKey()
            .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(1)))
            .aggregate(
                () -> 0.0,
                (key, value, aggregate) -> aggregate + value,
                Materialized.with(Serdes.String(), Serdes.Double())
            )
            .toStream()
            .foreach((windowedKey, totalSales) -> {
                log.info("Sales in last minute: window={}, total={}",
                         windowedKey.window(), totalSales);
            });
    }

    /**
     * 상품별 판매량 카운팅
     */
    private void buildProductSalesCount(KStream<String, String> orderEvents) {
        orderEvents
            .filter((key, value) -> value.contains("\"status\":\"COMPLETED\""))
            .flatMapValues(this::extractProductIds)
            .groupBy((key, productId) -> productId)
            .count(Materialized.with(Serdes.String(), Serdes.Long()))
            .toStream()
            .foreach((productId, count) -> {
                log.debug("Product sales count: productId={}, count={}", productId, count);

                // 인기 상품 (100개 이상 판매)
                if (count >= 100) {
                    log.info("Popular product detected: productId={}, totalSales={}",
                             productId, count);
                }
            });
    }

    /**
     * 이상 거래 감지 (Sliding Window - 5분)
     */
    private void buildAnomalyDetection(KStream<String, String> orderEvents) {
        orderEvents
            .filter((key, value) -> value.contains("\"status\":\"COMPLETED\""))
            .mapValues(this::extractAmount)
            .filter((key, amount) -> amount > 1000000) // 100만원 이상 거래
            .foreach((key, amount) -> {
                log.warn("High value transaction detected: orderId={}, amount={}",
                         key, amount);
                // 알림 발송 (이메일, Slack 등)
            });

        // 짧은 시간 내 다수 주문 (사용자당 5분 내 10건 이상)
        orderEvents
            .filter((key, value) -> value.contains("\"status\":\"COMPLETED\""))
            .map((key, value) -> KeyValue.pair(extractUserId(value), value))
            .groupByKey()
            .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
            .count()
            .toStream()
            .filter((windowedKey, count) -> count >= 10)
            .foreach((windowedKey, count) -> {
                log.warn("Suspicious activity: userId={}, ordersIn5min={}",
                         windowedKey.key(), count);
                // 사기 방지 시스템 알림
            });
    }

    /**
     * 사용자별 구매 패턴 분석 (Session Window)
     */
    private void buildUserBehaviorAnalysis(KStream<String, String> orderEvents) {
        orderEvents
            .filter((key, value) -> value.contains("\"status\":\"COMPLETED\""))
            .map((key, value) -> KeyValue.pair(extractUserId(value), extractAmount(value)))
            .groupByKey()
            .windowedBy(SessionWindows.ofInactivityGapWithNoGrace(Duration.ofMinutes(30)))
            .aggregate(
                () -> new UserSession(0, 0.0),
                (key, value, aggregate) -> new UserSession(
                    aggregate.orderCount + 1,
                    aggregate.totalAmount + value
                ),
                (key, leftSession, rightSession) -> new UserSession(
                    leftSession.orderCount + rightSession.orderCount,
                    leftSession.totalAmount + rightSession.totalAmount
                ),
                Materialized.with(Serdes.String(), new UserSessionSerde())
            )
            .toStream()
            .foreach((windowedKey, session) -> {
                log.info("User session: userId={}, orders={}, totalAmount={}",
                         windowedKey.key(), session.orderCount, session.totalAmount);

                // VIP 고객 감지 (세션당 50만원 이상)
                if (session.totalAmount >= 500000) {
                    log.info("VIP customer detected: userId={}, sessionAmount={}",
                             windowedKey.key(), session.totalAmount);
                }
            });
    }

    /**
     * Join: 주문과 상품 정보 결합
     */
    private void buildOrderProductJoin(StreamsBuilder builder) {
        KStream<String, String> orders = builder.stream("order-events");
        KTable<String, String> products = builder.table("product-table");

        orders
            .filter((key, value) -> value.contains("\"status\":\"COMPLETED\""))
            .join(
                products,
                (orderValue, productValue) -> {
                    // 주문 정보 + 상품 정보 결합
                    return String.format("{\"order\":%s,\"product\":%s}",
                                       orderValue, productValue);
                },
                Joined.with(Serdes.String(), Serdes.String(), Serdes.String())
            )
            .to("enriched-orders");
    }

    // Helper Methods

    private double extractAmount(String jsonValue) {
        try {
            // 간단한 JSON 파싱 (실제로는 Jackson 사용 권장)
            String amountStr = jsonValue.substring(
                jsonValue.indexOf("\"amount\":") + 9,
                jsonValue.indexOf(",", jsonValue.indexOf("\"amount\":"))
            );
            return Double.parseDouble(amountStr);
        } catch (Exception e) {
            log.error("Failed to extract amount", e);
            return 0.0;
        }
    }

    private String extractUserId(String jsonValue) {
        try {
            String userIdStr = jsonValue.substring(
                jsonValue.indexOf("\"userId\":") + 10,
                jsonValue.indexOf(",", jsonValue.indexOf("\"userId\":"))
            );
            return userIdStr.replace("\"", "");
        } catch (Exception e) {
            log.error("Failed to extract userId", e);
            return "unknown";
        }
    }

    private java.util.List<String> extractProductIds(String jsonValue) {
        // 간단한 구현 (실제로는 JSON 파서 사용)
        java.util.List<String> productIds = new java.util.ArrayList<>();

        try {
            int itemsStart = jsonValue.indexOf("\"items\":[");
            if (itemsStart > 0) {
                String itemsStr = jsonValue.substring(itemsStart + 9);
                // productId 추출 로직
                productIds.add("1"); // 시뮬레이션
            }
        } catch (Exception e) {
            log.error("Failed to extract productIds", e);
        }

        return productIds;
    }

    @PreDestroy
    public void cleanup() {
        if (streams != null) {
            streams.close();
            log.info("Kafka Streams closed");
        }
    }

    // Inner Classes

    public record UserSession(int orderCount, double totalAmount) {}

    private static class UserSessionSerde implements org.apache.kafka.common.serialization.Serde<UserSession> {
        @Override
        public org.apache.kafka.common.serialization.Serializer<UserSession> serializer() {
            return (topic, data) -> {
                if (data == null) return null;
                String json = String.format("{\"orderCount\":%d,\"totalAmount\":%.2f}",
                                          data.orderCount(), data.totalAmount());
                return json.getBytes();
            };
        }

        @Override
        public org.apache.kafka.common.serialization.Deserializer<UserSession> deserializer() {
            return (topic, data) -> {
                if (data == null) return null;
                try {
                    String json = new String(data);
                    // 간단한 파싱
                    return new UserSession(0, 0.0);
                } catch (Exception e) {
                    return new UserSession(0, 0.0);
                }
            };
        }
    }
}
