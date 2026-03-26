import { NextRequest, NextResponse } from 'next/server';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';

async function queryPrometheus(query: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`,
      { next: { revalidate: 15 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const value = data?.data?.result?.[0]?.value?.[1];
    return value !== undefined ? parseFloat(value) : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/metrics
 * Prometheus에서 주요 서비스 메트릭을 수집하여 반환
 * ADMIN 역할만 접근 가능 (middleware에서 보호)
 */
export async function GET(request: NextRequest) {
  try {
    const [
      httpP50,
      httpP95,
      httpP99,
      ordersPerSecond,
      paymentsPerSecond,
      activeUsers,
      redisHitRate,
      kafkaConsumerLag,
    ] = await Promise.all([
      queryPrometheus('histogram_quantile(0.50, rate(http_server_requests_seconds_bucket[5m]))'),
      queryPrometheus('histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))'),
      queryPrometheus('histogram_quantile(0.99, rate(http_server_requests_seconds_bucket[5m]))'),
      queryPrometheus('rate(http_server_requests_total{uri=~"/api/orders.*",method="POST"}[1m])'),
      queryPrometheus('rate(http_server_requests_total{uri=~"/api/payments.*",method="POST"}[1m])'),
      queryPrometheus('sum(spring_security_authentications_total{outcome="SUCCESS"}) by (application)'),
      queryPrometheus('sum(redis_keyspace_hits_total) / (sum(redis_keyspace_hits_total) + sum(redis_keyspace_misses_total))'),
      queryPrometheus('sum(kafka_consumer_records_lag) by (group)'),
    ]);

    // 오늘 매출 (order-service에서 직접 조회)
    let todayRevenue = null;
    try {
      const revenueRes = await fetch(
        `${process.env.ORDER_SERVICE_URL || 'http://order-service:8086'}/api/orders/query/statistics`,
        { headers: { 'X-Internal-Request': 'true' }, next: { revalidate: 60 } }
      );
      if (revenueRes.ok) {
        const revenueData = await revenueRes.json();
        todayRevenue = revenueData?.todayRevenue ?? null;
      }
    } catch { /* order-service 미응답 시 null */ }

    return NextResponse.json({
      responseTime: {
        p50: httpP50 !== null ? Math.round(httpP50 * 1000) : null,
        p95: httpP95 !== null ? Math.round(httpP95 * 1000) : null,
        p99: httpP99 !== null ? Math.round(httpP99 * 1000) : null,
        unit: 'ms',
      },
      throughput: {
        ordersPerSecond: ordersPerSecond !== null ? Math.round(ordersPerSecond * 100) / 100 : null,
        paymentsPerSecond: paymentsPerSecond !== null ? Math.round(paymentsPerSecond * 100) / 100 : null,
      },
      activeUsers,
      redisHitRate: redisHitRate !== null ? Math.round(redisHitRate * 100) : null,
      kafkaConsumerLag: kafkaConsumerLag !== null ? Math.round(kafkaConsumerLag) : null,
      todayRevenue,
      collectedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: '메트릭 수집 실패', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
