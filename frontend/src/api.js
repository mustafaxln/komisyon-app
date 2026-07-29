const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `İstek başarısız (${res.status})`)
  }
  return data
}

export const api = {
  getMarketplaces: () => request('/api/marketplaces'),
  getCategories: () => request('/api/categories'),
  getRates: (marketplace, category) =>
    request(`/api/rates?marketplace=${encodeURIComponent(marketplace)}&category=${encodeURIComponent(category)}`),
  getRatesByMarketplace: (marketplace) =>
    request(`/api/rates?marketplace=${encodeURIComponent(marketplace)}`),
  calculate: (body) =>
    request('/api/calculate', { method: 'POST', body: JSON.stringify(body) }),
  compare: (body) =>
    request('/api/calculate/compare', { method: 'POST', body: JSON.stringify(body) }),
  saveCalculation: (body) =>
    request('/api/calculations', { method: 'POST', body: JSON.stringify(body) }),
  getCalculations: (limit = 20) => request(`/api/calculations?limit=${limit}`),
  health: () => request('/api/health'),
}
