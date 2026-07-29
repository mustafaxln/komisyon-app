const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const { token, ...fetchOptions } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
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
  adminLogin: (email, password) =>
    request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminRates: (token, marketplaceId) =>
    request(
      marketplaceId ? `/api/admin/rates?marketplaceId=${marketplaceId}` : '/api/admin/rates',
      { token }
    ),
  adminUpdateRate: (token, id, body) =>
    request(`/api/admin/rates/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    }),
  adminCreateRate: (token, body) =>
    request('/api/admin/rates', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  adminDeleteRate: (token, id) =>
    request(`/api/admin/rates/${id}`, { method: 'DELETE', token }),
}
