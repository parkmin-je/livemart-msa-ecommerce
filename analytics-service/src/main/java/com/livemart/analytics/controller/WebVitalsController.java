package com.livemart.analytics.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Core Web Vitals 수집 엔드포인트
 *
 * 프론트엔드 WebVitals 컴포넌트에서 navigator.sendBeacon / fetch 로 전송.
 * 수신된 지표를 Elasticsearch(Kibana) 에서 조회할 수 있도록 구조화 로그 출력.
 *
 * Kibana 인덱스 패턴: livemart-logs-*
 * Kibana 대시보드 쿼리: service:"analytics-service" AND fields.metric_name:"LCP"
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
public class WebVitalsController {

    @PostMapping("/web-vitals")
    public ResponseEntity<Void> collect(@RequestBody Map<String, Object> payload) {
        // 구조화 로그 → Fluentd → Elasticsearch → Kibana 시각화
        log.info("[WebVitals] metric={} value={} rating={} page={} delta={} id={}",
                payload.get("name"),
                payload.get("value"),
                payload.get("rating"),
                payload.get("page"),
                payload.get("delta"),
                payload.get("id"));

        return ResponseEntity.accepted().build();
    }
}
