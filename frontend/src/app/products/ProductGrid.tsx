'use client';

import { useState } from 'react';
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

export function ProductGrid({ products }: { products: Product[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const addItem = useCartStore((state) => state.addItem);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

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
                  productName: product.name,
                  price: product.price,
                  quantity: 1,
                })}
                disabled={product.stockQuantity <= 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {product.stockQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Stock: {product.stockQuantity}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products found.
        </div>
      )}
    </div>
  );
}
