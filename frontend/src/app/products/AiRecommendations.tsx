async function getAiRecommendations() {
  try {
    const res = await fetch('http://localhost:8080/api/ai/recommendations?userId=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([1, 2, 3]),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function AiRecommendations() {
  const recommendations = await getAiRecommendations();

  if (!recommendations) {
    return null;
  }

  return (
    <section className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">✨</span>
        <h2 className="text-xl font-bold text-gray-900">AI Recommendations</h2>
        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
          Powered by Spring AI
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Based on your browsing history, we think you might like these products.
      </p>
      <div className="bg-white rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
        {typeof recommendations.result === 'string'
          ? recommendations.result
          : JSON.stringify(recommendations.result, null, 2)}
      </div>
    </section>
  );
}
