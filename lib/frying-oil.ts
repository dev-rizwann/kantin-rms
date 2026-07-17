// Single flat deep-fry oil rate: total oil spend ÷ every gram of food that
// entered the fryer over the trading window (27-Dec-2025..10-Jul-2026).
// Rs 480,000 ÷ 5,259,014 g — no potato/breaded split by owner decision (17-Jul-2026).
export const DEFAULT_FRYING_OIL_RATE = 0.091272

export const FRYING_OIL_LABEL = "Deep-fry oil"

// Older line labels that must keep cascading when the rate changes.
export const LEGACY_FRYING_OIL_LABELS = [
  "Deep-fry oil · Potato",
  "Deep-fry oil · Breaded protein",
  "Oil allocation (calibrated)",
  "Frying oil (allocated)",
] as const

export const ALL_FRYING_OIL_LABELS = [FRYING_OIL_LABEL, ...LEGACY_FRYING_OIL_LABELS]

export function isFryingOilLabel(label: string | null | undefined): boolean {
  return !!label && (ALL_FRYING_OIL_LABELS as readonly string[]).includes(label)
}
