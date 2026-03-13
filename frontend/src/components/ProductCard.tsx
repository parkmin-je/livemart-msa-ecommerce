'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description?: string;
    price: number;
    stockQuantity?: number;
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating}점`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${
            star <= Math.floor(rating)
              ? 'text-amber-400'
              : star - 0.5 <= rating
              ? 'text-amber-300'
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

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <svg className="w-12 h-12 text-gray-250" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        style={{ color: '#d1d5db' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addItem);
  const [imageError, setImageError] = React.useState(false);
  const [wishlisted, setWishlisted] = React.useState(false);

  const discountRate = getDiscountRate(product.id);
  const originalPrice = getOriginalPrice(product.price, discountRate);
  const rating = getRating(product.id);
  const reviewCount = getReviewCount(product.id);
  const isOutOfStock = (product.stockQuantity ?? 1) === 0;
  const isLowStock = (product.stockQuantity ?? 1) > 0 && (product.stockQuantity ?? 1) < 10;
  const isFreeShipping = product.price >= 50000;

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
    toast.success('장바구니에 추가됐습니다', { duration: 1500 });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlisted(w => !w);
    toast.success(wishlisted ? '위시리스트에서 제거됐습니다' : '위시리스트에 추가됐습니다', { duration: 1500 });
  };

  return (
    <div
      className="bg-white border border-gray-100 hover:border-gray-200 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-md"
      style={{ willChange: 'transform' }}
      onClick={() => router.push(`/products/${product.id}`)}
    >
      {/* Image area */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.imageUrl && !imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountRate > 0 && (
            <span className="bg-red-600 text-white text-[11px] font-black px-1.5 py-0.5 leading-tight">
              -{discountRate}%
            </span>
          )}
          {isLowStock && (
            <span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 leading-tight">
              {product.stockQuantity}개 남음
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 tracking-wider uppercase">
              품절
            </span>
          </div>
        )}

        {/* Wishlist button — visible on hover */}
        <button
          className="absolute top-2 right-2 w-7 h-7 bg-white border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-red-300"
          onClick={handleWishlist}
          aria-label={wishlisted ? '위시리스트에서 제거' : '위시리스트에 추가'}
        >
          <svg
            className={`w-4 h-4 transition-colors ${wishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 fill-none'}`}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={wishlisted ? 0 : 1.8}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* Product info */}
      <div className="p-3.5 flex flex-col flex-1">
        {product.category && (
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">
            {product.category}
          </span>
        )}

        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 leading-snug flex-1 word-break-keep-all">
          {product.name}
        </h3>

        {/* Star rating */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <StarRating rating={rating} />
          <span className="text-xs text-gray-700 font-medium">{rating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({reviewCount.toLocaleString()})</span>
        </div>

        {/* Price block */}
        <div className="mb-2.5">
          {discountRate > 0 && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-bold text-red-600">{discountRate}%</span>
              <span className="text-xs text-gray-400 line-through tabular-nums">
                {originalPrice.toLocaleString()}원
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-black text-gray-950 tabular-nums leading-none">
              {product.price.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 mb-0.5">원</span>
          </div>
        </div>

        {/* Shipping info */}
        <div className="mb-3 flex items-center gap-2 min-h-[16px]">
          {isFreeShipping ? (
            <span className="text-[11px] text-blue-600 font-semibold">무료배송</span>
          ) : (
            <span className="text-[11px] text-gray-400">배송비 3,000원</span>
          )}
          {product.stockQuantity !== undefined && product.stockQuantity > 10 && (
            <span className="text-[10px] text-gray-400">{(product.stockQuantity * 3 + product.id * 7).toLocaleString()}명 구매</span>
          )}
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-2.5 text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]'
          }`}
        >
          {isOutOfStock ? (
            '품절'
          ) : (
            <>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              장바구니 담기
            </>
          )}
        </button>
      </div>
    </div>
  );
}
