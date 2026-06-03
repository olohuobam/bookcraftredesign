/**
 * Landing page constants — extracted for configurability and testability.
 */

export interface LandingStat {
 targetValue: number
 suffix: string
 prefix?: string
 labelKey: string
 gradient: string
 displayValue?: string
}

export const LANDING_STATS: LandingStat[] = [
 {
 targetValue: 1000,
 suffix: '+',
 labelKey: 'landingStatBooks',
 gradient: 'from-blue-500 to-cyan-400',
 },
 {
 targetValue: 500,
 suffix: '+',
 labelKey: 'landingStatUsers',
 gradient: 'from-blue-500 to-pink-400',
 },
 {
 targetValue: 25,
 suffix: '+',
 labelKey: 'landingStatLanguages',
 gradient: 'from-emerald-500 to-teal-400',
 },
]

/** Animation duration for the counter (ms) */
export const COUNTER_ANIMATION_DURATION = 2000
export const COUNTER_ANIMATION_STEPS = 60
