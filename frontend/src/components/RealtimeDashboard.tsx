'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardMetrics {
  timestamp: string;
  currentMinuteSales: number;
  todayOrders: number;
  todayRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  activeUsers: number;
  topProducts: Array<{
    productId: number;
    productName: string;
    salesCount: number;
    revenue: number;
  }>;
}

export function RealtimeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [salesHistory, setSalesHistory] = useState<number[]>([]);
  const [timeLabels, setTimeLabels] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        // SSE (Server-Sent Events) 연결
        eventSource = new EventSource('http://localhost:8087/api/v1/dashboard/stream');

        eventSource.onopen = () => {
          console.log('SSE connected successfully');
          setConnected(true);
        };

        eventSource.addEventListener('metrics', (event) => {
          try {
            const data = JSON.parse(event.data);
            setMetrics(data);
            setConnected(true);

            // 매출 히스토리 업데이트 (최근 20개)
            setSalesHistory((prev) => {
              const newHistory = [...prev, data.todayRevenue];
              return newHistory.slice(-20);
            });

            // 시간 라벨 업데이트
            setTimeLabels((prev) => {
              const time = new Date(data.timestamp).toLocaleTimeString('ko-KR');
              const newLabels = [...prev, time];
              return newLabels.slice(-20);
            });
          } catch (error) {
            console.error('Error parsing metrics:', error);
          }
        });

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setConnected(false);
          eventSource?.close();

          // 5초 후 재연결 시도
          reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            connectSSE();
          }, 5000);
        };
      } catch (error) {
        console.error('Error creating EventSource:', error);
        setConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  const chartData = {
    labels: timeLabels,
    datasets: [
      {
        label: '실시간 매출',
        data: salesHistory,
        borderColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      x: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">실시간 대시보드 연결 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">실시간 대시보드 (SSE)</h2>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          ></div>
          <span className="text-sm">{connected ? '연결됨' : '연결 끊김'}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="text-sm opacity-80 mb-1">오늘 매출</div>
          <div className="text-3xl font-bold">
            {(metrics.todayRevenue / 1000000).toFixed(1)}M
          </div>
          <div className="text-xs opacity-60 mt-1">
            {metrics.todayRevenue.toLocaleString()}원
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="text-sm opacity-80 mb-1">오늘 주문</div>
          <div className="text-3xl font-bold">{metrics.todayOrders}</div>
          <div className="text-xs opacity-60 mt-1">건</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="text-sm opacity-80 mb-1">활성 사용자</div>
          <div className="text-3xl font-bold">{metrics.activeUsers}</div>
          <div className="text-xs opacity-60 mt-1">명</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <div className="text-sm opacity-80 mb-1">전환율</div>
          <div className="text-3xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
          <div className="text-xs opacity-60 mt-1">방문 대비 구매</div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">실시간 매출 추이 (5초 갱신)</h3>
        <div style={{ height: '200px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">실시간 인기 상품 TOP 5</h3>
        <div className="space-y-2">
          {metrics.topProducts.slice(0, 5).map((product, index) => (
            <div
              key={product.productId}
              className="flex items-center justify-between bg-white/5 rounded-lg p-3"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl font-bold opacity-50">#{index + 1}</div>
                <div>
                  <div className="font-medium">{product.productName}</div>
                  <div className="text-sm opacity-60">
                    판매량: {product.salesCount}개
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  {(product.revenue / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs opacity-60">매출</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="mt-6 text-center text-sm opacity-60">
        마지막 업데이트: {new Date(metrics.timestamp).toLocaleString('ko-KR')}
        <br />
        Powered by Kafka Streams + SSE
      </div>
    </div>
  );
}
