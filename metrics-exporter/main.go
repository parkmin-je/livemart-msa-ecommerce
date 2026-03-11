// LiveMart Business Metrics Exporter (Go)
//
// Spring Boot Actuator /actuator/prometheus 는 JVM/HTTP 메트릭을 제공하지만,
// 비즈니스 레벨 집계 지표(매출, 주문 전환율 등)는 별도 수집이 필요.
//
// 이 서비스는:
// 1. Redis에서 실시간 비즈니스 카운터 수집
// 2. 각 Spring Boot 서비스의 커스텀 메트릭 집계
// 3. Prometheus 포맷으로 /metrics 엔드포인트 노출
// 4. Grafana 대시보드에서 비즈니스 KPI 시각화
//
// 사용 이유: Go는 Prometheus exporter에 이상적
// - 낮은 메모리 풋프린트 (~15MB vs Spring Boot ~200MB)
// - 네이티브 Prometheus 클라이언트 라이브러리
// - 빠른 시작 시간, 컨테이너 친화적

package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

// ── Prometheus 메트릭 정의 ──────────────────────────────────

var (
	// 비즈니스 메트릭
	ordersTotal = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "livemart_orders_total",
			Help: "총 주문 수 (상태별)",
		},
		[]string{"status"}, // PENDING, CONFIRMED, CANCELLED, DELIVERED
	)

	revenueTotal = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "livemart_revenue_total_krw",
			Help: "누적 매출액 (원)",
		},
	)

	activeUsers = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "livemart_active_users_current",
			Help: "현재 활성 사용자 수 (Redis 세션 기반)",
		},
	)

	cartAbandonmentRate = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "livemart_cart_abandonment_rate",
			Help: "장바구니 이탈률 (0.0 ~ 1.0)",
		},
	)

	productViewsTotal = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "livemart_product_views_total",
			Help: "상품별 조회 수",
		},
		[]string{"category"},
	)

	aiRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "livemart_ai_requests_total",
			Help: "AI 서비스 요청 수 (기능별)",
		},
		[]string{"feature"}, // recommend, describe, chat
	)

	aiResponseTimeMs = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "livemart_ai_response_time_ms",
			Help:    "AI 서비스 응답 시간 분포 (ms)",
			Buckets: []float64{100, 300, 500, 1000, 2000, 5000},
		},
		[]string{"feature"},
	)

	rateLimitHits = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "livemart_rate_limit_hits_total",
			Help: "Rate Limit 초과 횟수 (서비스별)",
		},
		[]string{"service"},
	)

	kafkaLag = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "livemart_kafka_consumer_lag",
			Help: "Kafka 컨슈머 그룹 랙 (미처리 메시지 수)",
		},
		[]string{"consumer_group", "topic"},
	)

	// 익스포터 자체 메트릭
	exporterUp = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "livemart_exporter_up",
			Help: "익스포터 정상 동작 여부 (1=정상, 0=오류)",
		},
	)

	scrapeErrors = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "livemart_exporter_scrape_errors_total",
			Help: "수집 중 발생한 오류 수",
		},
	)
)

// ── Redis 클라이언트 ────────────────────────────────────────

type MetricsCollector struct {
	rdb *redis.Client
	ctx context.Context
}

func newRedisClient() *redis.Client {
	redisHost := getEnv("REDIS_HOST", "localhost")
	redisPort := getEnv("REDIS_PORT", "6379")

	return redis.NewClient(&redis.Options{
		Addr:         redisHost + ":" + redisPort,
		Password:     getEnv("REDIS_PASSWORD", ""),
		DB:           0,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})
}

// ── 메트릭 수집 로직 ────────────────────────────────────────

func (mc *MetricsCollector) collect() {
	// 1. 활성 사용자 (Redis 세션 키 카운트)
	if count, err := mc.rdb.Keys(mc.ctx, "session:*").Result(); err == nil {
		activeUsers.Set(float64(len(count)))
	} else {
		log.Printf("Redis session count error: %v", err)
		scrapeErrors.Inc()
	}

	// 2. 주문 상태별 카운터
	statuses := []string{"PENDING", "CONFIRMED", "PAYMENT_COMPLETED", "DELIVERING", "DELIVERED", "CANCELLED"}
	for _, status := range statuses {
		key := "metrics:orders:status:" + status
		if val, err := mc.rdb.Get(mc.ctx, key).Result(); err == nil {
			if count, err := strconv.ParseFloat(val, 64); err == nil {
				ordersTotal.WithLabelValues(status).Set(count)
			}
		}
	}

	// 3. 누적 매출액
	if val, err := mc.rdb.Get(mc.ctx, "metrics:revenue:total").Result(); err == nil {
		if amount, err := strconv.ParseFloat(val, 64); err == nil {
			revenueTotal.Set(amount)
		}
	}

	// 4. 카테고리별 상품 조회 수
	categories := []string{"전자기기", "패션", "식품", "홈/리빙", "뷰티", "스포츠"}
	for _, cat := range categories {
		key := "metrics:views:category:" + cat
		if val, err := mc.rdb.Get(mc.ctx, key).Result(); err == nil {
			if count, err := strconv.ParseFloat(val, 64); err == nil {
				productViewsTotal.WithLabelValues(cat).Set(count)
			}
		}
	}

	// 5. AI 서비스 통계 (ai-service가 Redis에 기록한 카운터)
	aiFeatures := []string{"recommend", "describe", "chat"}
	for _, feat := range aiFeatures {
		// 요청 수
		if val, err := mc.rdb.Get(mc.ctx, "metrics:ai:requests:"+feat).Result(); err == nil {
			if count, err := strconv.ParseFloat(val, 64); err == nil {
				aiRequestsTotal.WithLabelValues(feat).Add(count)
			}
		}
		// 평균 응답 시간
		if val, err := mc.rdb.Get(mc.ctx, "metrics:ai:latency_ms:"+feat).Result(); err == nil {
			if ms, err := strconv.ParseFloat(val, 64); err == nil {
				aiResponseTimeMs.WithLabelValues(feat).Observe(ms)
			}
		}
	}

	// 6. Rate Limit 초과 횟수
	services := []string{"order-service", "payment-service", "ai-service"}
	for _, svc := range services {
		if val, err := mc.rdb.Get(mc.ctx, "metrics:ratelimit:hits:"+svc).Result(); err == nil {
			if count, err := strconv.ParseFloat(val, 64); err == nil {
				rateLimitHits.WithLabelValues(svc).Add(count)
			}
		}
	}

	// 7. 장바구니 이탈률 (Redis Hash)
	if val, err := mc.rdb.HGet(mc.ctx, "metrics:cart", "abandonment_rate").Result(); err == nil {
		if rate, err := strconv.ParseFloat(val, 64); err == nil {
			cartAbandonmentRate.Set(rate)
		}
	}

	exporterUp.Set(1)
}

// ── 상태 엔드포인트 ─────────────────────────────────────────

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	resp := map[string]interface{}{
		"status":    "UP",
		"service":   "livemart-metrics-exporter",
		"timestamp": time.Now().Format(time.RFC3339),
	}
	json.NewEncoder(w).Encode(resp)
}

// ── 메인 ────────────────────────────────────────────────────

func main() {
	port := getEnv("PORT", "9100")
	scrapeInterval := 15 * time.Second

	// Prometheus 레지스트리에 메트릭 등록
	reg := prometheus.NewRegistry()
	reg.MustRegister(
		ordersTotal, revenueTotal, activeUsers, cartAbandonmentRate,
		productViewsTotal, aiRequestsTotal, aiResponseTimeMs,
		rateLimitHits, kafkaLag, exporterUp, scrapeErrors,
		prometheus.NewGoCollector(),       // Go 런타임 메트릭
		prometheus.NewProcessCollector(   // 프로세스 메트릭 (CPU, 메모리)
			prometheus.ProcessCollectorOpts{},
		),
	)

	// Redis 연결
	rdb := newRedisClient()
	defer rdb.Close()

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("WARNING: Redis connection failed: %v (collecting will retry)", err)
		exporterUp.Set(0)
	} else {
		log.Printf("Redis connected successfully")
	}

	collector := &MetricsCollector{rdb: rdb, ctx: ctx}

	// 주기적 수집 고루틴
	go func() {
		ticker := time.NewTicker(scrapeInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				func() {
					defer func() {
						if r := recover(); r != nil {
							log.Printf("Collect panic: %v", r)
							scrapeErrors.Inc()
							exporterUp.Set(0)
						}
					}()
					collector.collect()
				}()
			}
		}
	}()

	// 초기 수집
	collector.collect()

	// HTTP 서버
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.HandlerFor(reg, promhttp.HandlerOpts{}))
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<h1>LiveMart Metrics Exporter</h1>
		<p><a href="/metrics">Metrics</a></p>
		<p><a href="/health">Health</a></p>`))
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	log.Printf("LiveMart Metrics Exporter started on :%s (scrape interval: %s)", port, scrapeInterval)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
