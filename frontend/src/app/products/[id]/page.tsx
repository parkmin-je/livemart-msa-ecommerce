'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  categoryName?: string;
  sellerId: number;
  createdAt: string;
}

interface Review {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  title: string;
  content: string;
  helpfulCount: number;
  verified: boolean;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  ratingDistribution: Record<number, number>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/products/${productId}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/products/${productId}/reviews?page=0&size=10`).then(r => r.json()).catch(() => ({ content: [] })),
      fetch(`${API_BASE}/api/products/${productId}/reviews/summary`).then(r => r.json()).catch(() => null),
    ]).then(([prod, rev, sum]) => {
      setProduct(prod);
      setReviews(rev?.content || []);
      setSummary(sum);
      setLoading(false);
    });
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
    });
    alert(`${product.name} ${quantity}개가 장바구니에 추가되었습니다.`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">상품을 찾을 수 없습니다</h2>
          <button onClick={() => router.push('/products')} className="text-blue-600 hover:underline">
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">상품 목록</a>
              <a href="/cart" className="text-sm text-gray-700 hover:text-blue-600">장바구니</a>
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-blue-600">홈</a>
          <span className="mx-2">/</span>
          <a href="/products" className="hover:text-blue-600">상품</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        {/* Product Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Image */}
          <div>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full rounded-xl shadow-lg" />
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-8xl">📦</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {product.categoryName && (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full mb-3">
                {product.categoryName}
              </span>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            {summary && summary.totalCount > 0 && (
              <div className="flex items-center mb-4">
                <div className="flex text-lg">{renderStars(Math.round(summary.averageRating))}</div>
                <span className="ml-2 text-gray-600">{summary.averageRating}</span>
                <span className="ml-1 text-gray-400">({summary.totalCount}개 리뷰)</span>
              </div>
            )}

            <div className="text-4xl font-bold text-blue-600 mb-6">
              ₩{product.price.toLocaleString()}
            </div>

            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                product.stockQuantity > 10
                  ? 'bg-green-100 text-green-800'
                  : product.stockQuantity > 0
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.stockQuantity > 10 ? '재고 충분' : product.stockQuantity > 0 ? `남은 수량: ${product.stockQuantity}` : '품절'}
              </span>
            </div>

            {product.stockQuantity > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >-</button>
                  <span className="px-4 py-2 font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >+</button>
                </div>
                <span className="text-gray-500 text-sm">
                  합계: ₩{(product.price * quantity).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stockQuantity <= 0}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                장바구니 담기
              </button>
              <button
                onClick={() => { handleAddToCart(); router.push('/cart'); }}
                disabled={product.stockQuantity <= 0}
                className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                바로 구매
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-4 text-lg font-medium border-b-2 transition ${
                activeTab === 'description' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              상품 설명
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-lg font-medium border-b-2 transition ${
                activeTab === 'reviews' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              리뷰 ({summary?.totalCount || 0})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'description' && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Rating Summary */}
            {summary && (
              <div className="bg-white rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{summary.averageRating || 0}</div>
                    <div className="flex text-xl mt-2">{renderStars(Math.round(summary.averageRating))}</div>
                    <div className="text-gray-500 mt-1">{summary.totalCount}개 리뷰</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = summary.ratingDistribution[star] || 0;
                      const pct = summary.totalCount > 0 ? (count / summary.totalCount) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-sm w-8">{star}점</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-yellow-400 rounded-full h-2" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-gray-500 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Review List */}
            {reviews.map(review => (
              <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{review.userName}</span>
                    {review.verified && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">구매 인증</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
                <div className="flex text-sm mb-2">{renderStars(review.rating)}</div>
                <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                <p className="text-gray-600 text-sm">{review.content}</p>
                <div className="mt-3 text-xs text-gray-400">
                  도움됨 {review.helpfulCount}
                </div>
              </div>
            ))}

            {reviews.length === 0 && (
              <div className="text-center py-12 text-gray-500">아직 리뷰가 없습니다. 첫 리뷰를 작성해 보세요!</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
