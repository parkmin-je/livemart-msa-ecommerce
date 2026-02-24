/**
 * LiveMart 상품 데이터 시딩 스크립트
 * 실행: node scripts/seed-products.js
 */

const BASE_URL = 'http://localhost:8080';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ ${options.method || 'GET'} ${url} → ${res.status}: ${text}`);
    return null;
  }
  try { return JSON.parse(text); } catch { return text; }
}

// 카테고리 생성
const CATEGORIES = [
  { name: '전자기기', description: '스마트폰, 노트북, 태블릿, 이어폰 등' },
  { name: '패션', description: '의류, 신발, 가방, 액세서리' },
  { name: '식품', description: '신선식품, 가공식품, 음료, 건강식품' },
  { name: '홈/리빙', description: '가구, 인테리어, 생활용품, 주방용품' },
  { name: '뷰티', description: '스킨케어, 메이크업, 헤어케어, 향수' },
  { name: '스포츠', description: '운동용품, 아웃도어, 레저, 피트니스' },
];

// 카테고리별 상품 (각 5개)
function getProducts(categoryMap) {
  return [
    // ── 전자기기 ──
    {
      name: '삼성 갤럭시 버즈3 프로',
      description: '액티브 노이즈 캔슬링, 고음질 무선 이어폰. 최대 30시간 배터리, IPX7 방수. 갤럭시 기기와 완벽 연동.',
      price: 239000,
      stockQuantity: 87,
      categoryId: categoryMap['전자기기'],
      imageUrl: 'https://picsum.photos/seed/earbuds1/400/400',
    },
    {
      name: 'LG 그램 16 노트북 (2025)',
      description: '인텔 Ultra 7 프로세서, 16GB RAM, 512GB SSD. 무게 1.19kg 초경량. 업무와 창작을 위한 최적의 선택.',
      price: 1589000,
      stockQuantity: 34,
      categoryId: categoryMap['전자기기'],
      imageUrl: 'https://picsum.photos/seed/laptop1/400/400',
    },
    {
      name: '애플 아이패드 에어 M2',
      description: 'M2 칩 탑재, 11인치 Liquid Retina 디스플레이. Apple Pencil Pro 지원. 학습과 창작의 이상적인 도구.',
      price: 899000,
      stockQuantity: 52,
      categoryId: categoryMap['전자기기'],
      imageUrl: 'https://picsum.photos/seed/ipad1/400/400',
    },
    {
      name: '소니 WH-1000XM6 헤드폰',
      description: '업계 최고 수준의 노이즈 캔슬링. 30시간 배터리, 고속충전. 30분 충전으로 3시간 사용 가능.',
      price: 449000,
      stockQuantity: 63,
      categoryId: categoryMap['전자기기'],
      imageUrl: 'https://picsum.photos/seed/headphone1/400/400',
    },
    {
      name: '삼성 갤럭시 워치 7',
      description: '건강 모니터링, 심전도, 혈중산소 측정. 5ATM 방수. 운동 추적 및 스마트 알림 기능.',
      price: 319000,
      stockQuantity: 128,
      categoryId: categoryMap['전자기기'],
      imageUrl: 'https://picsum.photos/seed/watch1/400/400',
    },

    // ── 패션 ──
    {
      name: '나이키 에어 조던 1 레트로 OG',
      description: '클래식 하이탑 스니커즈. 가죽 어퍼, 쿠셔닝 에어 유닛. 스트리트패션의 아이콘.',
      price: 189000,
      stockQuantity: 45,
      categoryId: categoryMap['패션'],
      imageUrl: 'https://picsum.photos/seed/shoes1/400/400',
    },
    {
      name: '아디다스 삼바 OG',
      description: '70년대 축구화에서 영감받은 클래식 스니커즈. 가죽 어퍼, 수에이드 T자형 오버레이.',
      price: 129000,
      stockQuantity: 78,
      categoryId: categoryMap['패션'],
      imageUrl: 'https://picsum.photos/seed/shoes2/400/400',
    },
    {
      name: '유니클로 울트라라이트 다운 재킷',
      description: '초경량 90g 다운 패딩. 접어서 소형 파우치로 수납 가능. 방풍·방수 기능으로 겨울철 필수 아이템.',
      price: 79900,
      stockQuantity: 156,
      categoryId: categoryMap['패션'],
      imageUrl: 'https://picsum.photos/seed/jacket1/400/400',
    },
    {
      name: '리바이스 511 슬림 진',
      description: '편안한 슬림핏 데님. 스트레치 소재로 활동성 우수. 다양한 스타일링에 어울리는 베이직 아이템.',
      price: 89000,
      stockQuantity: 203,
      categoryId: categoryMap['패션'],
      imageUrl: 'https://picsum.photos/seed/jeans1/400/400',
    },
    {
      name: '노스페이스 눕시 다운 베스트',
      description: '700필파워 다운 필링. 경량 립스탑 나일론 소재. 레이어링에 최적화된 아웃도어 베스트.',
      price: 168000,
      stockQuantity: 67,
      categoryId: categoryMap['패션'],
      imageUrl: 'https://picsum.photos/seed/vest1/400/400',
    },

    // ── 식품 ──
    {
      name: '자연e 유기농 블루베리 500g',
      description: '국내산 무농약 블루베리. 항산화 성분 풍부. 냉동 상태로 배송되어 신선도 유지.',
      price: 18900,
      stockQuantity: 324,
      categoryId: categoryMap['식품'],
      imageUrl: 'https://picsum.photos/seed/berry1/400/400',
    },
    {
      name: '스타벅스 홀빈 에스프레소 로스트 1kg',
      description: '다크 로스팅으로 풍부하고 묵직한 맛. 전 세계 스타벅스 매장에서 사용하는 블렌드.',
      price: 43900,
      stockQuantity: 189,
      categoryId: categoryMap['식품'],
      imageUrl: 'https://picsum.photos/seed/coffee1/400/400',
    },
    {
      name: '오뚜기 진라면 매운맛 40봉',
      description: '진한 육수와 쫄깃한 면발. 매콤하고 깔끔한 국물 맛. 대용량 박스 상품.',
      price: 28900,
      stockQuantity: 567,
      categoryId: categoryMap['식품'],
      imageUrl: 'https://picsum.photos/seed/ramen1/400/400',
    },
    {
      name: '고려홍삼 정관장 홍삼정 에브리타임 30포',
      description: '6년근 홍삼 농축액. 면역력 증진, 피로 회복에 도움. 간편한 스틱 포장.',
      price: 89000,
      stockQuantity: 234,
      categoryId: categoryMap['식품'],
      imageUrl: 'https://picsum.photos/seed/redginseng1/400/400',
    },
    {
      name: '제주 감귤 5kg 가정용',
      description: '제주도 직송 노지 감귤. 당도 높고 새콤달콤한 맛. 비타민C 풍부.',
      price: 22900,
      stockQuantity: 445,
      categoryId: categoryMap['식품'],
      imageUrl: 'https://picsum.photos/seed/mandarin1/400/400',
    },

    // ── 홈/리빙 ──
    {
      name: '다이슨 V15 디텍트 무선청소기',
      description: '레이저 먼지 감지 기술. 60분 배터리, 강력한 흡입력. HEPA 필터로 미세먼지 99.99% 포집.',
      price: 899000,
      stockQuantity: 28,
      categoryId: categoryMap['홈/리빙'],
      imageUrl: 'https://picsum.photos/seed/vacuum1/400/400',
    },
    {
      name: '쿠쿠 IH 전기압력밥솥 6인용',
      description: 'IH 가열 방식으로 솥 전체가 고르게 가열. 24가지 맞춤 취사 기능. 보온 최대 24시간.',
      price: 189000,
      stockQuantity: 73,
      categoryId: categoryMap['홈/리빙'],
      imageUrl: 'https://picsum.photos/seed/ricecooker1/400/400',
    },
    {
      name: '이케아 MALM 서랍장 6단 화이트',
      description: '심플하고 세련된 화이트 서랍장. 6단 구성으로 넉넉한 수납공간. 어떤 인테리어에도 잘 어울림.',
      price: 149000,
      stockQuantity: 42,
      categoryId: categoryMap['홈/리빙'],
      imageUrl: 'https://picsum.photos/seed/drawer1/400/400',
    },
    {
      name: '필립스 에어프라이어 4.1L XXL',
      description: '90% 적은 기름으로 바삭한 요리. 1.2kg 용량, 6인분 요리 가능. 자동 온도 조절 기능.',
      price: 159000,
      stockQuantity: 91,
      categoryId: categoryMap['홈/리빙'],
      imageUrl: 'https://picsum.photos/seed/airfryer1/400/400',
    },
    {
      name: '무인양품 소파 베드 3인용',
      description: '편안한 소파와 베드로 변환 가능. 방수 패브릭, 세탁 가능한 커버. 간편한 조립.',
      price: 398000,
      stockQuantity: 19,
      categoryId: categoryMap['홈/리빙'],
      imageUrl: 'https://picsum.photos/seed/sofa1/400/400',
    },

    // ── 뷰티 ──
    {
      name: '설화수 윤조에센스 150ml',
      description: '대한민국 대표 한방 에센스. 6가지 선별된 인삼 성분. 촉촉하고 탄력있는 피부로.',
      price: 98000,
      stockQuantity: 164,
      categoryId: categoryMap['뷰티'],
      imageUrl: 'https://picsum.photos/seed/essence1/400/400',
    },
    {
      name: '라네즈 넥타르 윤색 미스트 120ml',
      description: '수분 공급과 동시에 광채 연출. 천연 꿀 추출물 함유. 언제 어디서나 간편하게 사용.',
      price: 35000,
      stockQuantity: 287,
      categoryId: categoryMap['뷰티'],
      imageUrl: 'https://picsum.photos/seed/mist1/400/400',
    },
    {
      name: '헤라 블랙 파운데이션 25ml',
      description: '밀착력 높은 풀커버리지 파운데이션. 23가지 색상. 긴 지속력으로 하루종일 완벽한 피부.',
      price: 65000,
      stockQuantity: 132,
      categoryId: categoryMap['뷰티'],
      imageUrl: 'https://picsum.photos/seed/foundation1/400/400',
    },
    {
      name: '려 자양윤모 샴푸 400ml',
      description: '한방 성분으로 탈모 방지. 풍성하고 윤기있는 모발. 두피 건강 개선에 도움.',
      price: 18900,
      stockQuantity: 423,
      categoryId: categoryMap['뷰티'],
      imageUrl: 'https://picsum.photos/seed/shampoo1/400/400',
    },
    {
      name: '조말론 잉글리쉬 페어 앤 프리지아 오 드 코롱 100ml',
      description: '산뜻하고 과일향이 풍부한 영국 향수. 배와 프리지아의 신선한 블렌드. 데일리 향수로 최적.',
      price: 198000,
      stockQuantity: 56,
      categoryId: categoryMap['뷰티'],
      imageUrl: 'https://picsum.photos/seed/perfume1/400/400',
    },

    // ── 스포츠 ──
    {
      name: '나이키 에어 줌 페가수스 41',
      description: '반응형 쿠셔닝, 경량 메시 어퍼. 일상 러닝부터 마라톤까지. 안정적인 착지감.',
      price: 149000,
      stockQuantity: 98,
      categoryId: categoryMap['스포츠'],
      imageUrl: 'https://picsum.photos/seed/running1/400/400',
    },
    {
      name: '가민 포러너 265 GPS 러닝워치',
      description: 'AMOLED 디스플레이, 고급 러닝 다이나믹 지표. VO2 Max 측정, 훈련 부하 분석. 13일 배터리.',
      price: 598000,
      stockQuantity: 37,
      categoryId: categoryMap['스포츠'],
      imageUrl: 'https://picsum.photos/seed/garmin1/400/400',
    },
    {
      name: '머슬텍 인클라인 벤치프레스 90kg 세트',
      description: '조절 가능한 각도의 인클라인 벤치. 올림픽 바 + 원판 포함. 가정용 홈짐 구성에 최적.',
      price: 289000,
      stockQuantity: 15,
      categoryId: categoryMap['스포츠'],
      imageUrl: 'https://picsum.photos/seed/gym1/400/400',
    },
    {
      name: '요넥스 어쿨드라이 배드민턴 라켓',
      description: '카본 파이버 소재, 경량 84g. 중급자 이상 권장. 파워와 컨트롤의 균형.',
      price: 98000,
      stockQuantity: 62,
      categoryId: categoryMap['스포츠'],
      imageUrl: 'https://picsum.photos/seed/badminton1/400/400',
    },
    {
      name: '블랙야크 등산화 아이거 GTX',
      description: 'Gore-Tex 방수 투습 소재. 비브람 아웃솔로 탁월한 그립력. 가벼운 중등산화.',
      price: 189000,
      stockQuantity: 84,
      categoryId: categoryMap['스포츠'],
      imageUrl: 'https://picsum.photos/seed/hiking1/400/400',
    },
  ];
}

async function seed() {
  console.log('🌱 LiveMart 상품 데이터 시딩 시작...\n');

  // 1. 카테고리 생성
  console.log('📁 카테고리 생성 중...');
  const categoryMap = {};
  for (const cat of CATEGORIES) {
    const result = await fetchJSON(`${BASE_URL}/api/categories?name=${encodeURIComponent(cat.name)}&description=${encodeURIComponent(cat.description)}`, {
      method: 'POST',
    });
    if (result && result.id) {
      categoryMap[cat.name] = result.id;
      console.log(`  ✅ ${cat.name} (ID: ${result.id})`);
    } else {
      // 이미 존재할 수 있음 - 루트 카테고리에서 찾기
      console.log(`  ⚠️  ${cat.name} 생성 실패 또는 이미 존재 - ID 임시 할당`);
      categoryMap[cat.name] = Object.keys(categoryMap).length + 1;
    }
  }

  // 루트 카테고리 조회로 실제 ID 확인
  console.log('\n📋 기존 카테고리 조회 중...');
  const rootCats = await fetchJSON(`${BASE_URL}/api/categories/root`);
  if (rootCats && Array.isArray(rootCats)) {
    for (const cat of rootCats) {
      categoryMap[cat.name] = cat.id;
      console.log(`  📌 ${cat.name} → ID: ${cat.id}`);
    }
  }

  console.log('\n📦 상품 생성 중...');
  const products = getProducts(categoryMap);
  let successCount = 0;
  let failCount = 0;

  for (const product of products) {
    const result = await fetchJSON(`${BASE_URL}/api/products`, {
      method: 'POST',
      body: JSON.stringify({
        ...product,
        sellerId: 1, // 기본 판매자 ID
        status: 'ACTIVE',
      }),
    });

    if (result && result.id) {
      console.log(`  ✅ [${result.id}] ${product.name} - ${product.price.toLocaleString()}원`);
      successCount++;
    } else {
      console.log(`  ❌ 실패: ${product.name}`);
      failCount++;
    }

    // 요청 간격 (rate limit 방지)
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n✨ 시딩 완료!`);
  console.log(`   성공: ${successCount}개 / 실패: ${failCount}개`);
  console.log(`\n🌐 확인: http://localhost:3000`);
}

seed().catch(console.error);
