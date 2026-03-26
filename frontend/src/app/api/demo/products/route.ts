import { NextResponse } from 'next/server';

// 데모 모드용 mock 상품 데이터 — 백엔드 없이 Vercel 배포 시 사용
const DEMO_PRODUCTS = [
  { id: 1, name: '무선 블루투스 이어폰 ANC Pro', price: 89000, stockQuantity: 42, categoryName: '전자기기', description: '액티브 노이즈 캔슬링으로 완벽한 몰입감. 30시간 배터리, IPX5 방수, 멀티포인트 연결 지원.' },
  { id: 2, name: '프리미엄 요가 매트 8mm', price: 35000, stockQuantity: 28, categoryName: '스포츠', description: '천연 TPE 소재, 미끄럼 방지 텍스처, 친환경 인증 제품.' },
  { id: 3, name: '한방 갈비탕 밀키트 2인분', price: 18500, stockQuantity: 65, categoryName: '식품', description: '15시간 우린 진한 사골 육수, 손질된 갈비 400g 포함. 냉장 배송.' },
  { id: 4, name: '스마트 체중계 블루투스', price: 45000, stockQuantity: 19, categoryName: '건강', description: 'BMI·체지방·근육량·수분 8가지 지표 측정, 앱 연동.' },
  { id: 5, name: '럭셔리 코튼 침구 세트 퀸', price: 128000, stockQuantity: 11, categoryName: '홈/인테리어', description: '이집트면 400수 장섬유, 호텔급 부드러움, 사계절 사용 가능.' },
  { id: 6, name: '캐리어 28인치 하드케이스', price: 89000, stockQuantity: 34, categoryName: '여행', description: 'TSA 잠금장치, 360도 회전 캐스터, PC 하드쉘, 10kg.' },
  { id: 7, name: '아이폰15 강화유리 케이스', price: 15000, stockQuantity: 87, categoryName: '전자기기', description: '군사규격 충격 흡수, 황변 방지 투명 소재, 맥세이프 호환.' },
  { id: 8, name: '유기농 그린티 50봉', price: 22000, stockQuantity: 53, categoryName: '식품', description: '제주 유기농 녹차잎 100%, 카페인 낮은 어린 순 채취, 개별 포장.' },
  { id: 9, name: '스탠딩 책상 전동 높이조절', price: 320000, stockQuantity: 7, categoryName: '홈/인테리어', description: '70-120cm 무단계 조절, 메모리 기능 4단계, 최대 80kg 지지.' },
  { id: 10, name: '프로틴 쉐이크 바닐라 1kg', price: 38000, stockQuantity: 44, categoryName: '건강', description: 'WPI 90% 농축유청단백질, 1회 25g 단백질, 저당·저지방.' },
  { id: 11, name: '4K 웹캠 오토포커스', price: 67000, stockQuantity: 23, categoryName: '전자기기', description: '소니 센서, AI 배경 블러, 스테레오 노이즈 캔슬링 마이크.' },
  { id: 12, name: '제주 감귤 3kg 선물세트', price: 29000, stockQuantity: 38, categoryName: '식품', description: '당도 13브릭스 이상 엄선, 친환경 재배, 산지 직송.' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0');
  const size = parseInt(searchParams.get('size') || '12');
  const search = searchParams.get('search')?.toLowerCase() || '';
  const category = searchParams.get('category') || '';

  let filtered = DEMO_PRODUCTS;
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search));
  if (category) filtered = filtered.filter(p => p.categoryName === category);

  const start = page * size;
  const content = filtered.slice(start, start + size);

  return NextResponse.json({
    content,
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / size),
    number: page,
    size,
    _demo: true,
  });
}
