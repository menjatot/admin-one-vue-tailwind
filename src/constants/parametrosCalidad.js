export const DEFAULT_ANALITICA_RANGES = {
  cloro: { min: 0.4, max: 1 },
  ph: { min: 6.5, max: 9.5 },
  turbidez: { min: 0, max: 4 }
}

const toNumberOrFallback = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const normalizeParametrosCalidad = (record) => {
  if (!record) {
    return {
      cloro: { ...DEFAULT_ANALITICA_RANGES.cloro },
      ph: { ...DEFAULT_ANALITICA_RANGES.ph },
      turbidez: { ...DEFAULT_ANALITICA_RANGES.turbidez }
    }
  }

  return {
    cloro: {
      min: toNumberOrFallback(record.cloro_min, DEFAULT_ANALITICA_RANGES.cloro.min),
      max: toNumberOrFallback(record.cloro_max, DEFAULT_ANALITICA_RANGES.cloro.max)
    },
    ph: {
      min: toNumberOrFallback(record.ph_min, DEFAULT_ANALITICA_RANGES.ph.min),
      max: toNumberOrFallback(record.ph_max, DEFAULT_ANALITICA_RANGES.ph.max)
    },
    turbidez: {
      min: toNumberOrFallback(record.turbidez_min, DEFAULT_ANALITICA_RANGES.turbidez.min),
      max: toNumberOrFallback(record.turbidez_max, DEFAULT_ANALITICA_RANGES.turbidez.max)
    }
  }
}

export const formatRangeLabel = (range) => `[${range.min} - ${range.max}]`
