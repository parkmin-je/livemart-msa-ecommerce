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
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mt-3" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-9 bg-gray-200 rounded mt-2" />
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
        return fetch(`/api/products/category/${categoryId}?page=${page}&size=${pageSize}`)
          .then(r => r.json())
          .then(d => ({ content: d.content || d, totalPages: d.totalPages || 1, totalElements: d.totalElements || 0 }));
      }
      return productApi.getProducts({ page, size: pageSize });
    },
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });

  const rawProducts: Product[] = data?.content || [];
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
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <div className="flex justify-center mb-4"><svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <p className="text-gray-600 font-medium mb-2">상품을 불러오지 못했습니다</p>
        <p className="text-gray-400 text-sm mb-6">잠시 후 다시 시도해주세요</p>
        <button onClick={() => window.location.reload()} className="btn-primary btn-sm">다시 시도</button>
      </div>
    );
  }

  return (
    <div>
      {/* 정렬/뷰 컨트롤 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          총 <span className="font-semibold text-gray-900">{totalElements.toLocaleString()}</span>개 상품
        </p>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              aria-label="그리드 뷰"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-red-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
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
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <div className="flex justify-center mb-4"><svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div>
          <p className="text-gray-600 font-medium text-lg mb-2">상품이 없습니다</p>
          <p className="text-gray-400 text-sm">다른 카테고리를 선택하거나 검색어를 바꿔보세요</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
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
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-red-600 text-white border border-red-600'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
      className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow p-4 flex gap-4 cursor-pointer group"
      onClick={() => router.push(`/products/${product.id}`)}
    >
      <div className="w-28 h-28 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {product.category && <span className="text-xs text-gray-400">{product.category}</span>}
        <h3 className="font-medium text-gray-900 line-clamp-2 mt-0.5">{product.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-1 mt-1">{product.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-gray-900">{product.price.toLocaleString()}원</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart({ productId: product.id, name: product.name, price: product.price, quantity: 1, imageUrl: product.imageUrl });
              toast.success('장바구니에 추가됐습니다!', { duration: 1500 });
            }}
            className="btn-primary btn-sm"
          >
            장바구니 담기
          </button>
        </div>
      </div>
    </div>
  );
}

