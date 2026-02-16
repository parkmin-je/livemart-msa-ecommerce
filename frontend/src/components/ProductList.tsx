'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productApi, searchApi } from '@/api/productApi';
import { ProductCard } from './ProductCard';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  category?: string;
}

export function ProductList() {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce 검색어 (500ms 지연)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 자동완성
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await searchApi.autocomplete(searchQuery);
        setSuggestions(Array.isArray(result) ? result : result.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['products', page, debouncedSearch],
    queryFn: () => {
      // 검색어가 있으면 검색 API, 없으면 목록 API
      if (debouncedSearch && debouncedSearch.trim()) {
        return productApi.searchProducts(debouncedSearch).then(result => ({
          content: result.content || result,
          totalPages: result.totalPages || 1,
          totalElements: result.totalElements || (result.content?.length || 0),
        }));
      }
      return productApi.getProducts({ page, size: 12 });
    },
    staleTime: 30000, // 30초
    keepPreviousData: true, // 이전 데이터를 유지하면서 새 데이터 로드
  });

  const products = data?.content || [];

  // 초기 로딩 시에만 스켈레톤 표시
  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
            <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
            <div className="bg-gray-200 h-4 rounded mb-2"></div>
            <div className="bg-gray-200 h-4 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">상품을 불러오는데 실패했습니다.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar with Autocomplete */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="상품 검색... (Elasticsearch 실시간 검색)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <div className="absolute right-3 top-3 text-gray-400 flex items-center space-x-2">
            {isFetching && <div className="animate-spin">&#x23F3;</div>}
            <span>&#x1F50D;</span>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm transition-colors"
                  onMouseDown={() => {
                    setSearchQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  <span className="text-gray-400 mr-2">&#x1F50D;</span>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product: Product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            이전
          </button>

          <div className="flex space-x-1">
            {[...Array(Math.min(5, data.totalPages))].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`px-4 py-2 rounded-lg ${
                  page === i
                    ? 'bg-blue-600 text-white'
                    : 'border hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(Math.min(data.totalPages - 1, page + 1))}
            disabled={page >= data.totalPages - 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">상품이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
