import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import './App.css'

const TOKEN_KEY = 'komisyon_admin_token'

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
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [authDrafts, setAuthDrafts] = useState({})
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
        `Toplu scraping: ${s.updated || 0} güncellendi, ${s.failed || 0} başarısız, ${s.waitingAuth || 0} giriş bekliyor, ${s.unavailable || 0} erişilemiyor.`
      )
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveAuth(slug) {
    const draft = authDrafts[slug] || {}
    if (!draft.username || !draft.password) {
      setError('Kullanıcı adı ve şifre gerekli.')
      return
    }
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api.adminMarketplaceAuth(token, slug, {
        username: draft.username,
        password: draft.password,
      })
      setMessage(result.message)
      setAuthDrafts((prev) => ({ ...prev, [slug]: { username: draft.username, password: '' } }))
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function clearAuth(slug) {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      await api.adminClearMarketplaceAuth(token, slug)
      setMessage(`${slug} kimlik bilgileri silindi.`)
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function markUnavailable(slug) {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      await api.adminSetMarketplaceStatus(token, slug, {
        update_status: 'unavailable',
        scrape_notes: 'Scraping ile erişilemiyor — manuel güncelleme gerekir.',
      })
      setMessage(`${slug} "güncellenemiyor" grubuna alındı.`)
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
            AI yok. Pazaryerleri erişim durumuna göre gruplanır: doğrudan scraping, giriş sonrası
            scraping, güncellenemeyenler.
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
                  Uygun olanları scraping ile güncelle
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
                {accessGroups.totals.auth_required} · Güncellenemiyor:{' '}
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
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => markUnavailable(m.slug)}
                            disabled={loading}
                          >
                            Erişilemiyor olarak ayır
                          </button>
                        </div>
                      )}

                      {group.key === 'auth_required' && (
                        <div className="auth-block">
                          {m.auth_status !== 'authenticated' ? (
                            <div className="row auth-form-row">
                              <label>
                                Kullanıcı / e-posta
                                <input
                                  value={authDrafts[m.slug]?.username || ''}
                                  onChange={(e) =>
                                    setAuthDrafts((prev) => ({
                                      ...prev,
                                      [m.slug]: {
                                        ...prev[m.slug],
                                        username: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="satıcı paneli hesabı"
                                />
                              </label>
                              <label>
                                Şifre
                                <input
                                  type="password"
                                  value={authDrafts[m.slug]?.password || ''}
                                  onChange={(e) =>
                                    setAuthDrafts((prev) => ({
                                      ...prev,
                                      [m.slug]: {
                                        ...prev[m.slug],
                                        password: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="••••••••"
                                />
                              </label>
                            </div>
                          ) : (
                            <p className="hint">
                              Kayıtlı hesap: {m.credential_username || '—'} · Auth:{' '}
                              {formatTime(m.authenticated_at)}
                            </p>
                          )}
                          <div className="actions">
                            {m.auth_status !== 'authenticated' ? (
                              <button
                                type="button"
                                onClick={() => saveAuth(m.slug)}
                                disabled={loading}
                              >
                                Giriş bilgilerini kaydet
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => scrapeOne(m.slug)}
                                  disabled={loading}
                                >
                                  Auth sonrası scraping çalıştır
                                </button>
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => clearAuth(m.slug)}
                                  disabled={loading}
                                >
                                  Girişi kaldır
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => markUnavailable(m.slug)}
                              disabled={loading}
                            >
                              Erişilemiyor olarak ayır
                            </button>
                          </div>
                        </div>
                      )}

                      {group.key === 'unavailable' && (
                        <p className="hint">
                          Bu pazaryeri scraping ile güncellenemez. Aşağıdaki oran tablosundan manuel
                          düzenleyin.
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
                <select value={filterMarketId} onChange={(e) => setFilterMarketId(e.target.value)}>
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
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            <p className="hint">{filteredRates.length} kayıt listeleniyor</p>

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
                  {filteredRates.map((row) => (
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
          </section>
        </>
      )}
    </div>
  )
}
