import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor (API Key, JWT 추가)
apiClient.interceptors.request.use(
  (config) => {
    // API Key 추가
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }

    // JWT 추가
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor (에러 처리)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const productApi = {
  // 상품 목록 조회
  getProducts: async (params: {
    page?: number;
    size?: number;
    search?: string;
    category?: string;
  }) => {
    const response = await apiClient.get('/api/v1/products', { params });
    return response.data;
  },

  // 상품 상세 조회
  getProduct: async (id: number) => {
    const response = await apiClient.get(`/api/v1/products/${id}`);
    return response.data;
  },

  // Elasticsearch 검색
  searchProducts: async (keyword: string) => {
    const response = await apiClient.get('/api/v1/products/search', {
      params: { keyword },
    });
    return response.data;
  },

  // 추천 상품 (AI 기반)
  getRecommendations: async (userId: number) => {
    const response = await apiClient.get(`/api/v1/recommendations/user/${userId}`);
    return response.data;
  },
};

export const orderApi = {
  // 주문 생성
  createOrder: async (data: {
    userId: number;
    items: Array<{ productId: number; quantity: number }>;
  }) => {
    const response = await apiClient.post('/api/v1/orders', data);
    return response.data;
  },

  // 주문 목록 조회
  getOrders: async (userId: number) => {
    const response = await apiClient.get(`/api/v1/orders/user/${userId}`);
    return response.data;
  },

  // 주문 상세 조회
  getOrder: async (orderId: number) => {
    const response = await apiClient.get(`/api/v1/orders/${orderId}`);
    return response.data;
  },
};

export const authApi = {
  // 로그인
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // 회원가입
  register: async (data: {
    email: string;
    password: string;
    name: string;
    phoneNumber?: string;
  }) => {
    const response = await apiClient.post('/api/v1/auth/register', data);
    return response.data;
  },

  // OAuth 로그인 (Google, Kakao, Naver)
  oauthLogin: async (provider: string, code: string) => {
    const response = await apiClient.post(`/api/v1/auth/oauth/${provider}`, {
      code,
    });
    return response.data;
  },
};

export const dashboardApi = {
  // 실시간 메트릭 조회 (REST)
  getMetrics: async () => {
    const response = await apiClient.get('/api/v1/dashboard/metrics');
    return response.data;
  },

  // SSE 연결은 EventSource 사용 (별도 처리)
};

export default apiClient;
