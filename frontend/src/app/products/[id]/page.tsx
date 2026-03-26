'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productApi, reviewApi } from '@/api/productApi';
import { useCartStore } from '@/store/cartStore';
import { GlobalNav } from '@/components/GlobalNav';
import { CartSummary } from '@/components/CartSummary';
import { ProductCard } from '@/components/ProductCard';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categoryId: number;
  categoryName: string;
  sellerId: number;
  imageUrl?: string;
  createdAt: string;
}
interface Review {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  title: string;
  content: string;
  helpfulCount: number;
  createdAt: string;
}
interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  ratingDistribution: Record<number, number>;
}
interface QnaItem {
  id: number;
  question: string;
  answer?: string;
  userName: string;
  createdAt: string;
  secret: boolean;
}

function Stars({ rating, size = 'sm', interactive = false, onRate }: {
  rating: number; size?: 'sm'|'md'|'lg'; interactive?: boolean; onRate?: (r: number)=>void;
}) {
  const s = { sm:'w-4 h-4', md:'w-5 h-5', lg:'w-6 h-6' }[size];
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button" disabled={!interactive} onClick={()=>onRate?.(star)}
          className={`${s} ${interactive?'cursor-pointer hover:scale-125 transition':'cursor-default'}`}
          style={{ color: star<=rating ? '#FACC15' : 'rgba(14,14,14,0.15)' }}>
          <svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
        </button>
      ))}
    </div>
  );
}

// Use only real product image
function getGalleryImages(imageUrl: string | undefined): string[] {
  return imageUrl ? [imageUrl] : [];
}

// Save to recently viewed
function saveRecentlyViewed(product: Product) {
  try {
    const stored = localStorage.getItem('recentlyViewed');
    const list: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>[] = stored ? JSON.parse(stored) : [];
    const filtered = list.filter(p => p.id !== product.id);
    const entry = { id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl };
    filtered.unshift(entry);
    localStorage.setItem('recentlyViewed', JSON.stringify(filtered.slice(0, 20)));
    // storage 이벤트 트리거 (RecentlyViewedFloating 업데이트)
    window.dispatchEvent(new Event('storage'));
  } catch {}
}


export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.id);
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description'|'reviews'|'qna'>('description');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [wished, setWished] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Q&A state
  const [qnaItems, setQnaItems] = useState<QnaItem[]>([]);
  const [qnaForm, setQnaForm] = useState({ question: '', secret: false });
  const [showQnaForm, setShowQnaForm] = useState(false);
  const [qnaSubmitting, setQnaSubmitting] = useState(false);

  // 재입고 알림
  const [restockAlerted, setRestockAlerted] = useState(false);

  // 실시간 재고 상태 (30초 polling)
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  // 비교하기
  const [compareList, setCompareList] = useState<number[]>([]);

  const discountRate = [0,0,5,10,10,15,15,20,20,25,30,0,10,15][productId % 14];

  useEffect(() => {
    Promise.all([
      productApi.getProduct(productId).then(p => {
        setProduct(p);
        const imgs = getGalleryImages(p.imageUrl);
        setGalleryImages(imgs);
        saveRecentlyViewed(p);
        // Load related products by category
        return productApi.getProducts({ page: 0, size: 12 }).then(data => {
          const related = (data.content || []).filter((r: Product) => r.id !== productId && r.categoryId === p.categoryId).slice(0, 8);
          setRelatedProducts(related.length > 0 ? related : (data.content || []).filter((r: Product) => r.id !== productId).slice(0, 8));
        }).catch(() => null);
      }).catch(()=>null),
      reviewApi.getReviews(productId).then(d=>setReviews(d.content||[])).catch(()=>null),
      reviewApi.getReviewSummary(productId).then(setSummary).catch(()=>null),
    ]).finally(()=>setLoading(false));

    // 재입고 알림 상태 복원
    try {
      const alertedList = JSON.parse(localStorage.getItem('restockAlerts') || '[]');
      setRestockAlerted(alertedList.includes(productId));
    } catch {}

    // 비교 목록 복원
    try {
      const compareData = JSON.parse(localStorage.getItem('compareList') || '[]');
      setCompareList(compareData);
    } catch {}

    // 재고 초기 로드 및 30초 polling
    const loadStock = async () => {
      const stock = await productApi.getProductStock(productId);
      setCurrentStock(stock.quantity);
    };
    loadStock();
    const stockInterval = setInterval(loadStock, 30000);

    // Q&A 로드
    fetch(`/api/products/${productId}/qna`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && (d.content || Array.isArray(d))) {
          setQnaItems(d.content || d);
        }
      })
      .catch(() => {});

    return () => clearInterval(stockInterval);
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ productId: product.id, name: product.name, price: product.price, quantity, imageUrl: product.imageUrl });
    toast.success(`장바구니에 ${quantity}개 추가됐습니다!`);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) { toast.error('리뷰 내용을 입력해주세요.'); return; }
    setSubmitting(true);
    try {
      const uid = localStorage.getItem('userId');
      if (!uid) { toast.error('로그인이 필요합니다.'); setSubmitting(false); return; }
      await reviewApi.createReview(productId, { userId: parseInt(uid), ...reviewForm });
      toast.success('리뷰가 등록됐습니다!');
      setShowReviewForm(false);
      setReviewForm({ rating:5, title:'', content:'' });
      reviewApi.getReviews(productId).then(d=>setReviews(d.content||[]));
      reviewApi.getReviewSummary(productId).then(setSummary).catch(()=>null);
    } catch { toast.error('리뷰 등록에 실패했습니다.'); }
    finally { setSubmitting(false); }
  };

  const handleSubmitQna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qnaForm.question.trim()) { toast.error('문의 내용을 입력해주세요.'); return; }
    const uid = localStorage.getItem('userId');
    if (!uid) { toast.error('로그인이 필요합니다.'); return; }
    setQnaSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/qna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: qnaForm.question, secret: qnaForm.secret }),
      });
      if (res.ok) {
        toast.success('문의가 등록됐습니다!');
        setShowQnaForm(false);
        setQnaForm({ question: '', secret: false });
        // Optimistic update
        const newItem: QnaItem = {
          id: Date.now(),
          question: qnaForm.question,
          answer: undefined,
          userName: '나',
          createdAt: new Date().toISOString(),
          secret: qnaForm.secret,
        };
        setQnaItems(prev => [newItem, ...prev]);
      } else {
        toast.error('문의 등록에 실패했습니다.');
      }
    } catch {
      toast.error('문의 등록에 실패했습니다.');
    }
    setQnaSubmitting(false);
  };

  const handleRestockAlert = () => {
    try {
      const alertedList = JSON.parse(localStorage.getItem('restockAlerts') || '[]');
      if (restockAlerted) {
        const updated = alertedList.filter((id: number) => id !== productId);
        localStorage.setItem('restockAlerts', JSON.stringify(updated));
        setRestockAlerted(false);
        toast.success('재입고 알림이 취소됐습니다.');
      } else {
        alertedList.push(productId);
        localStorage.setItem('restockAlerts', JSON.stringify(alertedList));
        setRestockAlerted(true);
        toast.success('재입고 시 알림을 보내드립니다!', { icon: '🔔' });
      }
    } catch {}
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('링크가 복사됐습니다!');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('링크가 복사됐습니다!');
      } catch {
        toast.error('복사에 실패했습니다.');
      }
    }
  };

  const handleCompare = () => {
    try {
      const current = JSON.parse(localStorage.getItem('compareList') || '[]');
      if (current.includes(productId)) {
        const updated = current.filter((id: number) => id !== productId);
        localStorage.setItem('compareList', JSON.stringify(updated));
        setCompareList(updated);
        toast.success('비교 목록에서 제거됐습니다.');
      } else if (current.length >= 3) {
        toast.error('최대 3개까지 비교할 수 있습니다.');
      } else {
        const updated = [...current, productId];
        localStorage.setItem('compareList', JSON.stringify(updated));
        setCompareList(updated);
        toast.success(`비교 목록에 추가됐습니다 (${updated.length}/3)`);
      }
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}><GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div
          className="aspect-square animate-pulse"
          style={{ background: 'linear-gradient(90deg, #EDEBE4 0%, #E4E1D8 50%, #EDEBE4 100%)', backgroundSize: '600px 100%', animation: 'shimmer 1.8s ease-in-out infinite' }}
        />
        <div className="space-y-4 pt-4">
          {[80,60,40,50,40,90].map((w,i)=>(
            <div key={i} className="h-5 animate-pulse" style={{ background: '#EDEBE4', width:`${w}%` }}/>
          ))}
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen" style={{ background: '#F7F6F1' }}><GlobalNav />
      <div className="flex items-center justify-center pt-20">
        <div className="text-center p-12 max-w-md mx-auto" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#0E0E0E' }}>상품을 찾을 수 없습니다</h2>
          <button
            onClick={()=>router.push('/products')}
            className="px-6 py-2 text-white font-semibold transition-colors"
            style={{ background: '#E8001D' }}
          >
            상품 목록으로
          </button>
        </div>
      </div>
    </div>
  );

  // 실시간 재고 우선, 없으면 product.stockQuantity 사용
  const effectiveStock = currentStock !== null ? currentStock : product.stockQuantity;
  const inStock = effectiveStock > 0;
  const isLowStock = inStock && effectiveStock <= 5;
  const isFreeShipping = product.price >= 50000;
  const originalPrice = discountRate > 0 ? Math.round(product.price / (1 - discountRate/100) / 100) * 100 : product.price;
  const displayRating = summary?.averageRating ?? null;
  const reviewCount = summary?.totalCount || 0;
  const isInCompare = compareList.includes(productId);

  return (
    <main className="min-h-screen pb-14 md:pb-0" style={{ background: '#F7F6F1' }}>
      <GlobalNav />
      <div className="max-w-[1280px] mx-auto px-4 py-5">
        {/* 브레드크럼 */}
        <nav className="flex items-center gap-2 text-sm mb-5" style={{ color: 'rgba(14,14,14,0.45)' }}>
          {[['홈','/'], ['상품','/products'], ...(product.categoryName ? [[product.categoryName,'#']] : [])].map(([label, href], i) => (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>}
              <a href={href} className="hover:text-red-600 transition-colors">{label}</a>
            </span>
          ))}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          <span className="font-medium line-clamp-1" style={{ color: 'rgba(14,14,14,0.7)' }}>{product.name}</span>
        </nav>

        {/* 상품 메인 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 이미지 갤러리 */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden aspect-square relative group" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              {galleryImages.length > 0 ? (
                <img src={galleryImages[selectedImageIdx]} alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    if (selectedImageIdx > 0) {
                      t.style.display = 'none';
                    }
                  }}/>
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: '#F5F4F0' }}>
                  <svg className="w-24 h-24" style={{ color: 'rgba(14,14,14,0.12)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
              )}
              {/* 좌우 화살표 */}
              {galleryImages.length > 1 && (
                <>
                  <button onClick={() => setSelectedImageIdx(i => (i - 1 + galleryImages.length) % galleryImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xl" style={{ color: '#0E0E0E' }}>‹</button>
                  <button onClick={() => setSelectedImageIdx(i => (i + 1) % galleryImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xl" style={{ color: '#0E0E0E' }}>›</button>
                </>
              )}
              {/* 공유/비교 버튼 */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleShare}
                  className="w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow flex items-center justify-center transition-colors"
                  title="공유하기"
                >
                  <svg className="w-4 h-4" style={{ color: 'rgba(14,14,14,0.55)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  </svg>
                </button>
                <button
                  onClick={handleCompare}
                  className="w-8 h-8 rounded-full shadow flex items-center justify-center transition-colors"
                  style={isInCompare ? { background: '#2563EB', color: '#FFFFFF' } : { background: 'rgba(255,255,255,0.9)', color: 'rgba(14,14,14,0.6)' }}
                  title={isInCompare ? '비교 제거' : '비교하기'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </button>
              </div>
            </div>
            {/* 썸네일 */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2">
                {galleryImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImageIdx(i)}
                    className="flex-1 aspect-square overflow-hidden transition-all"
                  style={{ border: selectedImageIdx === i ? '2px solid #E8001D' : '1px solid rgba(14,14,14,0.12)' }}>
                    <img src={img} alt={`${product.name} ${i+1}`} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}/>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col gap-4" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            {product.categoryName && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold w-fit uppercase tracking-wider"
                style={{ background: 'rgba(232,0,29,0.08)', color: '#E8001D' }}
              >
                {product.categoryName}
              </span>
            )}
            <h1 className="text-2xl font-bold leading-tight" style={{ color: '#0E0E0E' }}>{product.name}</h1>

            {displayRating !== null && (
              <div className="flex items-center gap-2">
                <Stars rating={Math.round(displayRating)} size="sm"/>
                <span className="text-sm font-semibold" style={{ color: '#0E0E0E' }}>{displayRating.toFixed(1)}</span>
                <span className="text-sm" style={{ color: 'rgba(14,14,14,0.38)' }}>({reviewCount.toLocaleString()}개 리뷰)</span>
              </div>
            )}

            <hr style={{ borderColor: 'rgba(14,14,14,0.07)' }}/>

            <div>
              {discountRate > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-red-600">{discountRate}%</span>
                  <span className="line-through text-sm" style={{ color: 'rgba(14,14,14,0.35)' }}>{originalPrice.toLocaleString()}원</span>
                </div>
              )}
              <div className="text-3xl font-black" style={{ color: '#0E0E0E' }}>
                {product.price.toLocaleString()}<span className="text-xl font-semibold ml-1">원</span>
              </div>
            </div>

            {/* 배송 정보 */}
            <div className="p-4 space-y-2 text-sm" style={{ background: '#F7F6F1' }}>
              {isFreeShipping ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ color: '#0070F3' }}>무료배송</span>
                  <span style={{ color: 'rgba(14,14,14,0.45)' }}>· 5만원 이상</span>
                </div>
              ) : (
                <div className="flex items-center gap-2" style={{ color: 'rgba(14,14,14,0.55)' }}>
                  <span>일반배송</span><span style={{ color: 'rgba(14,14,14,0.38)' }}>· 3,000원</span>
                </div>
              )}
              <div style={{ color: 'rgba(14,14,14,0.55)' }}>7일 이내 무료 반품</div>
              <div style={{ color: 'rgba(14,14,14,0.55)' }}>Stripe 안전결제 보장</div>
            </div>

            {/* 재고/수량 — 실시간 polling */}
            <div className="flex flex-col gap-2">
              {isLowStock && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold w-fit">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  품절 임박! 재고 {effectiveStock}개 남음
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${inStock?'bg-green-500':'bg-red-500'}`}/>
                  <span className={`text-sm font-medium ${inStock?'text-green-700':'text-red-700'}`}>
                    {inStock ? (isLowStock ? `재고 ${effectiveStock}개 (품절 임박)` : `재고 ${effectiveStock}개`) : '품절'}
                  </span>
                </div>
                {inStock && (
                  <div className="flex items-center overflow-hidden" style={{ border: '1px solid rgba(14,14,14,0.14)' }}>
                    <button onClick={()=>setQuantity(Math.max(1,quantity-1))} className="w-10 h-10 flex items-center justify-center text-xl font-bold transition-colors" style={{ color: 'rgba(14,14,14,0.55)' }} onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(14,14,14,0.04)')} onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='transparent')}>−</button>
                    <span className="w-12 text-center font-semibold" style={{ color: '#0E0E0E', borderLeft: '1px solid rgba(14,14,14,0.1)', borderRight: '1px solid rgba(14,14,14,0.1)' }}>{quantity}</span>
                    <button onClick={()=>setQuantity(Math.min(effectiveStock,quantity+1))} className="w-10 h-10 flex items-center justify-center text-xl font-bold transition-colors" style={{ color: 'rgba(14,14,14,0.55)' }} onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(14,14,14,0.04)')} onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='transparent')}>+</button>
                  </div>
                )}
              </div>
            </div>
            {inStock && quantity > 1 && (
              <span className="text-sm" style={{ color: 'rgba(14,14,14,0.45)' }}>합계: <span className="font-bold" style={{ color: '#0E0E0E' }}>{(product.price*quantity).toLocaleString()}원</span></span>
            )}

            {/* 버튼들 */}
            {inStock ? (
              <div className="flex gap-3 mt-auto">
                <button onClick={()=>setWished(!wished)}
                  className="w-12 h-12 flex items-center justify-center transition-all"
                  style={{ border: wished ? '2px solid #E8001D' : '1px solid rgba(14,14,14,0.14)', color: wished ? '#E8001D' : 'rgba(14,14,14,0.35)', background: wished ? 'rgba(232,0,29,0.05)' : 'transparent' }}>
                  <svg className="w-5 h-5" fill={wished?'currentColor':'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 font-bold transition-colors"
                  style={{ border: '2px solid #E8001D', color: '#E8001D' }}
                  onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background='rgba(232,0,29,0.05)')}
                  onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background='transparent')}
                >장바구니</button>
                <button
                  onClick={()=>{handleAddToCart();router.push('/orders/new');}}
                  className="flex-1 py-3 font-bold text-white transition-colors"
                  style={{ background: '#E8001D' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='#C0001A')}
                  onMouseLeave={e=>(e.currentTarget.style.background='#E8001D')}
                >바로 구매</button>
              </div>
            ) : (
              <div className="flex gap-3 mt-auto">
                <button onClick={handleRestockAlert}
                  className="flex-1 py-3 font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ border: restockAlerted ? '2px solid #FF6B00' : '1px solid rgba(14,14,14,0.2)', color: restockAlerted ? '#FF6B00' : 'rgba(14,14,14,0.55)', background: restockAlerted ? 'rgba(255,107,0,0.05)' : 'transparent' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                  {restockAlerted ? '알림 신청됨' : '재입고 알림 받기'}
                </button>
                <button onClick={handleShare}
                  className="w-12 h-12 flex items-center justify-center transition-colors"
                  style={{ border: '1px solid rgba(14,14,14,0.14)', color: 'rgba(14,14,14,0.38)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  </svg>
                </button>
              </div>
            )}

            {/* 공유 & 비교 (재고 있을 때) */}
            {inStock && (
              <div className="flex items-center gap-3 pt-1">
                <button onClick={handleShare} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'rgba(14,14,14,0.38)' }} onMouseEnter={e=>(e.currentTarget.style.color='rgba(14,14,14,0.65)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(14,14,14,0.38)')}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  </svg>
                  공유하기
                </button>
                <span style={{ color: 'rgba(14,14,14,0.15)' }}>|</span>
                <button onClick={handleCompare} className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: isInCompare ? '#2563EB' : 'rgba(14,14,14,0.38)' }}
                  onMouseEnter={e => !isInCompare && (e.currentTarget.style.color = 'rgba(14,14,14,0.65)')}
                  onMouseLeave={e => !isInCompare && (e.currentTarget.style.color = 'rgba(14,14,14,0.38)')}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  {isInCompare ? `비교중 (${compareList.length}/3)` : '비교하기'}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* 탭 */}
        <div className="overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
          <div className="flex" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
            {(['description','reviews','qna'] as const).map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)}
                className="flex-1 py-4 text-sm font-semibold transition-colors"
                style={activeTab===tab
                  ? { color: '#E8001D', borderBottom: '2px solid #E8001D', background: 'rgba(232,0,29,0.03)' }
                  : { color: 'rgba(14,14,14,0.45)' }}
                onMouseEnter={e => activeTab!==tab && (e.currentTarget.style.color = 'rgba(14,14,14,0.7)')}
                onMouseLeave={e => activeTab!==tab && (e.currentTarget.style.color = 'rgba(14,14,14,0.45)')}>
                {tab==='description'?'상품 설명':tab==='reviews'?`리뷰 (${reviewCount})`:`Q&A (${qnaItems.length})`}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab==='description' ? (
              <p className="leading-relaxed whitespace-pre-line text-base" style={{ color: 'rgba(14,14,14,0.7)' }}>{product.description||'상품 설명이 없습니다.'}</p>
            ) : activeTab==='reviews' ? (
              <div className="space-y-5">
                {summary && summary.totalCount > 0 && (
                  <div className="p-5 flex items-start gap-8" style={{ background: '#F7F6F1' }}>
                    <div className="text-center">
                      <div className="text-5xl font-black" style={{ color: '#0E0E0E' }}>{(displayRating ?? 0).toFixed(1)}</div>
                      <Stars rating={Math.round(displayRating ?? 0)} size="md"/>
                      <div className="text-sm mt-1" style={{ color: 'rgba(14,14,14,0.5)' }}>{reviewCount}개</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5,4,3,2,1].map(star => {
                        const count = summary.ratingDistribution?.[star]||0;
                        const pct = summary.totalCount>0?(count/summary.totalCount)*100:0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-xs w-5 text-right" style={{ color: 'rgba(14,14,14,0.5)' }}>{star}★</span>
                            <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(14,14,14,0.1)' }}>
                              <div className="bg-yellow-400 h-1.5 rounded-full" style={{width:`${pct}%`}}/>
                            </div>
                            <span className="text-xs w-6" style={{ color: 'rgba(14,14,14,0.4)' }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button onClick={()=>setShowReviewForm(!showReviewForm)}
                    className="px-4 py-2 text-sm transition-colors"
                    style={showReviewForm
                      ? { border: '1px solid rgba(14,14,14,0.2)', color: 'rgba(14,14,14,0.6)' }
                      : { background: '#E8001D', color: '#FFFFFF' }}
                    onMouseEnter={e => showReviewForm
                      ? (e.currentTarget.style.background = '#F7F6F1')
                      : (e.currentTarget.style.background = '#C8001A')}
                    onMouseLeave={e => showReviewForm
                      ? (e.currentTarget.style.background = 'transparent')
                      : (e.currentTarget.style.background = '#E8001D')}>
                    {showReviewForm?'취소':'리뷰 작성'}
                  </button>
                </div>

                {showReviewForm && (
                  <form onSubmit={handleSubmitReview} className="p-5 space-y-4" style={{ background: '#F7F6F1' }}>
                    <h3 className="font-bold" style={{ color: '#0E0E0E' }}>리뷰 작성</h3>
                    <div>
                      <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(14,14,14,0.6)' }}>평점</label>
                      <Stars rating={reviewForm.rating} size="lg" interactive onRate={r=>setReviewForm({...reviewForm,rating:r})}/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(14,14,14,0.6)' }}>제목 (선택)</label>
                      <input value={reviewForm.title} onChange={e=>setReviewForm({...reviewForm,title:e.target.value})}
                        className="w-full px-3 py-2 text-sm focus:outline-none"
                        style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }} placeholder="리뷰 제목"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(14,14,14,0.6)' }}>내용 *</label>
                      <textarea value={reviewForm.content} onChange={e=>setReviewForm({...reviewForm,content:e.target.value})}
                        className="w-full px-3 py-2 text-sm focus:outline-none resize-none"
                        style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }} rows={4} required placeholder="상품 사용 후기를 작성해주세요"/>
                    </div>
                    <button type="submit" disabled={submitting} className="px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">{submitting?'등록 중...':'리뷰 등록'}</button>
                  </form>
                )}

                {reviews.length===0 ? (
                  <div className="text-center py-12" style={{ color: 'rgba(14,14,14,0.4)' }}>
                    <div className="flex justify-center mb-3"><svg className="w-12 h-12" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg></div>
                    <p>아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(review => (
                      <div key={review.id} className="pb-5 last:border-0" style={{ borderBottom: '1px solid rgba(14,14,14,0.07)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(232,0,29,0.08)', color: '#E8001D' }}>
                              {review.userName?.charAt(0)||'U'}
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: '#0E0E0E' }}>{review.userName||'사용자'}</div>
                              <div className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>{new Date(review.createdAt).toLocaleDateString('ko-KR')}</div>
                            </div>
                          </div>
                          <Stars rating={review.rating} size="sm"/>
                        </div>
                        {review.title && <h4 className="font-semibold mb-1" style={{ color: 'rgba(14,14,14,0.8)' }}>{review.title}</h4>}
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(14,14,14,0.7)' }}>{review.content}</p>
                        <button onClick={()=>reviewApi.markHelpful(productId,review.id)}
                          className="mt-2 text-xs transition-colors"
                          style={{ color: 'rgba(14,14,14,0.4)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.7)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,14,14,0.4)')}>
                          도움이 됐어요 ({review.helpfulCount||0})
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Q&A 탭 */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'rgba(14,14,14,0.5)' }}>총 {qnaItems.length}개의 문의</p>
                  <button
                    onClick={() => setShowQnaForm(!showQnaForm)}
                    className="px-4 py-2 text-sm transition-colors"
                    style={showQnaForm
                      ? { border: '1px solid rgba(14,14,14,0.2)', color: 'rgba(14,14,14,0.6)' }
                      : { background: '#0A0A0A', color: '#FFFFFF' }}
                    onMouseEnter={e => showQnaForm
                      ? (e.currentTarget.style.background = '#F7F6F1')
                      : (e.currentTarget.style.background = '#E8001D')}
                    onMouseLeave={e => showQnaForm
                      ? (e.currentTarget.style.background = 'transparent')
                      : (e.currentTarget.style.background = '#0A0A0A')}
                  >
                    {showQnaForm ? '취소' : '문의하기'}
                  </button>
                </div>

                {showQnaForm && (
                  <form onSubmit={handleSubmitQna} className="p-5 space-y-4" style={{ background: '#F7F6F1' }}>
                    <h3 className="font-bold" style={{ color: '#0E0E0E' }}>상품 문의</h3>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(14,14,14,0.6)' }}>문의 내용 *</label>
                      <textarea
                        value={qnaForm.question}
                        onChange={e => setQnaForm({...qnaForm, question: e.target.value})}
                        className="w-full px-3 py-2 text-sm focus:outline-none resize-none"
                        style={{ border: '1px solid rgba(14,14,14,0.14)', color: '#0E0E0E', background: '#FFFFFF' }}
                        rows={4} required placeholder="상품에 대해 궁금한 점을 문의해주세요"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qnaForm.secret}
                        onChange={e => setQnaForm({...qnaForm, secret: e.target.checked})}
                        className="w-4 h-4 accent-stone-800"
                      />
                      <span className="text-sm" style={{ color: 'rgba(14,14,14,0.6)' }}>비밀글로 등록</span>
                    </label>
                    <button type="submit" disabled={qnaSubmitting}
                      className="px-6 py-2 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                      style={{ background: '#0A0A0A' }}
                      onMouseEnter={e => !qnaSubmitting && (e.currentTarget.style.background = '#E8001D')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0A0A0A')}>
                      {qnaSubmitting ? '등록 중...' : '문의 등록'}
                    </button>
                  </form>
                )}

                {qnaItems.length === 0 ? (
                  <div className="text-center py-12" style={{ color: 'rgba(14,14,14,0.4)' }}>
                    <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(14,14,14,0.15)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p>아직 문의가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qnaItems.map(item => (
                      <div key={item.id} className="overflow-hidden" style={{ border: '1px solid rgba(14,14,14,0.08)' }}>
                        <div className="flex items-start gap-3 p-4" style={{ background: '#F7F6F1' }}>
                          <span className="text-xs font-black text-white px-2 py-0.5 flex-shrink-0 mt-0.5" style={{ background: '#0A0A0A' }}>Q</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: 'rgba(14,14,14,0.8)' }}>{item.secret ? '비밀글입니다.' : item.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>{item.userName}</span>
                              <span style={{ color: 'rgba(14,14,14,0.15)' }}>·</span>
                              <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
                              {item.secret && (
                                <span className="text-xs px-1.5 py-0.5" style={{ background: 'rgba(14,14,14,0.08)', color: 'rgba(14,14,14,0.5)' }}>비밀글</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {item.answer && (
                          <div className="flex items-start gap-3 p-4" style={{ background: '#FFFFFF', borderTop: '1px solid rgba(14,14,14,0.07)' }}>
                            <span className="text-xs font-black text-white px-2 py-0.5 flex-shrink-0 mt-0.5" style={{ background: '#E8001D' }}>A</span>
                            <p className="text-sm flex-1" style={{ color: 'rgba(14,14,14,0.7)' }}>{item.answer}</p>
                          </div>
                        )}
                        {!item.answer && (
                          <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#FFFFFF', borderTop: '1px solid rgba(14,14,14,0.07)' }}>
                            <span className="text-xs font-black text-white px-2 py-0.5" style={{ background: 'rgba(14,14,14,0.25)' }}>A</span>
                            <span className="text-xs" style={{ color: 'rgba(14,14,14,0.4)' }}>답변 대기 중</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 연관 상품 */}
        {relatedProducts.length > 0 && (
          <section className="p-6 mt-6" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#0E0E0E' }}>함께 보면 좋은 상품</h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(14,14,14,0.5)' }}>같은 카테고리의 인기 상품</p>
              </div>
              <a href="/products" className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
                전체보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p: Product) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
      <CartSummary/>
    </main>
  );
}
