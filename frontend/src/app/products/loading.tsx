export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse">
        <div className="h-8 rounded w-48 mb-6" style={{ background: '#EDEBE4' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(14,14,14,0.07)' }}>
              <div className="h-48 mb-4" style={{ background: '#EDEBE4' }} />
              <div className="h-4 rounded w-3/4 mb-2" style={{ background: '#EDEBE4' }} />
              <div className="h-4 rounded w-1/2 mb-4" style={{ background: '#EDEBE4' }} />
              <div className="h-6 rounded w-1/3" style={{ background: '#EDEBE4' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
