'use client';

import { useState, useEffect } from 'react';
import { orderApi } from '@/api/productApi';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  productPrice: number;
  quantity: number;
  totalPrice: number;
}

interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  deliveryAddress: string;
  phoneNumber: string;
  orderNote?: string;
  paymentMethod: string;
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = typeof window !== 'undefined' ? parseInt(localStorage.getItem('userId') || '1') : 1;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderApi.getOrders(userId, { page: 0, size: 20 });
      setOrders(response.content || []);
    } catch (err: unknown) {
      console.error('Failed to fetch orders:', err);
      toast.error('주문 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('정말 주문을 취소하시겠습니까?')) {
      return;
    }

    try {
      await orderApi.cancelOrder(orderId, '고객 요청에 의한 취소');
      toast.success('주문이 취소되었습니다.');
      fetchOrders();
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Failed to cancel order:', error);
      toast.error(error.response?.data?.message || '주문 취소에 실패했습니다.');
    }
  };

  const handleConfirmOrder = async (orderId: number) => {
    try {
      await orderApi.confirmOrder(orderId);
      toast.success('주문이 확인되었습니다.');
      fetchOrders();
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error('Failed to confirm order:', error);
      toast.error(error.response?.data?.message || '주문 확인에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '주문 대기' },
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-800', label: '주문 확인' },
      SHIPPED: { bg: 'bg-purple-100', text: 'text-purple-800', label: '배송 중' },
      DELIVERED: { bg: 'bg-green-100', text: 'text-green-800', label: '배송 완료' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: '주문 취소' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin text-4xl">&#x23F3;</div>
          <p className="mt-4 text-gray-600">주문 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">내 주문 내역</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">주문 내역이 없습니다.</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            쇼핑 계속하기
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b">
                <div>
                  <h3 className="font-semibold text-lg">주문번호: {order.orderNumber}</h3>
                  <p className="text-sm text-gray-600">
                    주문일: {new Date(order.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="px-6 py-4">
                <div className="space-y-3">
                  {order.items?.map((item: OrderItem, idx: number) => (
                    <div key={idx} className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-2xl">
                        &#x1F4E6;
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productName || `상품 ID: ${item.productId}`}</h4>
                        <p className="text-sm text-gray-600">
                          {item.productPrice?.toLocaleString()}원 x {item.quantity}개
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {item.totalPrice?.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">배송지</p>
                    <p className="font-medium">{order.deliveryAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">연락처</p>
                    <p className="font-medium">{order.phoneNumber}</p>
                  </div>
                  {order.orderNote && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">주문 메모</p>
                      <p className="font-medium">{order.orderNote}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="font-semibold text-lg">총 결제 금액</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {order.totalAmount?.toLocaleString()}원
                  </span>
                </div>

                <div className="mt-4 flex space-x-2">
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleConfirmOrder(order.id)}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        주문 확인
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        주문 취소
                      </button>
                    </>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      주문 취소
                    </button>
                  )}
                  {order.status === 'DELIVERED' && (
                    <button className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      구매 확정
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
