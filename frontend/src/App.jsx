import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { formatMoney, formatPercent } from './format'
import './App.css'

const COMMISSION_VAT_OPTIONS = [0, 1, 10, 20]

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
    async function boot() {
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
  }, [])

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

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  function toggleCompareId(id) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Pazaryeri araçları</p>
          <h1>Komisyon & Kârlılık Hesaplayıcı</h1>
          <p className="sub">
            Pazaryeri ve kategori seç, oranı isteğe göre düzenle; net kâr, marj ve başabaş fiyatı gör.
          </p>
        </div>
        <nav className="tabs">
          <button type="button" className={tab === 'calc' ? 'active' : ''} onClick={() => setTab('calc')}>
            Hesapla
          </button>
          <button type="button" className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>
            Karşılaştır
          </button>
          <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            Geçmiş
          </button>
        </nav>
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
              <button type="button" className="ghost" onClick={loadHistory} disabled={loading}>
                Yenile
              </button>
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
