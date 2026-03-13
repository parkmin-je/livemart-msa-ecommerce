'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { productApi } from '@/api/productApi';
import { ProductCard } from '@/components/ProductCard';
import { GlobalNav } from '@/components/GlobalNav';
import { CartSummary } from '@/components/CartSummary';

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

const CATS = [
  { id: '', label: '전체' },
  { id: '1', label: '전자기기' },
  { id: '2', label: '패션' },
  { id: '3', label: '식품' },
  { id: '4', label: '홈/리빙' },
  { id: '5', label: '뷰티' },
  { id: '6', label: '스포츠' },
];

type Sort = 'relevance' | 'price_asc' | 'price_desc' | 'rating';

const POPULAR_KEYWORDS = [
  '갤럭시 버즈', '나이키 운동화', '다이슨 청소기', '에어팟', '아이패드',
  '텀블러', '요가매트', '무선충전기', '커피머신', '레고',
];

const PRICE_RANGES = [
  { label: '1만원 이하', min: 0, max: 10000 },
  { label: '1~3만원', min: 10000, max: 30000 },
  { label: '3~10만원', min: 30000, max: 100000 },
  { label: '10만원 이상', min: 100000, max: 0 },
];

function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-2.5 bg-gray-100 rounded-sm w-1/4" />
        <div className="h-3.5 bg-gray-100 rounded-sm" />
        <div className="h-3.5 bg-gray-100 rounded-sm w-2/3" />
        <div className="h-9 bg-gray-100 rounded-sm mt-4" />
      </div>
    </div>
  );
}

function EmptyState({ query, onKeyword }: { query: string; onKeyword: (kw: string) => void }) {
  return (
    <div className="bg-white border border-gray-100 py-16 px-8">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
          {query ? `"${query}" 검색 결과가 없습니다` : '상품을 찾지 못했습니다'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">다른 키워드나 카테고리로 검색해보세요</p>
        <a
          href="/products"
          className="inline-block bg-gray-950 text-white text-sm font-semibold px-6 py-2.5 hover:bg-gray-800 transition-colors"
        >
          전체 상품 보기
        </a>
      </div>
      <div className="border-t border-gray-100 pt-8">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 text-center">
          추천 검색어
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_KEYWORDS.slice(0, 6).map(kw => (
            <button
              key={kw}
              onClick={() => onKeyword(kw)}
              className="px-4 py-2 bg-white border border-gray-200 text-sm text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') || '';
  const initialCat = searchParams.get('cat') || '';

  const [query, setQuery] = useState(initialQ);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState(initialCat);
  const [sort, setSort] = useState<Sort>('relevance');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [activePriceRange, setActivePriceRange] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  const doSearch = async (q: string, catId: string) => {
    setLoading(true);
    try {
      let items: Product[] = [];
      if (q.trim()) {
        const res = await productApi.searchProducts(q);
        items = res.content || res || [];
      } else if (catId) {
        const res = await fetch(`/api/products/category/${catId}?page=0&size=30`).then(r => r.json());
        items = res.content || [];
      } else {
        const res = await productApi.getProducts({ page: 0, size: 30 });
        items = res.content || [];
      }
      if (priceMin) items = items.filter((p: Product) => p.price >= parseInt(priceMin));
      if (priceMax) items = items.filter((p: Product) => p.price <= parseInt(priceMax));
      if (sort === 'price_asc') items.sort((a: Product, b: Product) => a.price - b.price);
      else if (sort === 'price_desc') items.sort((a: Product, b: Product) => b.price - a.price);
      setProducts(items);
      setTotal(items.length);
    } catch {
      setProducts([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => { doSearch(initialQ, initialCat); }, [initialQ, initialCat]);
  useEffect(() => { if (products.length > 0 || loading) doSearch(query, cat); }, [sort, priceMin, priceMax]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    doSearch(query, cat);
  };

  const handleCat = (id: string) => {
    setCat(id);
    router.push(id ? `/search?cat=${id}` : `/search`);
    doSearch(query, id);
  };

  const handlePriceRange = (idx: number) => {
    const range = PRICE_RANGES[idx];
    if (activePriceRange === idx) {
      setActivePriceRange(null);
      setPriceMin('');
      setPriceMax('');
    } else {
      setActivePriceRange(idx);
      setPriceMin(range.min > 0 ? String(range.min) : '');
      setPriceMax(range.max > 0 ? String(range.max) : '');
    }
  };

  const handlePopularKeyword = (kw: string) => {
    setQuery(kw);
    router.push(`/search?q=${encodeURIComponent(kw)}`);
    doSearch(kw, cat);
  };

  const isFiltered = cat || priceMin || priceMax;

  return (
    <main className="min-h-screen bg-gray-50 pb-14 md:pb-0">
      <GlobalNav />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-5">
          {initialQ ? (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Search</p>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                &ldquo;{initialQ}&rdquo;
              </h1>
              {!loading && (
                <p className="text-sm text-gray-400 mt-1">
                  {total.toLocaleString()}개 결과
                </p>
              )}
            </div>
          ) : (
            <h1 className="text-2xl font-black text-gray-950 tracking-tight">검색</h1>
          )}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        {/* Popular keywords — shown when no query */}
        {!initialQ && !initialCat && (
          <div className="bg-white border border-gray-100 p-6 mb-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">인기 검색어</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_KEYWORDS.map((kw, i) => (
                <button
                  key={kw}
                  onClick={() => handlePopularKeyword(kw)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-sm text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
                >
                  <span className="text-red-500 font-black text-xs w-3.5 text-right tabular-nums">{i + 1}</span>
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price quick filter — shown when searching */}
        {(initialQ || initialCat) && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {PRICE_RANGES.map((range, i) => (
              <button
                key={i}
                onClick={() => handlePriceRange(i)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium border transition-colors ${
                  activePriceRange === i
                    ? 'bg-gray-950 text-white border-gray-950'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-7">
          {/* Filter sidebar — desktop */}
          <aside className="w-52 flex-shrink-0 hidden lg:block">
            <div className="bg-white border border-gray-100 p-5 sticky top-[148px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">필터</h3>
                {isFiltered && (
                  <button
                    onClick={() => {
                      setCat('');
                      setPriceMin('');
                      setPriceMax('');
                      setActivePriceRange(null);
                      router.push('/search');
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    초기화
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {/* Category */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-700 mb-2.5">카테고리</p>
                  <div className="space-y-0.5">
                    {CATS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCat(c.id)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          cat === c.id
                            ? 'bg-gray-950 text-white font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-[11px] font-semibold text-gray-700 mb-2.5">가격 범위</p>
                  <div className="space-y-0.5 mb-4">
                    {PRICE_RANGES.map((range, i) => (
                      <button
                        key={i}
                        onClick={() => handlePriceRange(i)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          activePriceRange === i
                            ? 'bg-gray-950 text-white font-semibold'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="최소"
                      value={priceMin}
                      onChange={e => { setPriceMin(e.target.value); setActivePriceRange(null); }}
                      className="w-full px-2.5 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                    />
                    <span className="text-gray-300 flex-shrink-0 text-sm">—</span>
                    <input
                      type="number"
                      placeholder="최대"
                      value={priceMax}
                      onChange={e => { setPriceMax(e.target.value); setActivePriceRange(null); }}
                      className="w-full px-2.5 py-2 text-xs border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors bg-white"
                    />
                  </div>
                  <button
                    onClick={() => doSearch(query, cat)}
                    className="mt-3 w-full bg-gray-950 text-white text-xs font-semibold py-2.5 hover:bg-gray-800 transition-colors"
                  >
                    적용
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Sort bar + category chips */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                {CATS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleCat(c.id)}
                    className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                      cat === c.id
                        ? 'bg-gray-950 text-white border-gray-950'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as Sort)}
                className="text-xs border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:border-gray-900 transition-colors cursor-pointer text-gray-700 flex-shrink-0"
              >
                <option value="relevance">관련도순</option>
                <option value="price_asc">낮은 가격순</option>
                <option value="price_desc">높은 가격순</option>
                <option value="rating">평점 높은순</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState query={initialQ} onKeyword={handlePopularKeyword} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </div>
        </div>
      </div>
      <CartSummary />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"><GlobalNav /></div>}>
      <SearchContent />
    </Suspense>
  );
}
