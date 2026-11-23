export const BASE_CURRENCY = 'KES'

const fallbackCurrencyCodes = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD',
  'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP',
  'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR',
  'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS',
  'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR',
  'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP',
  'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO',
  'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN',
  'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG',
  'SEK', 'SGD', 'SHP', 'SLE', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC',
  'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD',
  'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST',
  'XAF', 'XCD', 'XCG', 'XDR', 'XOF', 'XPF', 'XSU', 'YER', 'ZAR', 'ZMW',
  'ZWG', 'ZWL',
]

export function getCurrencyCodes() {
  try {
    return Array.from(
      new Set([...Intl.supportedValuesOf('currency'), ...fallbackCurrencyCodes]),
    )
  } catch {
    return fallbackCurrencyCodes
  }
}

const currencyNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'currency' })
    : null

const additionalCurrencyNames = {
  CLF: 'Chilean Unit of Account',
  CNH: 'Chinese Yuan (Offshore)',
  FOK: 'Faroese Króna',
  GGP: 'Guernsey Pound',
  IMP: 'Manx Pound',
  JEP: 'Jersey Pound',
  KID: 'Kiribati Dollar',
  SLE: 'Sierra Leonean Leone',
  TVD: 'Tuvaluan Dollar',
  XCG: 'Caribbean Guilder',
  ZWG: 'Zimbabwe Gold',
}

export function getCurrencyName(code) {
  return additionalCurrencyNames[code] || currencyNames?.of(code) || code
}

const formatterCache = new Map()
const kshNumberFormatter = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 2,
})

export function formatCurrencyValue(amount, currency) {
  if (!Number.isFinite(amount)) return '—'
  if (currency === BASE_CURRENCY) {
    return `KSh ${kshNumberFormatter.format(amount)}`
  }

  const locale = 'en-KE'
  const cacheKey = `${locale}:${currency}`
  let formatter = formatterCache.get(cacheKey)

  if (!formatter) {
    const fractionDigits = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    })
    formatterCache.set(cacheKey, formatter)
  }

  return formatter.format(amount)
}

export function getCurrencyFractionDigits(currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits
}
