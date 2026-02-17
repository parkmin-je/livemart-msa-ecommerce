'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productApi, reviewApi } from '@/api/productApi';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categoryId: number;
  categoryName: string;
  sellerId: number;
  imageUrl?: string;
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
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  ratingDistribution: Record<number, number>;
}

function StarRating({ rating, onRate, interactive = false }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          className={`text-xl ${interactive ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'} ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', content: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadProduct();
    loadReviews();
    loadRelated();
  }, [productId]);

  const loadRelated = async () => {
    try {
      const data = await productApi.getProducts({ page: 0, size: 20 });
      const all: Product[] = data.content || [];
      setRelatedProducts(all.filter((p: Product) => p.id !== productId).slice(0, 4));
    } catch {
      // optional
    }
  };

  const loadProduct = async () => {
    try {
      const data = await productApi.getProduct(productId);
      setProduct(data);
    } catch {
      toast.error('상품 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const [reviewData, summaryData] = await Promise.all([
        reviewApi.getReviews(productId).catch(() => ({ content: [] })),
        reviewApi.getReviewSummary(productId).catch(() => null),
      ]);
      setReviews(reviewData.content || []);
      setSummary(summaryData);
    } catch {
      // reviews are optional
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
    });
    toast.success(`${product.name}이(가) 장바구니에 추가되었습니다.`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/orders');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) {
      toast.error('리뷰 내용을 입력해주세요.');
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewApi.createReview(productId, {
        userId: 1,
        rating: reviewForm.rating,
        content: reviewForm.content,
        title: reviewForm.title,
      });
      toast.success('리뷰가 등록되었습니다.');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', content: '' });
      loadReviews();
    } catch {
      toast.error('리뷰 등록에 실패했습니다.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleHelpful = async (reviewId: number) => {
    try {
      await reviewApi.markHelpful(productId, reviewId);
      loadReviews();
    } catch {
      // silent
    }
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

  const inStock = product.stockQuantity > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">상품</a>
              <a href="/cart" className="text-sm text-gray-700 hover:text-blue-600">장바구니</a>
              <a href="/my-orders" className="text-sm text-gray-700 hover:text-blue-600">내 주문</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-blue-600">홈</a>
          <span className="mx-2">/</span>
          <a href="/products" className="hover:text-blue-600">상품</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-[500px] object-cover" />
            ) : (
              <div className="w-full h-[500px] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-8xl">📦</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {product.categoryName && (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {product.categoryName}
              </span>
            )}
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

            {summary && (
              <div className="flex items-center gap-3">
                <StarRating rating={Math.round(summary.averageRating)} />
                <span className="text-gray-600">
                  {summary.averageRating?.toFixed(1)} ({summary.totalCount}개 리뷰)
                </span>
              </div>
            )}

            <div className="text-4xl font-bold text-blue-600">
              {product.price?.toLocaleString()}원
            </div>

            <div className="flex items-center gap-2">
              {inStock ? (
                <>
                  <span className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-green-700 font-medium">재고 {product.stockQuantity}개</span>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-red-700 font-medium">품절</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">수량</span>
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                >-</button>
                <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                >+</button>
              </div>
              <span className="text-gray-500 text-sm">
                합계: {(product.price * quantity).toLocaleString()}원
              </span>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="flex-1 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                장바구니 담기
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!inStock}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                바로 구매
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>🚚</span><span>무료 배송</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔄</span><span>7일 이내 반품 가능</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🛡️</span><span>안전 결제 보장</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-3 font-medium transition ${
                activeTab === 'description'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              상품 설명
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 font-medium transition ${
                activeTab === 'reviews'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              리뷰 ({summary?.totalCount || reviews.length})
            </button>
          </div>
        </div>

        {activeTab === 'description' ? (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {product.description || '상품 설명이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {summary && (
              <div className="bg-white rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{summary.averageRating?.toFixed(1)}</div>
                    <StarRating rating={Math.round(summary.averageRating)} />
                    <div className="text-sm text-gray-500 mt-1">{summary.totalCount}개 리뷰</div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = summary.ratingDistribution?.[star] || 0;
                      const pct = summary.totalCount > 0 ? (count / summary.totalCount) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-sm w-8 text-gray-500">{star}점</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-gray-500 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                {showReviewForm ? '취소' : '리뷰 작성'}
              </button>
            </div>

            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold">리뷰 작성</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">평점</label>
                  <StarRating
                    rating={reviewForm.rating}
                    onRate={(r) => setReviewForm({ ...reviewForm, rating: r })}
                    interactive
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="리뷰 제목 (선택)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">내용 *</label>
                  <textarea
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    rows={4}
                    required
                    placeholder="상품 사용 후기를 작성해주세요"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 transition"
                >
                  {submittingReview ? '등록 중...' : '리뷰 등록'}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-500">
                아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          {review.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-medium">{review.userName || '사용자'}</div>
                          <div className="text-xs text-gray-400">{formatDate(review.createdAt)}</div>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    {review.title && <h4 className="font-semibold mb-1">{review.title}</h4>}
                    <p className="text-gray-700">{review.content}</p>
                    <button
                      onClick={() => handleHelpful(review.id)}
                      className="mt-3 text-sm text-gray-500 hover:text-blue-600 transition"
                    >
                      👍 도움이 됐어요 ({review.helpfulCount || 0})
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">관련 상품</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((rp) => (
                <a key={rp.id} href={`/products/${rp.id}`} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition group">
                  <div className="h-40 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                    {rp.imageUrl ? (
                      <img src={rp.imageUrl} alt={rp.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl group-hover:scale-110 transition">&#x1F4E6;</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{rp.name}</h3>
                    <div className="text-blue-600 font-bold mt-1">{rp.price?.toLocaleString()}원</div>
                    {rp.stockQuantity === 0 && <span className="text-xs text-red-500">품절</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
