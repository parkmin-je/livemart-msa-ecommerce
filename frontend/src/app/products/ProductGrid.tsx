'use client';

import { useState, useMemo } from 'react';
import { useCartStore } from '@/store/cartStore';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
  categoryName?: string;
  category?: { name: string };
}

type SortOption = 'latest' | 'price_asc' | 'price_desc' | 'name';

export function ProductGrid({ products }: { products: Product[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [showFilters, setShowFilters] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const catName = p.categoryName || p.category?.name;
      if (catName) cats.add(catName);
    });
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const catName = p.categoryName || p.category?.name;
      return (
        (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!selectedCategory || catName === selectedCategory) &&
        p.price >= priceRange[0] && p.price <= priceRange[1]
      );
    });

    switch (sortBy) {
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }

    return result;
  }, [products, searchTerm, selectedCategory, priceRange, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange([0, 1000000]);
    setSortBy('latest');
  };

  const hasActiveFilters = searchTerm || selectedCategory || priceRange[0] > 0 || priceRange[1] < 1000000 || sortBy !== 'latest';

  return (
    <div>
      {/* Search + Sort Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="상품명, 설명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 focus:outline-none transition-colors"
            style={{
              border: '1px solid rgba(14,14,14,0.14)',
              background: '#FFFFFF',
              color: '#0E0E0E',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#0E0E0E')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(14,14,14,0.14)')}
          />
          <span className="absolute left-3 top-2.5" style={{ color: 'rgba(14,14,14,0.35)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 text-sm focus:outline-none cursor-pointer"
            style={{ border: '1px solid rgba(14,14,14,0.14)', background: '#FFFFFF', color: 'rgba(14,14,14,0.65)' }}
          >
            <option value="latest">최신순</option>
            <option value="price_asc">가격 낮은순</option>
            <option value="price_desc">가격 높은순</option>
            <option value="name">이름순</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              border: '1px solid rgba(14,14,14,0.14)',
              background: showFilters ? '#0A0A0A' : 'transparent',
              color: showFilters ? '#FFFFFF' : 'rgba(14,14,14,0.65)',
            }}
          >
            필터 {hasActiveFilters ? '●' : ''}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-6 mb-6" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium" style={{ color: '#0E0E0E' }}>상세 필터</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm transition-colors"
                style={{ color: '#E8001D' }}
              >
                필터 초기화
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(14,14,14,0.55)' }}>카테고리</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{ border: '1px solid rgba(14,14,14,0.14)', background: '#FFFFFF', color: 'rgba(14,14,14,0.65)' }}
              >
                <option value="">전체</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(14,14,14,0.55)' }}>
                최소 가격: ₩{priceRange[0].toLocaleString()}
              </label>
              <input
                type="range"
                min="0" max="1000000" step="10000"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="w-full accent-red-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(14,14,14,0.55)' }}>
                최대 가격: ₩{priceRange[1].toLocaleString()}
              </label>
              <input
                type="range"
                min="0" max="1000000" step="10000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full accent-red-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Result Count */}
      <div className="text-sm mb-4" style={{ color: 'rgba(14,14,14,0.4)' }}>
        {filtered.length}개 상품
        {hasActiveFilters && <span className="ml-1">(필터 적용됨)</span>}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="group transition-colors"
            style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.18)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,14,14,0.07)')}
          >
            <a href={`/products/${product.id}`}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-48 w-full object-cover group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div
                  className="h-48 w-full flex items-center justify-center"
                  style={{ background: '#F5F4F0' }}
                >
                  <svg className="w-12 h-12" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
              )}
            </a>
            <div className="p-5">
              <div className="flex items-start justify-between mb-2 gap-2">
                <a href={`/products/${product.id}`}>
                  <h3 className="text-base font-semibold truncate transition-colors" style={{ color: '#0E0E0E' }}>
                    {product.name}
                  </h3>
                </a>
                {(product.categoryName || product.category?.name) && (
                  <span
                    className="text-xs px-2 py-0.5 flex-shrink-0"
                    style={{ background: 'rgba(14,14,14,0.06)', color: 'rgba(14,14,14,0.45)' }}
                  >
                    {product.categoryName || product.category?.name}
                  </span>
                )}
              </div>
              <p className="text-sm mb-4 line-clamp-2" style={{ color: 'rgba(14,14,14,0.45)' }}>{product.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-0.5">
                  <span className="font-bebas tabular-nums" style={{ fontSize: '1.4rem', color: '#0E0E0E', letterSpacing: '0.01em' }}>
                    {product.price?.toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>원</span>
                </div>
                <button
                  onClick={() => addItem({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                  })}
                  disabled={product.stockQuantity <= 0}
                  className="px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: '#0A0A0A' }}
                  onMouseEnter={e => product.stockQuantity > 0 && (e.currentTarget.style.background = '#E8001D')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}
                >
                  {product.stockQuantity > 0 ? '담기' : '품절'}
                </button>
              </div>
              {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
                <div className="mt-2 text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>
                  재고 {product.stockQuantity}개
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12" style={{ color: 'rgba(14,14,14,0.4)' }}>
          <div className="flex justify-center mb-3">
            <svg className="w-10 h-10" style={{ color: 'rgba(14,14,14,0.18)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <p>검색 결과가 없습니다.</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-sm hover:underline transition-colors"
              style={{ color: '#E8001D' }}
            >
              필터 초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
