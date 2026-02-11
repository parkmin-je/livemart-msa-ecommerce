'use client';

import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    stockQuantity: number;
    imageUrl?: string;
    category?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
    toast.success('장바구니에 추가되었습니다!');
  };

  const isOutOfStock = product.stockQuantity === 0;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Product Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
            📦
          </div>
        )}

        {/* Stock Badge */}
        {isOutOfStock ? (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            품절
          </div>
        ) : product.stockQuantity < 10 ? (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
            재고 {product.stockQuantity}개
          </div>
        ) : null}

        {/* Category Badge */}
        {product.category && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
            {product.category}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
          {product.name}
        </h3>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold text-blue-600">
            {product.price.toLocaleString()}원
          </div>

          {!isOutOfStock && (
            <div className="text-sm text-gray-500">
              재고: {product.stockQuantity}개
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isOutOfStock
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isOutOfStock ? '품절' : '장바구니'}
          </button>

          <button
            disabled={isOutOfStock}
            className={`py-2 px-4 rounded-lg font-medium border transition-colors ${
              isOutOfStock
                ? 'border-gray-300 text-gray-500 cursor-not-allowed'
                : 'border-blue-600 text-blue-600 hover:bg-blue-50'
            }`}
          >
            상세
          </button>
        </div>
      </div>

      {/* Real-time Stock Update Indicator */}
      <div className="px-4 pb-3">
        <div className="flex items-center text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          실시간 재고 (WebSocket 연동)
        </div>
      </div>
    </div>
  );
}
