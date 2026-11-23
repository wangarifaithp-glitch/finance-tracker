import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BASE_CURRENCY,
  formatCurrencyValue,
  getCurrencyCodes,
  getCurrencyFractionDigits,
  getCurrencyName,
} from '../data/currencyData.js'
import {
  fetchKshExchangeRates,
  readCachedExchangeRates,
  saveCachedExchangeRates,
} from '../data/exchangeRates.js'
import { CurrencyContext } from './currencyContext.js'

const PREFERENCE_KEY = 'finance-tracker.preferred-currency.v1'

function readPreferredCurrency() {
  try {
    const storedCurrency = window.localStorage.getItem(PREFERENCE_KEY)
    if (!/^[A-Z]{3}$/.test(storedCurrency || '')) return BASE_CURRENCY
    new Intl.NumberFormat('en', { style: 'currency', currency: storedCurrency })
    return storedCurrency
  } catch (error) {
    console.error('Unable to read the preferred currency.', error)
    return BASE_CURRENCY
  }
}

function readInitialRates() {
  try {
    return readCachedExchangeRates()
  } catch (error) {
    console.error('Unable to read cached exchange rates.', error)
    return null
  }
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(readPreferredCurrency)
  const [exchangeRates, setExchangeRates] = useState(readInitialRates)
  const ratesRef = useRef(exchangeRates)
  const [rateStatus, setRateStatus] = useState(() => {
    if (!exchangeRates) return 'loading'
    return exchangeRates.time_next_update_unix * 1000 > Date.now()
      ? 'ready'
      : 'refreshing'
  })
  const [rateError, setRateError] = useState('')
  const [preferenceStorageError, setPreferenceStorageError] = useState('')

  const refreshRates = useCallback(async (force = true) => {
    const cachedRates = ratesRef.current
    if (
      !force &&
      cachedRates &&
      cachedRates.time_next_update_unix * 1000 > Date.now()
    ) {
      setRateStatus('ready')
      return
    }

    setRateStatus(cachedRates ? 'refreshing' : 'loading')
    setRateError('')

    try {
      const nextRates = await fetchKshExchangeRates()
      ratesRef.current = nextRates
      setExchangeRates(nextRates)
      setRateStatus('ready')
      try {
        saveCachedExchangeRates(nextRates)
      } catch (error) {
        console.error('Unable to cache exchange rates.', error)
        setRateError('Rates loaded, but could not be cached for offline use.')
      }
    } catch (error) {
      console.error('Unable to load current exchange rates.', error)
      setRateStatus(cachedRates ? 'stale' : 'error')
      setRateError(
        cachedRates
          ? 'The latest rates could not be loaded. Using previously saved rates.'
          : 'Exchange rates could not be loaded. Check your connection and try again.',
      )
    }
  }, [])

  useEffect(() => {
    refreshRates(false)
  }, [refreshRates])

  useEffect(() => {
    if (
      !exchangeRates ||
      currency === BASE_CURRENCY ||
      Number.isFinite(exchangeRates.rates[currency])
    ) {
      return
    }

    console.warn(`No KES exchange rate is available for the saved ${currency} preference.`)
    try {
      window.localStorage.setItem(PREFERENCE_KEY, BASE_CURRENCY)
    } catch (error) {
      console.error('Unable to restore the preferred currency to KES.', error)
    }
  }, [currency, exchangeRates])

  const hasUnsupportedSavedCurrency = Boolean(
    exchangeRates &&
      currency !== BASE_CURRENCY &&
      !Number.isFinite(exchangeRates.rates[currency]),
  )
  const displayCurrency = hasUnsupportedSavedCurrency ? BASE_CURRENCY : currency
  const preferenceError = hasUnsupportedSavedCurrency
    ? `No current exchange rate is available for ${currency}; KES is active.`
    : preferenceStorageError

  const currencyOptions = useMemo(() => {
    return getCurrencyCodes()
      .map((code) => ({
        code,
        name: getCurrencyName(code),
        available: code === BASE_CURRENCY || Boolean(exchangeRates?.rates?.[code]),
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [exchangeRates])

  const setCurrency = useCallback(
    (nextCurrency) => {
      const isAvailable =
        nextCurrency === BASE_CURRENCY ||
        Number.isFinite(exchangeRates?.rates?.[nextCurrency])

      if (!/^[A-Z]{3}$/.test(nextCurrency) || !isAvailable) {
        setPreferenceStorageError('A current exchange rate is not available for that currency.')
        return
      }

      setCurrencyState(nextCurrency)
      setPreferenceStorageError('')
      try {
        window.localStorage.setItem(PREFERENCE_KEY, nextCurrency)
      } catch (error) {
        console.error('Unable to save the preferred currency.', error)
        setPreferenceStorageError(
          'Currency changed for this visit, but could not be saved in this browser.',
        )
      }
    },
    [exchangeRates],
  )

  const convertFromBase = useCallback(
    (amount) => {
      if (!Number.isFinite(amount)) return null
      if (displayCurrency === BASE_CURRENCY) return amount
      const rate = exchangeRates?.rates?.[displayCurrency]
      return Number.isFinite(rate) ? amount * rate : null
    },
    [displayCurrency, exchangeRates],
  )

  const convertToBase = useCallback(
    (amount) => {
      if (!Number.isFinite(amount)) return null
      if (displayCurrency === BASE_CURRENCY) return amount
      const rate = exchangeRates?.rates?.[displayCurrency]
      if (!Number.isFinite(rate) || rate <= 0) return null
      return Math.round((amount / rate + Number.EPSILON) * 100) / 100
    },
    [displayCurrency, exchangeRates],
  )

  const convertCurrency = useCallback(
    (amount, sourceCurrency, targetCurrency) => {
      if (!Number.isFinite(amount) || !sourceCurrency || !targetCurrency) return null
      if (sourceCurrency === targetCurrency) return amount
      if (sourceCurrency === BASE_CURRENCY) {
        const targetRate = exchangeRates?.rates?.[targetCurrency]
        return Number.isFinite(targetRate) ? amount * targetRate : null
      }
      if (targetCurrency === BASE_CURRENCY) {
        const sourceRate = exchangeRates?.rates?.[sourceCurrency]
        return Number.isFinite(sourceRate) && sourceRate > 0
          ? amount / sourceRate
          : null
      }
      const sourceRate = exchangeRates?.rates?.[sourceCurrency]
      const targetRate = exchangeRates?.rates?.[targetCurrency]
      return Number.isFinite(sourceRate) &&
        sourceRate > 0 &&
        Number.isFinite(targetRate)
        ? amount * (targetRate / sourceRate)
        : null
    },
    [exchangeRates],
  )

  const getConversionRate = useCallback(
    (sourceCurrency, targetCurrency) => {
      if (!sourceCurrency || !targetCurrency) return null
      if (sourceCurrency === targetCurrency) return 1
      if (sourceCurrency === BASE_CURRENCY) {
        const targetRate = exchangeRates?.rates?.[targetCurrency]
        return Number.isFinite(targetRate) ? targetRate : null
      }
      if (targetCurrency === BASE_CURRENCY) {
        const sourceRate = exchangeRates?.rates?.[sourceCurrency]
        return Number.isFinite(sourceRate) && sourceRate > 0
          ? 1 / sourceRate
          : null
      }
      const sourceRate = exchangeRates?.rates?.[sourceCurrency]
      const targetRate = exchangeRates?.rates?.[targetCurrency]
      return Number.isFinite(sourceRate) &&
        sourceRate > 0 &&
        Number.isFinite(targetRate)
        ? targetRate / sourceRate
        : null
    },
    [exchangeRates],
  )

  const formatAmount = useCallback(
    (amount) => {
      const convertedAmount = convertFromBase(amount)
      return convertedAmount === null
        ? '—'
        : formatCurrencyValue(convertedAmount, displayCurrency)
    },
    [convertFromBase, displayCurrency],
  )

  const formatInputAmount = useCallback(
    (amountInBase) => {
      const convertedAmount = convertFromBase(amountInBase)
      if (convertedAmount === null) return ''
      return Number(
        convertedAmount.toFixed(getCurrencyFractionDigits(displayCurrency)),
      ).toString()
    },
    [convertFromBase, displayCurrency],
  )

  const value = useMemo(
    () => ({
      currency: displayCurrency,
      currencyOptions,
      exchangeRates,
      formatAmount,
      formatInputAmount,
      rateError,
      rateStatus,
      refreshRates,
      setCurrency,
      preferenceError,
      convertFromBase,
      convertToBase,
      convertCurrency,
      getConversionRate,
      fractionDigits: getCurrencyFractionDigits(displayCurrency),
    }),
    [
      convertFromBase,
      convertToBase,
      convertCurrency,
      getConversionRate,
      currencyOptions,
      displayCurrency,
      exchangeRates,
      formatAmount,
      formatInputAmount,
      preferenceError,
      rateError,
      rateStatus,
      refreshRates,
      setCurrency,
    ],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}
