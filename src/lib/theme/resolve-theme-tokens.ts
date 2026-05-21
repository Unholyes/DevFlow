export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export function isValidHexColor(hex: string | null | undefined): hex is string {
  return typeof hex === 'string' && /^#[0-9A-F]{6}$/i.test(hex.trim())
}

/** Postgres theme columns use `^#[0-9A-F]{6}$` (uppercase only). */
export function normalizeHexColor(hex: string | null | undefined): string | null {
  if (hex == null || typeof hex !== 'string') return null
  const trimmed = hex.trim()
  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return null
  return `#${trimmed.slice(1).toUpperCase()}`
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 1
  const channels = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.45
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function blendHex(a: string, b: string, t: number) {
  const ar = hexToRgb(a)
  const br = hexToRgb(b)
  if (!ar || !br) return a
  const k = clamp01(t)
  const r = Math.round(ar.r + (br.r - ar.r) * k)
  const g = Math.round(ar.g + (br.g - ar.g) * k)
  const b2 = Math.round(ar.b + (br.b - ar.b) * k)
  return `#${[r, g, b2].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

const LIGHT_FOREGROUND = '#0F172A'
const LIGHT_MUTED = '#475569'
const DARK_FOREGROUND = '#E5E7EB'
const DARK_MUTED = '#9CA3AF'

export function readableForegroundForBackground(
  background: string,
  explicit?: string | null,
  minRatio = 4.5,
): string {
  const fallback = isDarkColor(background) ? DARK_FOREGROUND : LIGHT_FOREGROUND
  const candidate = isValidHexColor(explicit) ? explicit.trim() : fallback
  if (contrastRatio(candidate, background) >= minRatio) return candidate
  return fallback
}

export function readableMutedForBackground(
  background: string,
  explicit?: string | null,
  minRatio = 3,
): string {
  const fallback = isDarkColor(background) ? DARK_MUTED : LIGHT_MUTED
  const candidate = isValidHexColor(explicit) ? explicit.trim() : fallback
  if (contrastRatio(candidate, background) >= minRatio) return candidate
  return fallback
}

export function readableOnPrimary(primary: string): string {
  return isDarkColor(primary) ? '#FFFFFF' : '#0F172A'
}

export function isDarkThemeSurface(background: string, surface: string): boolean {
  return isDarkColor(background) || isDarkColor(surface)
}
