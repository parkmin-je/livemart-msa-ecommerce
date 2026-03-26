'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/api/productApi';
import { ProductCard } from './ProductCard';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  category?: string;
  categoryName?: string;
  categoryId?: number;
}

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'name';

const SORT_OPTIONS = [
  { value: 'default', label: '기본순' },
  { value: 'price_asc', label: '낮은 가격순' },
  { value: 'price_desc', label: '높은 가격순' },
  { value: 'name', label: '상품명순' },
];

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const arr = [...products];
  if (sort === 'price_asc') return arr.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') return arr.sort((a, b) => b.price - a.price);
  if (sort === 'name') return arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return arr;
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
      <div
        className="aspect-square"
        style={{
          background: 'linear-gradient(90deg, #F0EEE7 0%, #E8E5DB 45%, #F0EEE7 100%)',
          backgroundSize: '600px 100%',
          animation: 'shimmer 1.8s ease-in-out infinite',
        }}
      />
      <div className="p-3 space-y-2">
        <div className="h-2.5 animate-pulse" style={{ background: '#EDEBE4', width: '30%' }} />
        <div className="h-3.5 animate-pulse" style={{ background: '#EDEBE4' }} />
        <div className="h-3.5 animate-pulse" style={{ background: '#EDEBE4', width: '75%' }} />
        <div className="h-6 animate-pulse mt-2" style={{ background: '#EDEBE4', width: '40%' }} />
        <div className="h-9 animate-pulse mt-2" style={{ background: '#EDEBE4' }} />
      </div>
    </div>
  );
}

interface ProductListProps {
  categoryId?: number;
  initialKeyword?: string;
  pageSize?: number;
}

export function ProductList({ categoryId, initialKeyword = '', pageSize = 12 }: ProductListProps) {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, categoryId, pageSize],
    queryFn: () => {
      if (categoryId) {
        return fetch(`/api/products/category/${categoryId}?page=${page}&size=${pageSize}`, { credentials: 'include' })
          .then(r => r.json())
          .then(d => ({ content: d.content || d, totalPages: d.totalPages || 1, totalElements: d.totalElements || 0 }));
      }
      return productApi.getProducts({ page, size: pageSize });
    },
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });

  const rawProducts: Product[] = (data?.content || []).map((p: Product) => ({
    ...p,
    category: p.category || p.categoryName,
  }));
  const products = sortProducts(rawProducts, sortBy);
  const totalPages = data?.totalPages || 1;
  const totalElements = data?.totalElements || 0;

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: pageSize }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-center py-16"
        style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
      >
        <div className="flex justify-center mb-4">
          <svg className="w-14 h-14" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <p className="font-medium mb-2" style={{ color: 'rgba(14,14,14,0.65)' }}>상품을 불러오지 못했습니다</p>
        <p className="text-sm mb-6" style={{ color: 'rgba(14,14,14,0.38)' }}>잠시 후 다시 시도해주세요</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: '#0A0A0A' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 정렬/뷰 컨트롤 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'rgba(14,14,14,0.4)' }}>
          총 <span className="font-semibold" style={{ color: '#0E0E0E' }}>{totalElements.toLocaleString()}</span>개 상품
        </p>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm px-3 py-1.5 focus:outline-none cursor-pointer"
            style={{
              border: '1px solid rgba(14,14,14,0.14)',
              background: '#FFFFFF',
              color: 'rgba(14,14,14,0.7)',
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex overflow-hidden" style={{ border: '1px solid rgba(14,14,14,0.14)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="p-1.5 transition-colors"
              style={{
                background: viewMode === 'grid' ? '#E8001D' : '#FFFFFF',
                color: viewMode === 'grid' ? '#FFFFFF' : 'rgba(14,14,14,0.4)',
              }}
              aria-label="그리드 뷰"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-1.5 transition-colors"
              style={{
                background: viewMode === 'list' ? '#E8001D' : '#FFFFFF',
                color: viewMode === 'list' ? '#FFFFFF' : 'rgba(14,14,14,0.4)',
                borderLeft: '1px solid rgba(14,14,14,0.1)',
              }}
              aria-label="리스트 뷰"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 상품 그리드 */}
      {products.length === 0 ? (
        <div
          className="text-center py-20"
          style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
        >
          <div className="flex justify-center mb-4">
            <svg className="w-14 h-14" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <p className="font-medium text-lg mb-2" style={{ color: 'rgba(14,14,14,0.65)' }}>상품이 없습니다</p>
          <p className="text-sm" style={{ color: 'rgba(14,14,14,0.38)' }}>다른 카테고리를 선택하거나 검색어를 바꿔보세요</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <ListProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="w-9 h-9 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.45)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const pageNum = Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className="w-9 h-9 text-sm font-medium transition-colors"
                style={{
                  background: page === pageNum ? '#E8001D' : '#FFFFFF',
                  color: page === pageNum ? '#FFFFFF' : 'rgba(14,14,14,0.55)',
                  border: page === pageNum ? '1px solid #E8001D' : '1px solid rgba(14,14,14,0.14)',
                }}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="w-9 h-9 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.45)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function ListProductCard({ product }: { product: Product }) {
  const addToCart = useCartStore((state) => state.addItem);
  const router = useRouter();

  return (
    <div
      className="p-4 flex gap-4 cursor-pointer group transition-colors"
      style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
      onClick={() => router.push(`/products/${product.id}`)}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.18)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.07)')}
    >
      <div
        className="w-24 h-24 overflow-hidden flex-shrink-0"
        style={{ background: '#F5F4F0' }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {product.category && (
          <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(14,14,14,0.35)' }}>
            {product.category}
          </span>
        )}
        <h3 className="font-medium line-clamp-2 mt-0.5" style={{ color: '#0E0E0E', fontSize: '13.5px' }}>
          {product.name}
        </h3>
        <p className="text-sm line-clamp-1 mt-1" style={{ color: 'rgba(14,14,14,0.4)' }}>{product.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-baseline gap-0.5">
            <span className="font-bebas tabular-nums" style={{ fontSize: '1.3rem', color: '#0E0E0E', letterSpacing: '0.01em' }}>
              {product.price.toLocaleString()}
            </span>
            <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>원</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart({ productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.imageUrl });
              toast.success('장바구니에 추가됐습니다!', { duration: 1500 });
            }}
            className="px-4 py-2 text-xs font-bold text-white uppercase tracking-wider transition-colors"
            style={{ background: '#0A0A0A' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E8001D')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
          >
            담기
          </button>
        </div>
      </div>
    </div>
  );
}
