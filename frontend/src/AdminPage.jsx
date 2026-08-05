import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import './App.css'

const TOKEN_KEY = 'komisyon_admin_token'
const RATES_PAGE_SIZE = 20

const STATUS_BADGE = {
  scrape_ready: 'badge-ready',
  auth_required: 'badge-auth',
  unavailable: 'badge-blocked',
}

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('tr-TR')
  } catch {
    return iso
  }
}

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [email, setEmail] = useState('admin@komisyon.local')
  const [password, setPassword] = useState('admin123')
  const [marketplaces, setMarketplaces] = useState([])
  const [accessGroups, setAccessGroups] = useState(null)
  const [rates, setRates] = useState([])
  const [filterMarketId, setFilterMarketId] = useState('')
  const [search, setSearch] = useState('')
  const [ratesPage, setRatesPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const filteredRates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rates.filter((r) => {
      if (filterMarketId && String(r.marketplace_id) !== String(filterMarketId)) return false
      if (!q) return true
      return (
        r.category_name?.toLowerCase().includes(q) ||
        r.marketplace_name?.toLowerCase().includes(q) ||
        r.category_slug?.toLowerCase().includes(q)
      )
    })
  }, [rates, filterMarketId, search])

  const ratesTotalPages = Math.max(1, Math.ceil(filteredRates.length / RATES_PAGE_SIZE))
  const safeRatesPage = Math.min(ratesPage, ratesTotalPages)

  const pagedRates = useMemo(() => {
    const start = (safeRatesPage - 1) * RATES_PAGE_SIZE
    return filteredRates.slice(start, start + RATES_PAGE_SIZE)
  }, [filteredRates, safeRatesPage])

  const ratesPageNumbers = useMemo(() => {
    const total = ratesTotalPages
    const current = safeRatesPage
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = new Set([1, total, current, current - 1, current + 1])
    if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
    if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p))
    return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  }, [ratesTotalPages, safeRatesPage])

  async function loadAll(activeToken = token) {
    if (!activeToken) return
    setLoading(true)
    try {
      const [rows, markets, groups] = await Promise.all([
        api.adminRates(activeToken),
        api.getMarketplaces(),
        api.adminAccessGroups(activeToken),
      ])
      setRates(rows)
      setMarketplaces(markets)
      setAccessGroups(groups)
      const nextDrafts = {}
      rows.forEach((r) => {
        nextDrafts[r.id] = {
          rate: String(r.rate_percent),
          note: r.source_note || '',
        }
      })
      setDrafts(nextDrafts)
      setError(null)
    } catch (err) {
      setError(err.message)
      if (String(err.message).toLowerCase().includes('yetkisiz')) {
        localStorage.removeItem(TOKEN_KEY)
        setToken('')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadAll(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const data = await api.adminLogin(email, password)
      localStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
      setMessage('Giriş başarılı.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setRates([])
    setAccessGroups(null)
    setMessage('Çıkış yapıldı.')
  }

  async function saveRate(id) {
    const draft = drafts[id]
    if (!draft) return
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      await api.adminUpdateRate(token, id, {
        rate_percent: Number(draft.rate),
        source_note: draft.note,
      })
      setMessage(`Oran güncellendi (#${id}).`)
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function scrapeOne(slug) {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api.adminScrapeMarketplace(token, slug)
      setMessage(result.message || `${slug} scraping tamamlandı.`)
      await loadAll()
    } catch (err) {
      setError(err.message)
      await loadAll()
    } finally {
      setLoading(false)
    }
  }

  async function scrapeAll() {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api.adminScrapeAll(token)
      const s = result.summary || {}
      setMessage(
        `Scraping (sadece erişilebilirler): ${s.updated || 0} güncellendi, ${s.failed || 0} başarısız · atlandı: auth=${s.waitingAuth || 0}, erişilemiyor=${s.unavailable || 0}`
      )
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Yönetim</p>
          <h1>Admin — Komisyon & scraping</h1>
          <p className="sub">
            20 pazaryeri erişim durumuna göre gruplanır. Şimdilik yalnızca web scraping ile
            erişilebilenler güncellenir; diğer gruplara dokunulmaz.
          </p>
        </div>
        <Link className="back-link" to="/">
          ← Hesaplayıcıya dön
        </Link>
      </header>

      {(error || message) && (
        <div className={`banner ${error ? 'is-error' : 'is-ok'}`}>
          {error || message}
        </div>
      )}

      {!token && (
        <section className="panel admin-login">
          <h2>Admin girişi</h2>
          <form className="form" onSubmit={handleLogin}>
            <label>
              E-posta
              <input value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Şifre
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Giriş…' : 'Giriş yap'}
            </button>
          </form>
        </section>
      )}

      {token && (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Pazaryeri erişim grupları</h2>
              <div className="actions">
                <button type="button" onClick={scrapeAll} disabled={loading}>
                  Scraping ile güncelle (sadece erişilebilirler)
                </button>
                <button type="button" className="ghost" onClick={() => loadAll()} disabled={loading}>
                  Yenile
                </button>
                <button type="button" className="ghost" onClick={logout}>
                  Çıkış
                </button>
              </div>
            </div>

            {accessGroups?.totals && (
              <p className="hint">
                Doğrudan: {accessGroups.totals.scrape_ready} · Giriş gerekli:{' '}
                {accessGroups.totals.auth_required} · Doğrudan erişilemiyor:{' '}
                {accessGroups.totals.unavailable}
              </p>
            )}

            <div className="group-stack">
              {(accessGroups?.groups || []).map((group) => (
                <div key={group.key} className={`access-group group-${group.key}`}>
                  <div className="access-group-head">
                    <h3>{group.label}</h3>
                    <span className={`status-badge ${STATUS_BADGE[group.key]}`}>
                      {group.items.length}
                    </span>
                  </div>
                  <p className="group-desc">{group.description}</p>

                  {group.items.length === 0 && (
                    <p className="hint">Bu grupta pazaryeri yok.</p>
                  )}

                  {group.items.map((m) => (
                    <div key={m.slug} className="market-row">
                      <div className="market-row-main">
                        <strong>{m.name}</strong>
                        <span className="muted">{m.slug}</span>
                        {m.update_status === 'auth_required' && (
                          <span
                            className={`status-badge ${
                              m.auth_status === 'authenticated' ? 'badge-ready' : 'badge-auth'
                            }`}
                          >
                            {m.auth_status === 'authenticated'
                              ? 'Giriş yapıldı'
                              : m.auth_status === 'failed'
                                ? 'Giriş başarısız'
                                : 'Giriş bekleniyor'}
                          </span>
                        )}
                      </div>
                      <p className="hint">{m.scrape_notes || '—'}</p>
                      {m.last_scrape_message && (
                        <p className="scrape-msg">
                          Son durum ({formatTime(m.last_scraped_at)}): {m.last_scrape_message}
                        </p>
                      )}

                      {group.key === 'scrape_ready' && (
                        <div className="actions">
                          <button
                            type="button"
                            onClick={() => scrapeOne(m.slug)}
                            disabled={loading}
                          >
                            Scraping ile güncelle
                          </button>
                        </div>
                      )}

                      {group.key === 'auth_required' && (
                        <p className="hint">
                          Belirli giriş / gereksinim sonrası erişilebilir. Şimdilik işimiz yok —
                          sadece gruplandı.
                        </p>
                      )}

                      {group.key === 'unavailable' && (
                        <p className="hint">
                          Kamuya açık komisyon kaynağı yok veya engelli. Oranlar manuel kalır;
                          admin panelinden güncelleyebilirsiniz.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Oranları manuel güncelle</h2>
            </div>

            <div className="row">
              <label>
                Pazaryeri
                <select
                  value={filterMarketId}
                  onChange={(e) => {
                    setFilterMarketId(e.target.value)
                    setRatesPage(1)
                  }}
                >
                  <option value="">Tümü</option>
                  {marketplaces.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.update_status ? ` (${m.update_status})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kategori ara
                <input
                  type="search"
                  placeholder="ör. giyim, telefon…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setRatesPage(1)
                  }}
                />
              </label>
            </div>

            <p className="hint">
              {filteredRates.length} kayıt · sayfa {safeRatesPage}/{ratesTotalPages} · sayfada{' '}
              {pagedRates.length} satır
            </p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pazaryeri</th>
                    <th>Kategori</th>
                    <th>Oran %</th>
                    <th>Not</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Filtreye uyan kayıt yok.
                      </td>
                    </tr>
                  )}
                  {pagedRates.map((row) => (
                    <tr key={row.id}>
                      <td>{row.marketplace_name}</td>
                      <td>{row.category_name}</td>
                      <td>
                        <input
                          className="table-input"
                          type="number"
                          step="0.001"
                          min="0"
                          value={drafts[row.id]?.rate ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], rate: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="table-input wide"
                          value={drafts[row.id]?.note ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...prev[row.id], note: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button type="button" onClick={() => saveRate(row.id)} disabled={loading}>
                          Güncelle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRates.length > RATES_PAGE_SIZE && (
              <nav className="pagination" aria-label="Oran listesi sayfalama">
                <button
                  type="button"
                  className="ghost"
                  disabled={safeRatesPage <= 1}
                  onClick={() => setRatesPage((p) => Math.max(1, p - 1))}
                >
                  ← Önceki
                </button>
                <div className="pagination-pages">
                  {ratesPageNumbers.map((pageNum, idx) => {
                    const prev = ratesPageNumbers[idx - 1]
                    const showGap = prev != null && pageNum - prev > 1
                    return (
                      <span key={pageNum} className="pagination-item">
                        {showGap && <span className="pagination-ellipsis">…</span>}
                        <button
                          type="button"
                          className={pageNum === safeRatesPage ? 'page-btn is-active' : 'page-btn ghost'}
                          onClick={() => setRatesPage(pageNum)}
                          aria-current={pageNum === safeRatesPage ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      </span>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="ghost"
                  disabled={safeRatesPage >= ratesTotalPages}
                  onClick={() => setRatesPage((p) => Math.min(ratesTotalPages, p + 1))}
                >
                  Sonraki →
                </button>
              </nav>
            )}
          </section>
        </>
      )}
    </div>
  )
}
