'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    stockQuantity: number;
    imageUrl?: string;
    category?: string;
    categoryId?: number;
    sellerId?: number;
  };
}

function getDiscountRate(productId: number): number {
  const rates = [0, 0, 5, 10, 10, 15, 15, 20, 20, 25, 30, 0, 10, 15];
  return rates[productId % rates.length];
}

function getOriginalPrice(price: number, discountRate: number): number {
  if (discountRate === 0) return price;
  return Math.round(price / (1 - discountRate / 100) / 100) * 100;
}

function getRating(productId: number): number {
  const ratings = [4.2, 4.5, 4.7, 4.8, 4.3, 4.6, 4.9, 4.4, 4.1, 4.7, 4.0, 4.8, 4.5, 4.2];
  return ratings[productId % ratings.length];
}

function getReviewCount(productId: number): number {
  const counts = [127, 2341, 89, 456, 1203, 78, 3421, 234, 567, 892, 45, 1823, 312, 78];
  return counts[productId % counts.length];
}

function getCategoryEmoji(category?: string): string {
  const map: Record<string, string> = {
    '전자기기': '📱', '패션': '👗', '식품': '🍎',
    '홈/리빙': '🏠', '뷰티': '💄', '스포츠': '⚽',
  };
  return map[category || ''] || '📦';
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating}점`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${
            star <= Math.floor(rating)
              ? 'text-yellow-400'
              : star - 0.5 <= rating
              ? 'text-yellow-300'
              : 'text-gray-200'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addItem);
  const [imageError, setImageError] = React.useState(false);

  const discountRate = getDiscountRate(product.id);
  const originalPrice = getOriginalPrice(product.price, discountRate);
  const rating = getRating(product.id);
  const reviewCount = getReviewCount(product.id);
  const isOutOfStock = product.stockQuantity === 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity < 10;
  const isFreeShipping = product.price >= 50000;
  const isRocket = product.price >= 100000;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
    toast.success('장바구니에 추가됐습니다!', { duration: 1500, icon: '🛒' });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('위시리스트에 추가됐습니다!', { duration: 1500, icon: '❤️' });
  };

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col"
      onClick={() => router.push(`/products/${product.id}`)}
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.imageUrl && !imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-gray-100 to-gray-200">
            {getCategoryEmoji(product.category)}
          </div>
        )}

        {/* 상단 배지 */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountRate > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-sm">
              {discountRate}% 할인
            </span>
          )}
          {isLowStock && (
            <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-sm">
              {product.stockQuantity}개 남음
            </span>
          )}
        </div>

        {/* 품절 오버레이 */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-black/70 text-white text-sm font-bold px-4 py-2 rounded-lg">
              품절
            </span>
          </div>
        )}

        {/* 찜하기 버튼 */}
        <button
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          onClick={handleWishlist}
          aria-label="위시리스트에 추가"
        >
          <svg className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* 상품 정보 */}
      <div className="p-3 flex flex-col flex-1">
        {/* 카테고리 */}
        {product.category && (
          <span className="text-xs text-gray-400 mb-1">{product.category}</span>
        )}

        {/* 상품명 */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 leading-snug flex-1">
          {product.name}
        </h3>

        {/* 평점 */}
        <div className="flex items-center gap-1.5 mb-2">
          <StarRating rating={rating} />
          <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({reviewCount.toLocaleString()})</span>
        </div>

        {/* 가격 */}
        <div className="mb-2">
          {discountRate > 0 && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-bold text-red-600">{discountRate}%</span>
              <span className="text-xs text-gray-400 line-through">{originalPrice.toLocaleString()}원</span>
            </div>
          )}
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-gray-900">{product.price.toLocaleString()}</span>
            <span className="text-sm text-gray-600">원</span>
          </div>
        </div>

        {/* 배송 정보 */}
        <div className="mb-3 min-h-[18px]">
          {isRocket ? (
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              🚀 <span>로켓배송</span>
              <span className="font-normal text-gray-500">· 무료배송</span>
            </span>
          ) : isFreeShipping ? (
            <span className="text-xs text-green-600 font-medium">무료배송</span>
          ) : (
            <span className="text-xs text-gray-400">배송비 3,000원</span>
          )}
        </div>

        {/* 장바구니 버튼 */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 active:scale-[0.98]'
          }`}
        >
          {isOutOfStock ? '품절' : '장바구니 담기'}
        </button>
      </div>
    </div>
  );
}
