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

type Sort = 'relevance'|'price_asc'|'price_desc';

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
  const [total, setTotal] = useState(0);

  const doSearch = async (q: string, catId: string) => {
    setLoading(true);
    try {
      let items: Product[] = [];
      if (q.trim()) {
        const res = await productApi.searchProducts(q);
        items = res.content || res || [];
      } else if (catId) {
        const res = await fetch(`/api/products/category/${catId}?page=0&size=30`).then(r=>r.json());
        items = res.content || [];
      } else {
        const res = await productApi.getProducts({ page: 0, size: 30 });
        items = res.content || [];
      }
      if (priceMin) items = items.filter((p:Product)=>p.price>=parseInt(priceMin));
      if (priceMax) items = items.filter((p:Product)=>p.price<=parseInt(priceMax));
      if (sort==='price_asc') items.sort((a:Product,b:Product)=>a.price-b.price);
      else if (sort==='price_desc') items.sort((a:Product,b:Product)=>b.price-a.price);
      setProducts(items);
      setTotal(items.length);
    } catch { setProducts([]); setTotal(0); }
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

  return (
    <main className="min-h-screen bg-gray-100">
      <GlobalNav/>
      <div className="max-w-[1280px] mx-auto px-4 py-5">
        <form onSubmit={handleSearch} className="mb-5">
          <div className="flex rounded-xl overflow-hidden border-2 border-red-600 bg-white max-w-2xl">
            <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="상품, 브랜드를 검색해보세요"
              className="flex-1 px-5 py-3 text-gray-900 placeholder-gray-400 outline-none text-base"/>
            <button type="submit" className="px-6 bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              검색
            </button>
          </div>
        </form>

        <div className="flex gap-6">
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-[148px]">
              <h3 className="font-bold text-gray-900 mb-5">필터</h3>
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">카테고리</h4>
                  <div className="space-y-1">
                    {CATS.map(c => (
                      <button key={c.id} onClick={()=>handleCat(c.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${cat===c.id?'bg-red-50 text-red-600 font-semibold':'text-gray-600 hover:bg-gray-50'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">가격 범위</h4>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="최소" value={priceMin} onChange={e=>setPriceMin(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"/>
                    <span className="text-gray-300">~</span>
                    <input type="number" placeholder="최대" value={priceMax} onChange={e=>setPriceMax(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"/>
                  </div>
                  <button onClick={()=>doSearch(query,cat)} className="mt-3 w-full btn-primary btn-sm">적용</button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="text-sm text-gray-500">
                {initialQ && <><span className="font-semibold text-gray-900">&quot;{initialQ}&quot;</span> 검색결과 · </>}
                총 <span className="font-semibold text-gray-900">{total.toLocaleString()}</span>개
              </div>
              <select value={sort} onChange={e=>setSort(e.target.value as Sort)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer">
                <option value="relevance">관련도순</option>
                <option value="price_asc">낮은 가격순</option>
                <option value="price_desc">높은 가격순</option>
              </select>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-thin">
              {CATS.map(c => (
                <button key={c.id} onClick={()=>handleCat(c.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${cat===c.id?'bg-red-600 text-white border-red-600':'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({length:12}).map((_,i)=>(
                  <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200"/>
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/4"/>
                      <div className="h-4 bg-gray-200 rounded"/>
                      <div className="h-9 bg-gray-200 rounded mt-4"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {initialQ ? '검색 결과가 없습니다' : '상품을 찾지 못했습니다'}
                </h2>
                <p className="text-gray-500 mb-6">다른 키워드나 카테고리로 검색해보세요</p>
                <a href="/products" className="btn-primary">전체 상품 보기</a>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => <ProductCard key={product.id} product={product}/>)}
              </div>
            )}
          </div>
        </div>
      </div>
      <CartSummary/>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100"><GlobalNav/></div>}>
      <SearchContent/>
    </Suspense>
  );
}
