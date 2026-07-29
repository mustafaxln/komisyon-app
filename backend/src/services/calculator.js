/**
 * Pazaryeri komisyon / net kâr / başabaş hesaplama motoru
 *
 * baseType:
 *  - ex_vat: komisyon KDV hariç satış (matrah) üzerinden (ör. Trendyol, N11)
 *  - inc_vat: komisyon KDV dahil satış üzerinden (ör. Hepsiburada, Amazon)
 */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/**
 * @param {object} input
 * @param {number} input.salePrice - KDV dahil satış fiyatı (P)
 * @param {number} input.productCost - ürün maliyeti (C)
 * @param {number} input.shippingCost - kargo (S)
 * @param {number} [input.adCost=0] - reklam (A)
 * @param {number} [input.otherCost=0] - diğer gider (O)
 * @param {number} input.commissionRate - komisyon % (r)
 * @param {number} [input.commissionVatRate=20] - komisyon KDV % (k)
 * @param {number} [input.productVatRate=20] - ürün KDV % (v)
 * @param {'ex_vat'|'inc_vat'} input.baseType
 */
function calculate(input) {
  const salePrice = toNumber(input.salePrice);
  const productCost = toNumber(input.productCost);
  const shippingCost = toNumber(input.shippingCost);
  const adCost = toNumber(input.adCost, 0);
  const otherCost = toNumber(input.otherCost, 0);
  const commissionRate = toNumber(input.commissionRate);
  const commissionVatRate = toNumber(input.commissionVatRate, 20);
  const productVatRate = toNumber(input.productVatRate, 20);
  const baseType = input.baseType === 'inc_vat' ? 'inc_vat' : 'ex_vat';

  if (salePrice < 0 || commissionRate < 0) {
    const err = new Error('Geçersiz giriş değerleri');
    err.status = 400;
    throw err;
  }

  const vatFactor = 1 + productVatRate / 100;
  const matrah = salePrice / vatFactor;
  const commissionBase = baseType === 'ex_vat' ? matrah : salePrice;
  const commission = commissionBase * (commissionRate / 100);
  const commissionVat = commission * (commissionVatRate / 100);
  const fixedCosts = productCost + shippingCost + adCost + otherCost;
  const totalDeductions = commission + commissionVat + fixedCosts;
  const netProfit = salePrice - totalDeductions;
  const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

  const commissionFactor = (commissionRate / 100) * (1 + commissionVatRate / 100);
  let breakEvenPrice = null;
  let breakEvenNote = null;

  if (baseType === 'ex_vat') {
    const denominator = 1 - commissionFactor / vatFactor;
    if (denominator > 0.0001) {
      breakEvenPrice = fixedCosts / denominator;
    } else {
      breakEvenNote = 'Başabaş fiyat hesaplanamadı (komisyon faktörü çok yüksek).';
    }
  } else {
    const denominator = 1 - commissionFactor;
    if (denominator > 0.0001) {
      breakEvenPrice = fixedCosts / denominator;
    } else {
      breakEvenNote = 'Başabaş fiyat hesaplanamadı (komisyon faktörü çok yüksek).';
    }
  }

  return {
    baseType,
    salePrice: round2(salePrice),
    matrah: round2(matrah),
    commissionBase: round2(commissionBase),
    commissionRate: round4(commissionRate),
    commission: round2(commission),
    commissionVatRate: round4(commissionVatRate),
    commissionVat: round2(commissionVat),
    productCost: round2(productCost),
    shippingCost: round2(shippingCost),
    adCost: round2(adCost),
    otherCost: round2(otherCost),
    fixedCosts: round2(fixedCosts),
    totalDeductions: round2(totalDeductions),
    netProfit: round2(netProfit),
    profitMargin: round2(profitMargin),
    breakEvenPrice: breakEvenPrice == null ? null : round2(breakEvenPrice),
    breakEvenNote,
  };
}

module.exports = { calculate, round2 };
