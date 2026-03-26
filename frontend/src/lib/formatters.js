const LOCALE = 'en-AU'
const CURRENCY = 'AUD'

const currencyFormatters = new Map()
const compactCurrencyFormatters = new Map()
const numberFormatters = new Map()
const dateFormatters = new Map()

function isMissing(value) {
  return value == null || Number.isNaN(Number(value))
}

function getCurrencyFormatter(maximumFractionDigits, notation = 'standard') {
  const key = `${notation}:${maximumFractionDigits}`
  const cache = notation === 'compact' ? compactCurrencyFormatters : currencyFormatters

  if (!cache.has(key)) {
    cache.set(
      key,
      new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: CURRENCY,
        notation,
        maximumFractionDigits,
      })
    )
  }

  return cache.get(key)
}

function getNumberFormatter(maximumFractionDigits) {
  if (!numberFormatters.has(maximumFractionDigits)) {
    numberFormatters.set(
      maximumFractionDigits,
      new Intl.NumberFormat(LOCALE, {
        maximumFractionDigits,
      })
    )
  }

  return numberFormatters.get(maximumFractionDigits)
}

function getDateFormatter(options) {
  const key = JSON.stringify(options)

  if (!dateFormatters.has(key)) {
    dateFormatters.set(key, new Intl.DateTimeFormat(LOCALE, options))
  }

  return dateFormatters.get(key)
}

export function formatAUD(value, maximumFractionDigits = 2) {
  if (isMissing(value)) return '--'
  return getCurrencyFormatter(maximumFractionDigits).format(Number(value))
}

export function formatCompactAUD(value, maximumFractionDigits = 1) {
  if (isMissing(value)) return '--'
  return getCurrencyFormatter(maximumFractionDigits, 'compact').format(Number(value))
}

export function formatNumber(value, maximumFractionDigits = 2) {
  if (isMissing(value)) return '--'
  return getNumberFormatter(maximumFractionDigits).format(Number(value))
}

export function formatPct(value, digits = 1) {
  if (isMissing(value)) return '--'
  return `${Number(value).toFixed(digits)}%`
}

export function formatSignedAUD(value, maximumFractionDigits = 2) {
  if (isMissing(value)) return '--'
  const numericValue = Number(value)
  return `${numericValue >= 0 ? '+' : ''}${formatAUD(numericValue, maximumFractionDigits)}`
}

export function formatSignedCompactAUD(value, maximumFractionDigits = 1) {
  if (isMissing(value)) return '--'
  const numericValue = Number(value)
  return `${numericValue >= 0 ? '+' : ''}${formatCompactAUD(numericValue, maximumFractionDigits)}`
}

export function formatSignedPct(value, digits = 2) {
  if (isMissing(value)) return '--'
  const numericValue = Number(value)
  return `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(digits)}%`
}

export function formatDateAU(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '--'
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return '--'

  return getDateFormatter(options).format(date)
}
