import { getCurrencyCodes } from './currencyData.js'

const RATE_CACHE_KEY = 'finance-tracker.exchange-rates.kes.v3'
const RATE_URL = 'https://latest.currency-api.pages.dev/v1/currencies/kes.json'
const supportedCurrencyCodes = new Set(getCurrencyCodes())

let pendingRequest

function isValidRateData(value) {
  return (
    value?.base_code === 'KES' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date || '') &&
    value.rates &&
    value.rates.KES === 1 &&
    typeof value.time_last_update_unix === 'number' &&
    typeof value.time_next_update_unix === 'number' &&
    Object.entries(value.rates).every(
      ([code, rate]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0,
    )
  )
}

function normalizeRateData(payload) {
  if (!payload || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date || '') || !payload.kes) {
    throw new Error('Exchange-rate service returned an unsupported format.')
  }

  const rates = Object.fromEntries(
    Object.entries(payload.kes)
      .filter(
        ([code, rate]) =>
          /^[a-z]{3}$/.test(code) &&
          supportedCurrencyCodes.has(code.toUpperCase()) &&
          Number.isFinite(rate) &&
          rate > 0,
      )
      .map(([code, rate]) => [code.toUpperCase(), rate]),
  )
  const rateDate = Date.parse(`${payload.date}T00:00:00Z`)

  if (!Number.isFinite(rateDate) || rates.KES !== 1) {
    throw new Error('Exchange-rate service returned invalid KSh rates.')
  }

  return {
    base_code: 'KES',
    date: payload.date,
    rates,
    time_last_update_unix: rateDate / 1000,
    time_next_update_unix: rateDate / 1000 + 24 * 60 * 60,
  }
}

export function readCachedExchangeRates() {
  const saved = window.localStorage.getItem(RATE_CACHE_KEY)
  if (saved === null) return null

  const parsed = JSON.parse(saved)
  if (!isValidRateData(parsed)) {
    throw new Error('The saved exchange-rate data has an unsupported format.')
  }

  return parsed
}

export function saveCachedExchangeRates(rateData) {
  window.localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(rateData))
}

export function fetchKshExchangeRates() {
  if (!pendingRequest) {
    pendingRequest = fetch(RATE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Exchange-rate service returned ${response.status}.`)
        }
        return response.json()
      })
      .then(normalizeRateData)
      .finally(() => {
        pendingRequest = null
      })
  }

  return pendingRequest
}
