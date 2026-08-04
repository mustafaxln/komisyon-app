import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'
import { formatMoney, formatPercent } from './format'
import './App.css'

const COMMISSION_VAT_OPTIONS = [0, 1, 10, 20]
const USER_TOKEN_KEY = 'komisyon_user_token'
const USER_INFO_KEY = 'komisyon_user_info'

const emptyForm = {
  marketplaceSlug: '',
  categorySlug: '',
  commissionRate: '',
  commissionVatRate: 20,
  productVatRate: 20,
  salePrice: '',
  productCost: '',
  shippingCost: '',
  adCost: '',
  otherCost: '',
}

function App() {
  const [userToken, setUserToken] = useState(() => localStorage.getItem(USER_TOKEN_KEY) || '')
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_INFO_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('user@komisyon.local')
  const [authPassword, setAuthPassword] = useState('user123')
  const [authName, setAuthName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [tab, setTab] = useState('calc')
  const [marketplaces, setMarketplaces] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [results, setResults] = useState(null)
  const [selectedMarketplace, setSelectedMarketplace] = useState(null)
  const [compareIds, setCompareIds] = useState([])
  const [compareRows, setCompareRows] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function verify() {
      if (!userToken) return
      try {
        const data = await api.userMe(userToken)
        setUser(data.user)
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user))
      } catch {
        localStorage.removeItem(USER_TOKEN_KEY)
        localStorage.removeItem(USER_INFO_KEY)
        setUserToken('')
        setUser(null)
      }
    }
    verify()
  }, [userToken])

  useEffect(() => {
    async function boot() {
      if (!userToken) return
      try {
        const m = await api.getMarketplaces()
        setMarketplaces(m)
        const trendyol = m.find((x) => x.slug === 'trendyol') || m[0]
        if (trendyol) {
          setForm((prev) => ({ ...prev, marketplaceSlug: trendyol.slug }))
          setSelectedMarketplace(trendyol)
          setCompareIds(m.map((x) => x.id))
        }
      } catch (err) {
        setError(err.message)
      }
    }
    boot()
  }, [userToken])

  useEffect(() => {
    async function loadRatesForMarketplace() {
      if (!form.marketplaceSlug) return
      const market = marketplaces.find((m) => m.slug === form.marketplaceSlug)
      setSelectedMarketplace(market || null)
      try {
        const rates = await api.getRatesByMarketplace(form.marketplaceSlug)
        const cats = rates.map((r) => ({
          id: r.category_id,
          name: r.category_name,
          slug: r.category_slug,
          rate: Number(r.rate_percent),
        }))
        setAvailableCategories(cats)
        const preferred =
          cats.find((c) => c.slug === form.categorySlug) ||
          cats.find((c) => c.slug === 'giyim') ||
          cats[0]
        if (preferred) {
          setForm((prev) => ({
            ...prev,
            categorySlug: preferred.slug,
            commissionRate: String(preferred.rate),
          }))
        } else {
          setForm((prev) => ({ ...prev, categorySlug: '', commissionRate: '' }))
        }
      } catch (err) {
        setError(err.message)
      }
    }
    loadRatesForMarketplace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.marketplaceSlug, marketplaces])

  useEffect(() => {
    if (!form.categorySlug || availableCategories.length === 0) return
    const cat = availableCategories.find((c) => c.slug === form.categorySlug)
    if (cat) {
      setForm((prev) => ({ ...prev, commissionRate: String(cat.rate) }))
    }
  }, [form.categorySlug, availableCategories])

  const selectedCategory = useMemo(
    () => availableCategories.find((c) => c.slug === form.categorySlug) || null,
    [availableCategories, form.categorySlug]
  )

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function buildPayload() {
    if (!selectedMarketplace) throw new Error('Pazaryeri seçin')
    return {
      salePrice: Number(form.salePrice),
      productCost: Number(form.productCost || 0),
      shippingCost: Number(form.shippingCost || 0),
      adCost: Number(form.adCost || 0),
      otherCost: Number(form.otherCost || 0),
      commissionRate: Number(form.commissionRate),
      commissionVatRate: Number(form.commissionVatRate),
      productVatRate: Number(form.productVatRate),
      baseType: selectedMarketplace.base_type,
    }
  }

  async function handleCalculate(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const payload = buildPayload()
      const data = await api.calculate(payload)
      setResults(data.results)
      setTab('calc')
    } catch (err) {
      setError(err.message)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!results) return
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const payload = buildPayload()
      await api.saveCalculation({
        marketplaceId: selectedMarketplace?.id || null,
        categoryId: selectedCategory?.id || null,
        inputs: payload,
        results,
      })
      setMessage('Hesaplama geçmişe kaydedildi.')
      if (tab === 'history') {
        const rows = await api.getCalculations()
        setHistory(rows)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCompare(e) {
    e?.preventDefault?.()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      if (compareIds.length === 0) throw new Error('En az bir pazaryeri seçin')
      const data = await api.compare({
        salePrice: Number(form.salePrice),
        productCost: Number(form.productCost || 0),
        shippingCost: Number(form.shippingCost || 0),
        adCost: Number(form.adCost || 0),
        otherCost: Number(form.otherCost || 0),
        commissionVatRate: Number(form.commissionVatRate),
        productVatRate: Number(form.productVatRate),
        marketplaceIds: compareIds,
        categoryId: selectedCategory?.id || null,
      })
      setCompareRows(data.comparisons)
      setTab('compare')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    setError(null)
    setLoading(true)
    try {
      const rows = await api.getCalculations()
      setHistory(rows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteHistoryItem(id) {
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      await api.deleteCalculation(id)
      setMessage(`Kayıt #${id} silindi.`)
      await loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteAllHistory() {
    if (!window.confirm('Tüm hesaplama geçmişi silinsin mi?')) return
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const result = await api.deleteAllCalculations()
      setMessage(`Tüm geçmiş silindi (${result.deleted || 0} kayıt).`)
      setHistory([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /** Geçmiş kaydındaki girdileri forma yükle */
  function applyHistoryInputs(row) {
    const inputs = row.inputs_json || {}
    const slug = row.marketplace_slug || form.marketplaceSlug
    setForm((prev) => ({
      ...prev,
      marketplaceSlug: slug || prev.marketplaceSlug,
      categorySlug: row.category_slug || prev.categorySlug,
      commissionRate:
        inputs.commissionRate != null ? String(inputs.commissionRate) : prev.commissionRate,
      commissionVatRate:
        inputs.commissionVatRate != null ? Number(inputs.commissionVatRate) : prev.commissionVatRate,
      productVatRate:
        inputs.productVatRate != null ? Number(inputs.productVatRate) : prev.productVatRate,
      salePrice: inputs.salePrice != null ? String(inputs.salePrice) : '',
      productCost: inputs.productCost != null ? String(inputs.productCost) : '',
      shippingCost: inputs.shippingCost != null ? String(inputs.shippingCost) : '',
      adCost: inputs.adCost != null ? String(inputs.adCost) : '',
      otherCost: inputs.otherCost != null ? String(inputs.otherCost) : '',
    }))
    if (row.results_json) setResults(row.results_json)
  }

  async function rerunFromHistory(row) {
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      applyHistoryInputs(row)
      const inputs = row.inputs_json || {}
      const market =
        marketplaces.find((m) => m.slug === row.marketplace_slug) ||
        marketplaces.find((m) => m.id === row.marketplace_id)
      if (!market) throw new Error('Pazaryeri bulunamadı')

      const payload = {
        salePrice: Number(inputs.salePrice),
        productCost: Number(inputs.productCost || 0),
        shippingCost: Number(inputs.shippingCost || 0),
        adCost: Number(inputs.adCost || 0),
        otherCost: Number(inputs.otherCost || 0),
        commissionRate: Number(inputs.commissionRate),
        commissionVatRate: Number(inputs.commissionVatRate ?? 20),
        productVatRate: Number(inputs.productVatRate ?? 20),
        baseType: inputs.baseType || market.base_type,
      }
      const data = await api.calculate(payload)
      setSelectedMarketplace(market)
      setResults(data.results)
      setTab('calc')
      setMessage('Geçmiş kayıt tekrar hesaplandı.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function compareFromHistory(row) {
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      applyHistoryInputs(row)
      const inputs = row.inputs_json || {}
      const ids =
        compareIds.length > 0 ? compareIds : marketplaces.map((m) => m.id)
      if (ids.length === 0) throw new Error('Karşılaştırılacak pazaryeri yok')

      setCompareIds(ids)
      const data = await api.compare({
        salePrice: Number(inputs.salePrice),
        productCost: Number(inputs.productCost || 0),
        shippingCost: Number(inputs.shippingCost || 0),
        adCost: Number(inputs.adCost || 0),
        otherCost: Number(inputs.otherCost || 0),
        commissionVatRate: Number(inputs.commissionVatRate ?? 20),
        productVatRate: Number(inputs.productVatRate ?? 20),
        marketplaceIds: ids,
        categoryId: row.category_id || null,
      })
      setCompareRows(data.comparisons)
      setTab('compare')
      setMessage('Geçmiş girdilerle karşılaştırma tekrar çalıştırıldı.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  function toggleCompareId(id) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthLoading(true)
    setError(null)
    setMessage(null)
    try {
      const data =
        authMode === 'login'
          ? await api.userLogin(authEmail, authPassword)
          : await api.userRegister(authEmail, authPassword, authName)
      localStorage.setItem(USER_TOKEN_KEY, data.token)
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user))
      setUserToken(data.token)
      setUser(data.user)
      setMessage(authMode === 'login' ? 'Giriş başarılı.' : 'Kayıt tamamlandı.')
    } catch (err) {
      setError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  function logoutUser() {
    localStorage.removeItem(USER_TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
    setUserToken('')
    setUser(null)
    setMarketplaces([])
    setResults(null)
    setMessage('Çıkış yapıldı.')
  }

  if (!userToken) {
    return (
      <div className="app">
        <header className="top">
          <div>
            <p className="eyebrow">Pazaryeri araçları</p>
            <h1>Komisyon & Kârlılık Hesaplayıcı</h1>
            <p className="sub">Devam etmek için giriş yapın veya hesap oluşturun.</p>
          </div>
          <Link className="back-link" to="/admin">
            Admin
          </Link>
        </header>

        {(error || message) && (
          <div className={`banner ${error ? 'is-error' : 'is-ok'}`}>{error || message}</div>
        )}

        <section className="panel admin-login">
          <div className="tabs" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              Giriş
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Kayıt ol
            </button>
          </div>
          <h2>{authMode === 'login' ? 'Kullanıcı girişi' : 'Yeni hesap'}</h2>
          <form className="form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <label>
                Ad
                <input value={authName} onChange={(e) => setAuthName(e.target.value)} />
              </label>
            )}
            <label>
              E-posta
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Şifre
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <button type="submit" disabled={authLoading}>
              {authLoading ? '…' : authMode === 'login' ? 'Giriş yap' : 'Kayıt ol'}
            </button>
          </form>
          <p className="hint">Demo: user@komisyon.local / user123</p>
        </section>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Pazaryeri araçları</p>
          <h1>Komisyon & Kârlılık Hesaplayıcı</h1>
          <p className="sub">
            {marketplaces.length} pazaryeri · {user?.name || user?.email} — oran seç, net kârı gör.
          </p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <nav className="tabs">
            <button type="button" className={tab === 'calc' ? 'active' : ''} onClick={() => setTab('calc')}>
              Hesapla
            </button>
            <button
              type="button"
              className={tab === 'compare' ? 'active' : ''}
              onClick={() => setTab('compare')}
            >
              Karşılaştır
            </button>
            <button
              type="button"
              className={tab === 'history' ? 'active' : ''}
              onClick={() => setTab('history')}
            >
              Geçmiş
            </button>
          </nav>
          <button type="button" className="ghost" onClick={logoutUser}>
            Çıkış
          </button>
        </div>
      </header>

      {(error || message) && (
        <div className={`banner ${error ? 'is-error' : 'is-ok'}`}>
          {error || message}
        </div>
      )}

      {tab === 'calc' && (
        <div className="layout">
          <form className="panel form" onSubmit={handleCalculate}>
            <h2>Hesaplama formu</h2>

            <label>
              Pazaryeri
              <select
                value={form.marketplaceSlug}
                onChange={(e) => updateField('marketplaceSlug', e.target.value)}
                required
              >
                <option value="" disabled>
                  Seçin
                </option>
                {marketplaces.map((m) => (
                  <option key={m.id} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Kategori
              <select
                value={form.categorySlug}
                onChange={(e) => updateField('categorySlug', e.target.value)}
                required
              >
                <option value="" disabled>
                  Seçin
                </option>
                {availableCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} (%{c.rate})
                  </option>
                ))}
              </select>
            </label>

            <div className="row">
              <label>
                Komisyon oranı (%)
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.commissionRate}
                  onChange={(e) => updateField('commissionRate', e.target.value)}
                  required
                />
                <span className="hint">Preset gelir; istediğin gibi değiştir.</span>
              </label>
              <label>
                Komisyon KDV (%)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.commissionVatRate}
                  onChange={(e) => updateField('commissionVatRate', e.target.value)}
                  required
                />
                <span className="hint">Elle yazabilirsin; hızlı seçim:</span>
                <span className="preset-row">
                  {COMMISSION_VAT_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`preset ${Number(form.commissionVatRate) === v ? 'on' : ''}`}
                      onClick={() => updateField('commissionVatRate', String(v))}
                    >
                      %{v}
                    </button>
                  ))}
                </span>
              </label>
            </div>

            <label>
              Satış fiyatı (KDV dahil, ₺)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.salePrice}
                onChange={(e) => updateField('salePrice', e.target.value)}
                required
              />
            </label>

            <div className="row">
              <label>
                Ürün maliyeti (₺)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.productCost}
                  onChange={(e) => updateField('productCost', e.target.value)}
                />
              </label>
              <label>
                Kargo (₺)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.shippingCost}
                  onChange={(e) => updateField('shippingCost', e.target.value)}
                />
              </label>
            </div>

            <div className="row">
              <label>
                Reklam (₺)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.adCost}
                  onChange={(e) => updateField('adCost', e.target.value)}
                />
              </label>
              <label>
                Diğer / hizmet (₺)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.otherCost}
                  onChange={(e) => updateField('otherCost', e.target.value)}
                />
              </label>
            </div>

            {selectedMarketplace && (
              <p className="hint">
                Matrah tipi: <strong>{selectedMarketplace.base_type === 'ex_vat' ? 'KDV hariç (matrah)' : 'KDV dahil'}</strong>
              </p>
            )}

            <div className="actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Hesaplanıyor…' : 'Hesapla'}
              </button>
              <button type="button" className="ghost" onClick={handleCompare} disabled={loading || !form.salePrice}>
                Pazaryerleriyle karşılaştır
              </button>
            </div>
          </form>

          <section className="panel results">
            <h2>Sonuç</h2>
            {!results && <p className="muted">Formu doldurup Hesapla’ya bas.</p>}
            {results && (
              <>
                <div className="result-grid">
                  <div>
                    <span>Komisyon</span>
                    <strong>{formatMoney(results.commission)}</strong>
                  </div>
                  <div>
                    <span>Komisyon KDV</span>
                    <strong>{formatMoney(results.commissionVat)}</strong>
                  </div>
                  <div className="accent">
                    <span>Net kâr</span>
                    <strong>{formatMoney(results.netProfit)}</strong>
                  </div>
                  <div className="accent">
                    <span>Kâr marjı</span>
                    <strong>{formatPercent(results.profitMargin)}</strong>
                  </div>
                  <div>
                    <span>Başabaş fiyat</span>
                    <strong>{formatMoney(results.breakEvenPrice)}</strong>
                  </div>
                  <div>
                    <span>Toplam kesinti</span>
                    <strong>{formatMoney(results.totalDeductions)}</strong>
                  </div>
                </div>
                {results.breakEvenNote && <p className="hint">{results.breakEvenNote}</p>}
                <button type="button" className="ghost" onClick={handleSave} disabled={loading}>
                  Geçmişe kaydet
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {tab === 'compare' && (
        <div className="layout single">
          <section className="panel">
            <h2>Karşılaştırma</h2>
            <p className="muted">
              Aynı satış/maliyet bilgisiyle seçili pazaryerlerinin preset oranlarını yan yana gör.
            </p>

            <div className="chip-grid">
              {marketplaces.map((m) => (
                <label key={m.id} className={`chip ${compareIds.includes(m.id) ? 'on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={compareIds.includes(m.id)}
                    onChange={() => toggleCompareId(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>

            <div className="actions">
              <button type="button" onClick={handleCompare} disabled={loading || !form.salePrice}>
                Karşılaştırmayı çalıştır
              </button>
            </div>

            {!form.salePrice && (
              <p className="hint">Önce Hesapla sekmesinde satış fiyatı gir.</p>
            )}

            {compareRows.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pazaryeri</th>
                      <th>Oran</th>
                      <th>Komisyon</th>
                      <th>Net kâr</th>
                      <th>Marj</th>
                      <th>Başabaş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.marketplaceId}>
                        <td>{row.marketplaceName}</td>
                        {row.error ? (
                          <td colSpan={5}>{row.error}</td>
                        ) : (
                          <>
                            <td>{formatPercent(row.commissionRate)}</td>
                            <td>{formatMoney(row.results.commission)}</td>
                            <td>{formatMoney(row.results.netProfit)}</td>
                            <td>{formatPercent(row.results.profitMargin)}</td>
                            <td>{formatMoney(row.results.breakEvenPrice)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'history' && (
        <div className="layout single">
          <section className="panel">
            <div className="panel-head">
              <h2>Hesaplama geçmişi</h2>
              <div className="actions">
                <button type="button" className="ghost" onClick={loadHistory} disabled={loading}>
                  Yenile
                </button>
                {history.length > 0 && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={deleteAllHistory}
                    disabled={loading}
                  >
                    Tüm geçmişi sil
                  </button>
                )}
              </div>
            </div>
            {history.length === 0 && <p className="muted">Henüz kayıt yok.</p>}
            {history.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Pazaryeri</th>
                      <th>Kategori</th>
                      <th>Satış</th>
                      <th>Net kâr</th>
                      <th>Marj</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.created_at).toLocaleString('tr-TR')}</td>
                        <td>{row.marketplace_name || '—'}</td>
                        <td>{row.category_name || '—'}</td>
                        <td>{formatMoney(row.inputs_json?.salePrice)}</td>
                        <td>{formatMoney(row.results_json?.netProfit)}</td>
                        <td>{formatPercent(row.results_json?.profitMargin)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => rerunFromHistory(row)}
                              disabled={loading}
                            >
                              Tekrar hesapla
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => compareFromHistory(row)}
                              disabled={loading}
                            >
                              Karşılaştır
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => deleteHistoryItem(row.id)}
                              disabled={loading}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
