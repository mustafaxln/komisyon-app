import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import './App.css'

const TOKEN_KEY = 'komisyon_admin_token'

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [email, setEmail] = useState('admin@komisyon.local')
  const [password, setPassword] = useState('admin123')
  const [marketplaces, setMarketplaces] = useState([])
  const [rates, setRates] = useState([])
  const [filterMarketId, setFilterMarketId] = useState('')
  const [search, setSearch] = useState('')
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

  async function loadRates(activeToken = token) {
    if (!activeToken) return
    setLoading(true)
    try {
      const [rows, markets] = await Promise.all([
        api.adminRates(activeToken),
        api.getMarketplaces(),
      ])
      setRates(rows)
      setMarketplaces(markets)
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
    if (token) loadRates(token)
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
      await loadRates()
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
          <h1>Admin — Komisyon oranları</h1>
          <p className="sub">Mevcut preset oranları bulup güncelle. Kullanıcı arayüzünde bu sayfa görünmez.</p>
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
        <section className="panel">
          <div className="panel-head">
            <h2>Oranları güncelle</h2>
            <div className="actions">
              <button type="button" className="ghost" onClick={() => loadRates()} disabled={loading}>
                Yenile
              </button>
              <button type="button" className="ghost" onClick={logout}>
                Çıkış
              </button>
            </div>
          </div>

          <div className="row">
            <label>
              Pazaryeri
              <select value={filterMarketId} onChange={(e) => setFilterMarketId(e.target.value)}>
                <option value="">Tümü</option>
                {marketplaces.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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
      )}
    </div>
  )
}
