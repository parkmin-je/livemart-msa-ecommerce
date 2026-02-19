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
    const response = await apiClient.get('/api/products', { params });
    return response.data;
  },

  // 상품 상세 조회
  getProduct: async (id: number) => {
    const response = await apiClient.get(`/api/products/${id}`);
    return response.data;
  },

  // Elasticsearch 검색
  searchProducts: async (keyword: string) => {
    const response = await apiClient.get('/api/products/search', {
      params: { keyword },
    });
    return response.data;
  },

  // 추천 상품 (AI 기반)
  getRecommendations: async (userId: number) => {
    const response = await apiClient.get(`/api/recommendations/user/${userId}`);
    return response.data;
  },
};

export const orderApi = {
  // 주문 생성
  createOrder: async (data: {
    userId: number;
    items: Array<{ productId: number; quantity: number }>;
    deliveryAddress: string;
    phoneNumber: string;
    orderNote?: string;
    paymentMethod: string;
  }) => {
    const response = await apiClient.post('/api/orders', data);
    return response.data;
  },

  // 주문 목록 조회
  getOrders: async (userId: number, params?: { page?: number; size?: number }) => {
    const response = await apiClient.get(`/api/orders/user/${userId}`, { params });
    return response.data;
  },

  // 주문 상세 조회
  getOrder: async (orderId: number) => {
    const response = await apiClient.get(`/api/orders/${orderId}`);
    return response.data;
  },

  // 주문 번호로 조회
  getOrderByNumber: async (orderNumber: string) => {
    const response = await apiClient.get(`/api/orders/number/${orderNumber}`);
    return response.data;
  },

  // 주문 확인
  confirmOrder: async (orderId: number) => {
    const response = await apiClient.post(`/api/orders/${orderId}/confirm`);
    return response.data;
  },

  // 주문 취소
  cancelOrder: async (orderId: number, reason: string) => {
    const response = await apiClient.post(`/api/orders/${orderId}/cancel`, null, {
      params: { reason },
    });
    return response.data;
  },

  // 배송 시작
  shipOrder: async (orderId: number) => {
    const response = await apiClient.post(`/api/orders/${orderId}/ship`);
    return response.data;
  },

  // 배송 완료
  deliverOrder: async (orderId: number) => {
    const response = await apiClient.post(`/api/orders/${orderId}/deliver`);
    return response.data;
  },
};

export const authApi = {
  // 회원가입
  signup: async (data: {
    email: string;
    password: string;
    name: string;
    phoneNumber?: string;
  }) => {
    const response = await apiClient.post('/api/users/signup', data);
    return response.data;
  },

  // 로그인
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/users/login', {
      email,
      password,
    });
    return response.data;
  },

  // 토큰 갱신
  refresh: async (refreshToken: string) => {
    const response = await apiClient.post('/api/users/refresh', {
      refreshToken,
    });
    return response.data;
  },

  // 로그아웃
  logout: async () => {
    const response = await apiClient.post('/api/users/logout');
    return response.data;
  },

  // 내 정보 조회
  getMyProfile: async () => {
    const response = await apiClient.get('/api/users/me');
    return response.data;
  },

  // 사용자 조회
  getUserById: async (userId: number) => {
    const response = await apiClient.get(`/api/users/${userId}`);
    return response.data;
  },
};

export const paymentApi = {
  // 결제 처리
  processPayment: async (data: {
    orderNumber: string;
    userId: number;
    amount: number;
    method: string;
    cardNumber?: string;
  }) => {
    // Transform frontend field names to match backend expectations
    const requestData = {
      orderNumber: data.orderNumber,
      userId: data.userId,
      amount: data.amount,
      paymentMethod: data.method,  // method -> paymentMethod
      cardToken: data.cardNumber,  // cardNumber -> cardToken
    };
    const response = await apiClient.post('/api/v1/payments', requestData);
    return response.data;
  },

  // 결제 취소
  cancelPayment: async (transactionId: string) => {
    const response = await apiClient.post(`/api/v1/payments/${transactionId}/cancel`);
    return response.data;
  },

  // 주문번호로 결제 조회
  getPaymentByOrderNumber: async (orderNumber: string) => {
    const response = await apiClient.get(`/api/v1/payments/order/${orderNumber}`);
    return response.data;
  },
};

// 리뷰 API
export const reviewApi = {
  getReviews: async (productId: number, page = 0, size = 10) => {
    const response = await apiClient.get(`/api/products/${productId}/reviews`, {
      params: { page, size },
    });
    return response.data;
  },

  getReviewSummary: async (productId: number) => {
    const response = await apiClient.get(`/api/products/${productId}/reviews/summary`);
    return response.data;
  },

  createReview: async (productId: number, data: {
    userId: number;
    rating: number;
    content: string;
    title?: string;
  }) => {
    const response = await apiClient.post(`/api/products/${productId}/reviews`, data);
    return response.data;
  },

  deleteReview: async (productId: number, reviewId: number, userId: number) => {
    const response = await apiClient.delete(`/api/products/${productId}/reviews/${reviewId}`, {
      params: { userId },
    });
    return response.data;
  },

  markHelpful: async (productId: number, reviewId: number) => {
    const response = await apiClient.post(`/api/products/${productId}/reviews/${reviewId}/helpful`);
    return response.data;
  },
};

// 반품/환불 API
export const returnApi = {
  createReturn: async (data: {
    orderId: number;
    userId: number;
    reason: string;
    type: string;
  }) => {
    const response = await apiClient.post('/api/returns', data);
    return response.data;
  },

  getReturn: async (returnId: number) => {
    const response = await apiClient.get(`/api/returns/${returnId}`);
    return response.data;
  },

  getUserReturns: async (userId: number, page = 0, size = 10) => {
    const response = await apiClient.get(`/api/returns/user/${userId}`, {
      params: { page, size },
    });
    return response.data;
  },
};

// 배송 추적 API
export const deliveryApi = {
  getDeliveryInfo: async (trackingNumber: string) => {
    const response = await apiClient.get(`/api/delivery/${trackingNumber}`);
    return response.data;
  },

  createTracking: async (orderId: number, courierCompany = 'CJ대한통운') => {
    const response = await apiClient.post(`/api/delivery/${orderId}`, null, {
      params: { courierCompany },
    });
    return response.data;
  },
};

// 장바구니 백엔드 API
export const cartApi = {
  getCart: async (userId: number) => {
    const response = await apiClient.get(`/api/users/${userId}/cart`);
    return response.data;
  },

  addToCart: async (userId: number, data: { productId: number; quantity: number }) => {
    const response = await apiClient.post(`/api/users/${userId}/cart`, data);
    return response.data;
  },

  updateQuantity: async (userId: number, productId: number, quantity: number) => {
    const response = await apiClient.put(`/api/users/${userId}/cart/${productId}`, null, {
      params: { quantity },
    });
    return response.data;
  },

  removeFromCart: async (userId: number, productId: number) => {
    const response = await apiClient.delete(`/api/users/${userId}/cart/${productId}`);
    return response.data;
  },

  clearCart: async (userId: number) => {
    const response = await apiClient.delete(`/api/users/${userId}/cart`);
    return response.data;
  },
};

// 쿠폰 API
export const couponApi = {
  getActiveCoupons: async (page = 0, size = 10) => {
    const response = await apiClient.get('/api/coupons', {
      params: { page, size },
    });
    return response.data;
  },

  getCoupon: async (code: string) => {
    const response = await apiClient.get(`/api/coupons/${code}`);
    return response.data;
  },

  previewDiscount: async (code: string, orderAmount: number) => {
    const response = await apiClient.get(`/api/coupons/${code}/preview`, {
      params: { orderAmount },
    });
    return response.data;
  },
};

// 검색 자동완성 API
export const searchApi = {
  autocomplete: async (keyword: string) => {
    const response = await apiClient.get('/api/products/search/autocomplete', {
      params: { keyword },
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
