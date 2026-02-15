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
    products.forEach(p => { if (p.category?.name) cats.add(p.category.name); });
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter(p =>
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!selectedCategory || p.category?.name === selectedCategory) &&
      p.price >= priceRange[0] && p.price <= priceRange[1]
    );

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
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="latest">최신순</option>
            <option value="price_asc">가격 낮은순</option>
            <option value="price_desc">가격 높은순</option>
            <option value="name">이름순</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg text-sm transition ${
              showFilters ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            필터 {hasActiveFilters ? '●' : ''}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">상세 필터</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700">
                필터 초기화
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">전체</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 가격: ₩{priceRange[0].toLocaleString()}
              </label>
              <input
                type="range"
                min="0" max="1000000" step="10000"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최대 가격: ₩{priceRange[1].toLocaleString()}
              </label>
              <input
                type="range"
                min="0" max="1000000" step="10000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Result Count */}
      <div className="text-sm text-gray-500 mb-4">
        {filtered.length}개 상품
        {hasActiveFilters && <span className="ml-1">(필터 적용됨)</span>}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
            <a href={`/products/${product.id}`}>
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="h-48 w-full object-cover rounded-lg mb-4" />
              )}
              {!product.imageUrl && (
                <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
              )}
            </a>
            <div className="flex items-center justify-between mb-2">
              <a href={`/products/${product.id}`} className="hover:text-blue-600">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
              </a>
              {product.category && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {product.category.name}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-blue-600">
                ₩{product.price?.toLocaleString()}
              </span>
              <button
                onClick={() => addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  quantity: 1,
                })}
                disabled={product.stockQuantity <= 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {product.stockQuantity > 0 ? '담기' : '품절'}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              재고: {product.stockQuantity}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p>검색 결과가 없습니다.</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-blue-600 hover:underline text-sm">
              필터 초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
