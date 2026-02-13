export default function HealthPage() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '48px', color: '#2563eb' }}>✅ Frontend is Working!</h1>
      <p style={{ fontSize: '24px', marginTop: '20px' }}>
        Next.js 프론트엔드가 정상적으로 실행 중입니다.
      </p>
      <div style={{ marginTop: '30px' }}>
        <a href="/" style={{ color: '#2563eb', fontSize: '18px' }}>→ 메인 페이지로 이동</a>
      </div>
      <div style={{ marginTop: '10px' }}>
        <a href="/test" style={{ color: '#2563eb', fontSize: '18px' }}>→ 통합 테스트 페이지로 이동</a>
      </div>
    </div>
  );
}
