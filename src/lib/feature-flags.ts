/**
 * Central feature flags.
 *
 * Print-on-Demand (Lulu) is temporarily disabled and shown as "coming soon"
 * in the UI. Set this back to `true` to re-enable ordering end-to-end.
 */
export const PRINT_ON_DEMAND_ENABLED = false

export const PRINT_DISABLED_RESPONSE = {
  error: 'Print-on-Demand is temporarily unavailable.',
  code: 'PRINT_DISABLED',
} as const
