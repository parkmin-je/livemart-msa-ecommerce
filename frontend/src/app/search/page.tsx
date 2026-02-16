'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { productApi, searchApi } from '@/api/productApi';
import { ProductCard } from '@/components/ProductCard';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  category?: string;
}

const CATEGORIES = ['ELECTRONICS', 'FASHION', 'FOOD', 'HOME', 'BEAUTY', 'SPORTS', 'GENERAL'];
const CATEGORY_LABELS: Record<string, string> = {
  ELECTRONICS: '전자제품',
  FASHION: '패션',
  FOOD: '식품',
  HOME: '홈/리빙',
  BEAUTY: '뷰티',
  SPORTS: '스포츠',
  GENERAL: '기타',
};

type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filters
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('relevance');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [totalResults, setTotalResults] = useState(0);

  const doSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setTotalResults(0);
      return;
    }
    setLoading(true);
    try {
      const result = await productApi.searchProducts(searchQuery);
      let items: Product[] = result.content || result || [];

      // Client-side filtering
      if (category) {
        items = items.filter(p => p.category === category);
      }
      if (priceMin) {
        items = items.filter(p => p.price >= parseInt(priceMin));
      }
      if (priceMax) {
        items = items.filter(p => p.price <= parseInt(priceMax));
      }

      // Sorting
      if (sortBy === 'price_asc') {
        items.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price_desc') {
        items.sort((a, b) => b.price - a.price);
      }

      setProducts(items);
      setTotalResults(items.length);
    } catch {
      setProducts([]);
      setTotalResults(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (query === initialQuery) return;
    const timer = setTimeout(() => {
      if (query.trim()) doSearch(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, category, sortBy, priceMin, priceMax]);

  // Autocomplete
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await searchApi.autocomplete(query);
        setSuggestions(Array.isArray(result) ? result : result.suggestions || []);
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    doSearch(query);
    setShowSuggestions(false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="text-2xl font-bold text-blue-600">LiveMart</a>
            <nav className="flex items-center space-x-4">
              <a href="/products" className="text-sm text-gray-700 hover:text-blue-600">전체 상품</a>
              <a href="/cart" className="text-sm text-gray-700 hover:text-blue-600">장바구니</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="상품 검색..."
              className="w-full px-6 py-4 text-lg border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-600"
            />
            <button type="submit" className="absolute right-3 top-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">검색</button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button key={i} className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm" onMouseDown={() => { setQuery(s); setShowSuggestions(false); router.push(`/search?q=${encodeURIComponent(s)}`); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">필터</h3>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">카테고리</h4>
                <div className="space-y-2">
                  <button onClick={() => setCategory('')} className={`block text-sm w-full text-left px-2 py-1 rounded ${!category ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>전체</button>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} className={`block text-sm w-full text-left px-2 py-1 rounded ${category === cat ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>{CATEGORY_LABELS[cat]}</button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">가격 범위</h4>
                <div className="flex gap-2">
                  <input type="number" placeholder="최소" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                  <span className="text-gray-400">~</span>
                  <input type="number" placeholder="최대" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">정렬</h4>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="w-full px-2 py-1 text-sm border rounded">
                  <option value="relevance">관련도순</option>
                  <option value="price_asc">낮은 가격순</option>
                  <option value="price_desc">높은 가격순</option>
                  <option value="newest">최신순</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {query && (
              <div className="mb-4 text-sm text-gray-500">
                &quot;{query}&quot; 검색 결과 <strong>{totalResults}</strong>건
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-lg mb-4" />
                    <div className="bg-gray-200 h-4 rounded mb-2" />
                    <div className="bg-gray-200 h-4 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">&#x1F50D;</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {query ? '검색 결과가 없습니다' : '검색어를 입력해주세요'}
                </h2>
                <p className="text-gray-500">다른 키워드로 검색해보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
