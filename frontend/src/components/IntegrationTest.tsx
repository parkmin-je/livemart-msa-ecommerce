'use client';

import { useState } from 'react';
import { authApi, productApi, orderApi, paymentApi } from '@/api/productApi';
import toast from 'react-hot-toast';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export function IntegrationTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: '1. User Service: 회원가입', status: 'pending' },
    { name: '2. User Service: 로그인', status: 'pending' },
    { name: '3. User Service: 내 정보 조회', status: 'pending' },
    { name: '4. Product Service: 상품 목록 조회', status: 'pending' },
    { name: '5. Product Service: 상품 검색 (Elasticsearch)', status: 'pending' },
    { name: '6. Product Service: 상품 상세 조회', status: 'pending' },
    { name: '7. Order Service: 주문 생성 (Saga Pattern)', status: 'pending' },
    { name: '8. Payment Service: 결제 처리', status: 'pending' },
    { name: '9. Order Service: 주문 조회', status: 'pending' },
    { name: '10. Order Service: 주문 취소 (Compensation)', status: 'pending' },
  ]);

  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number>(-1);

  let testUserId: number;
  let testToken: string;
  let testProductId: number;
  let testOrderId: number;
  let testOrderNumber: string;

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((test, i) => (i === index ? { ...test, ...updates } : test))
    );
  };

  const runTest = async (index: number, testFn: () => Promise<void>) => {
    setCurrentTest(index);
    updateTest(index, { status: 'running' });
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, { status: 'success', duration, message: `성공 (${duration}ms)` });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const duration = Date.now() - startTime;
      updateTest(index, {
        status: 'error',
        duration,
        message: error.response?.data?.message || error.message || '실패',
      });
      throw error; // Re-throw to stop test execution
    }
  };

  const runAllTests = async () => {
    setRunning(true);

    const testEmail = `test-${Date.now()}@livemart.com`;
    const testPassword = 'testpass1234';

    try {
      // Test 1: User Signup
      await runTest(0, async () => {
        const response = await authApi.signup({
          email: testEmail,
          password: testPassword,
          name: '테스트 유저',
          phoneNumber: '010-1234-5678',
        });
        console.log('[Test 1] Signup response:', response);
      });

      // Wait between tests
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 2: User Login
      await runTest(1, async () => {
        const response = await authApi.login(testEmail, testPassword);
        testToken = response.accessToken;
        localStorage.setItem('token', testToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        console.log('[Test 2] Login response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 3: Get My Profile
      await runTest(2, async () => {
        const response = await authApi.getMyProfile();
        testUserId = response.id;
        localStorage.setItem('userId', testUserId.toString());
        console.log('[Test 3] Profile response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 4: Get Products
      await runTest(3, async () => {
        const response = await productApi.getProducts({ page: 0, size: 12 });
        if (response.content && response.content.length > 0) {
          testProductId = response.content[0].id;
        }
        console.log('[Test 4] Products response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 5: Search Products
      await runTest(4, async () => {
        const response = await productApi.searchProducts('테스트');
        console.log('[Test 5] Search response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 6: Get Product Detail
      await runTest(5, async () => {
        if (!testProductId) {
          testProductId = 1; // Fallback
        }
        const response = await productApi.getProduct(testProductId);
        console.log('[Test 6] Product detail response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 7: Create Order (Saga Pattern)
      await runTest(6, async () => {
        const response = await orderApi.createOrder({
          userId: testUserId || 1,
          items: [
            { productId: testProductId || 1, quantity: 2 },
          ],
          deliveryAddress: '서울시 강남구 테헤란로 123 테스트빌딩 456호',
          phoneNumber: '010-1234-5678',
          orderNote: 'Integration Test - 테스트 주문입니다',
          paymentMethod: 'CARD',
        });
        testOrderId = response.id;
        testOrderNumber = response.orderNumber;
        console.log('[Test 7] Order creation response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 8: Process Payment
      await runTest(7, async () => {
        const response = await paymentApi.processPayment({
          orderNumber: testOrderNumber,
          userId: testUserId || 1,
          amount: 50000,
          method: 'CARD',
          cardNumber: '1234-5678-9012-3456',
        });
        console.log('[Test 8] Payment response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 9: Get Order Detail
      await runTest(8, async () => {
        const response = await orderApi.getOrder(testOrderId);
        console.log('[Test 9] Order detail response:', response);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test 10: Cancel Order (Compensation)
      await runTest(9, async () => {
        const response = await orderApi.cancelOrder(testOrderId, 'Integration Test - 테스트 취소');
        console.log('[Test 10] Order cancellation response:', response);
      });

      toast.success('모든 테스트가 성공적으로 완료되었습니다! 🎉');
    } catch (error) {
      toast.error('테스트 중 오류가 발생했습니다.');
      console.error('Test failed:', error);
    } finally {
      setRunning(false);
      setCurrentTest(-1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏸️';
      case 'running':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏸️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'running':
        return 'text-blue-600 animate-pulse';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">🧪 MSA 통합 테스트</h1>
        <p className="text-gray-600 mb-6">
          모든 마이크로서비스의 기능을 자동으로 테스트합니다.
        </p>

        {/* Test Controls */}
        <div className="mb-6">
          <button
            onClick={runAllTests}
            disabled={running}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
              running
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {running ? '테스트 실행 중...' : '🚀 전체 테스트 실행'}
          </button>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg transition-all ${
                currentTest === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getStatusIcon(test.status)}</span>
                  <div>
                    <h3 className={`font-medium ${getStatusColor(test.status)}`}>
                      {test.name}
                    </h3>
                    {test.message && (
                      <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                    )}
                  </div>
                </div>
                {test.duration && (
                  <span className="text-sm text-gray-500">{test.duration}ms</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Architecture Info */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🏗️ 테스트하는 MSA 아키텍처</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">마이크로서비스</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• User Service (인증/인가)</li>
                <li>• Product Service (상품관리)</li>
                <li>• Order Service (주문관리)</li>
                <li>• Payment Service (결제처리)</li>
                <li>• Inventory Service (재고관리)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">패턴 & 기술</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Saga Pattern (분산 트랜잭션)</li>
                <li>• CQRS (Command Query Separation)</li>
                <li>• Event Sourcing (Kafka)</li>
                <li>• API Gateway (Spring Cloud Gateway)</li>
                <li>• Service Discovery (Eureka)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {tests.filter((t) => t.status === 'success').length}
            </div>
            <div className="text-sm text-green-700">성공</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {tests.filter((t) => t.status === 'error').length}
            </div>
            <div className="text-sm text-red-700">실패</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {tests.filter((t) => t.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-700">대기</div>
          </div>
        </div>
      </div>
    </div>
  );
}
