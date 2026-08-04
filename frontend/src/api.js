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
    throw new Error(data.error || data.message || `İstek başarısız (${res.status})`)
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
  userLogin: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  userRegister: (email, password, name) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  userMe: (token) => request('/api/auth/me', { token }),
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
  getAccessGroups: () => request('/api/marketplaces/access-groups'),
  adminAccessGroups: (token) =>
    request('/api/admin/marketplaces/access-groups', { token }),
  adminScrapeAll: (token) =>
    request('/api/admin/marketplaces/scrape-all', { method: 'POST', token, body: '{}' }),
  adminScrapeMarketplace: (token, slug, body = {}) =>
    request(`/api/admin/marketplaces/${encodeURIComponent(slug)}/scrape`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  adminMarketplaceAuth: (token, slug, body) =>
    request(`/api/admin/marketplaces/${encodeURIComponent(slug)}/auth`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),
  adminClearMarketplaceAuth: (token, slug) =>
    request(`/api/admin/marketplaces/${encodeURIComponent(slug)}/auth`, {
      method: 'DELETE',
      token,
    }),
  adminSetMarketplaceStatus: (token, slug, body) =>
    request(`/api/admin/marketplaces/${encodeURIComponent(slug)}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    }),
}
