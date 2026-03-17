'use client';

import React, { useState, useCallback } from 'react';
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

function getBadgeType(productId: number, discountRate: number): 'BEST' | 'NEW' | 'HOT' | null {
  if (discountRate >= 20) return null; // discount badge takes priority
  const types = [null, 'BEST', 'NEW', null, 'HOT', 'BEST', null, 'NEW', 'HOT', null, 'BEST', null, 'NEW', null] as const;
  return types[productId % types.length];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[2px]" aria-label={`${rating}점`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-[11px] h-[11px] ${
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

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 flex flex-col overflow-hidden">
      <div
        className="aspect-square bg-gray-100 relative overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 50%, #f0f0f0 100%)',
          backgroundSize: '600px 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }}
      />
      <div className="p-3.5 space-y-2.5">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-4/5" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2 mt-1" />
        <div className="h-8 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return <SkeletonCard />;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addItem);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistAnimating, setWishlistAnimating] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const discountRate = getDiscountRate(product.id);
  const originalPrice = getOriginalPrice(product.price, discountRate);
  const rating = getRating(product.id);
  const reviewCount = getReviewCount(product.id);
  const badgeType = getBadgeType(product.id, discountRate);
  const isOutOfStock = (product.stockQuantity ?? 1) === 0;
  const isLowStock = (product.stockQuantity ?? 1) > 0 && (product.stockQuantity ?? 1) < 10;
  const isFreeShipping = product.price >= 50000;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 1200);
    toast.success('장바구니에 추가됐습니다', { duration: 1500 });
  }, [isOutOfStock, product, addToCart]);

  const handleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlistAnimating(true);
    setTimeout(() => setWishlistAnimating(false), 400);
    setWishlisted(w => !w);
    toast.success(wishlisted ? '위시리스트에서 제거됐습니다' : '위시리스트에 추가됐습니다', { duration: 1400 });
  }, [wishlisted]);

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/products/${product.id}`);
  }, [product.id, router]);

  const badgeConfig = {
    BEST: { bg: '#1D4ED8', text: 'BEST', textColor: '#fff' },
    NEW: { bg: '#059669', text: 'NEW', textColor: '#fff' },
    HOT: { bg: '#EA580C', text: 'HOT', textColor: '#fff' },
  };

  return (
    <div
      className="bg-white border border-gray-100 transition-all duration-300 cursor-pointer group flex flex-col overflow-hidden"
      style={{
        willChange: 'transform',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/products/${product.id}`)}
    >
      {/* ── Image area ── */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {/* Skeleton shown while loading */}
        {!imageLoaded && !imageError && product.imageUrl && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, #f3f4f6 0%, #e9eaec 45%, #f3f4f6 100%)',
              backgroundSize: '600px 100%',
              animation: 'shimmer 1.6s ease-in-out infinite',
            }}
          />
        )}

        {product.imageUrl && !imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onLoad={() => setImageLoaded(true)}
            onError={() => { setImageError(true); setImageLoaded(true); }}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              opacity: imageLoaded ? 1 : 0,
              transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Quick view overlay — PC hover */}
        {!isOutOfStock && (
          <div
            className="absolute bottom-0 left-0 right-0 hidden lg:flex items-center justify-center gap-2 py-2.5"
            style={{
              background: 'rgba(9,9,11,0.88)',
              backdropFilter: 'blur(4px)',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.22,1,0.36,1)',
            }}
            onClick={handleQuickView}
          >
            <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <span className="text-white text-[11px] font-bold tracking-[0.15em] uppercase">
              빠른 보기
            </span>
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountRate > 0 && (
            <span
              className="text-white text-[11px] font-black px-1.5 py-0.5 leading-tight"
              style={{
                background: '#DC2626',
                animation: 'badgePop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both',
              }}
            >
              -{discountRate}%
            </span>
          )}
          {badgeType && !discountRate && (
            <span
              className="text-[11px] font-black px-1.5 py-0.5 leading-tight"
              style={{
                background: badgeConfig[badgeType].bg,
                color: badgeConfig[badgeType].textColor,
                animation: 'badgePop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both 0.05s',
              }}
            >
              {badgeConfig[badgeType].text}
            </span>
          )}
          {isLowStock && (
            <span
              className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 leading-tight"
              style={{ animation: 'badgePop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both 0.1s' }}
            >
              {product.stockQuantity}개 남음
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/65 flex items-center justify-center" style={{ backdropFilter: 'blur(2px)' }}>
            <span className="bg-gray-950 text-white text-[11px] font-black px-4 py-1.5 tracking-[0.2em] uppercase">
              품절
            </span>
          </div>
        )}

        {/* Wishlist button */}
        <button
          className="absolute top-2 right-2 w-[30px] h-[30px] bg-white flex items-center justify-center transition-all duration-200"
          style={{
            boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
            opacity: hovered || wishlisted ? 1 : 0,
            transform: wishlistAnimating ? 'scale(1.35)' : 'scale(1)',
            transition: 'opacity 0.2s ease, transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
          }}
          onClick={handleWishlist}
          aria-label={wishlisted ? '위시리스트에서 제거' : '위시리스트에 추가'}
        >
          {/* Ripple on click */}
          {wishlistAnimating && (
            <span
              className="absolute inset-0 rounded-full bg-red-100"
              style={{ animation: 'pingOnce 0.6s cubic-bezier(0,0,0.2,1) forwards' }}
            />
          )}
          <svg
            className="w-4 h-4 relative z-10 transition-colors duration-200"
            fill={wishlisted ? '#DC2626' : 'none'}
            stroke={wishlisted ? '#DC2626' : '#9CA3AF'}
            strokeWidth={wishlisted ? 0 : 1.8}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* ── Product info ── */}
      <div className="p-3.5 flex flex-col flex-1">
        {product.category && (
          <span className="text-[10px] text-gray-400 uppercase tracking-[0.14em] mb-1.5 font-medium">
            {product.category}
          </span>
        )}

        <h3 className="text-[13px] font-medium text-gray-900 line-clamp-2 mb-2 leading-snug flex-1"
          style={{ wordBreak: 'keep-all' }}>
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2">
          <StarRating rating={rating} />
          <span className="text-[11px] text-gray-700 font-semibold tabular-nums">{rating.toFixed(1)}</span>
          <span className="text-[11px] text-gray-400 tabular-nums">({reviewCount.toLocaleString()})</span>
        </div>

        {/* Price */}
        <div className="mb-2.5">
          {discountRate > 0 && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-black text-red-600">{discountRate}%</span>
              <span className="text-[11px] text-gray-400 line-through tabular-nums">
                {originalPrice.toLocaleString()}원
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-0.5">
            <span className="text-[17px] font-black text-gray-950 tabular-nums leading-none">
              {product.price.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 mb-0.5">원</span>
          </div>
        </div>

        {/* Meta row */}
        <div className="mb-3 flex items-center gap-2 min-h-[16px]">
          {isFreeShipping ? (
            <span className="text-[11px] text-blue-600 font-bold">무료배송</span>
          ) : (
            <span className="text-[11px] text-gray-400">배송비 3,000원</span>
          )}
          {product.stockQuantity !== undefined && product.stockQuantity > 10 && (
            <span className="text-[10px] text-gray-400">
              {(product.stockQuantity * 3 + product.id * 7).toLocaleString()}명 구매
            </span>
          )}
        </div>

        {/* Cart button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-2.5 text-[11px] font-black tracking-[0.1em] uppercase transition-all duration-200 flex items-center justify-center gap-1.5 overflow-hidden relative ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : cartAdded
              ? 'text-white'
              : 'text-white hover:opacity-90 active:scale-[0.97]'
          }`}
          style={{
            background: isOutOfStock
              ? undefined
              : cartAdded
              ? '#059669'
              : '#DC2626',
            transition: 'background 0.3s ease, transform 0.15s ease',
          }}
        >
          {isOutOfStock ? (
            '품절'
          ) : cartAdded ? (
            <>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              담김
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              장바구니
            </>
          )}
        </button>
      </div>
    </div>
  );
}
