import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn (className utility)', () => {
 it('combines class names', () => {
 expect(cn('foo', 'bar')).toBe('foo bar')
 })

 it('handles conditional classes', () => {
 expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
 })

 it('merges Tailwind classes (removes duplicates)', () => {
    // tailwind-merge removes conflicting Tailwind classes
 expect(cn('p-2', 'p-4')).toBe('p-4')
 })

 it('handles undefined/null gracefully', () => {
 expect(cn('base', undefined, null, 'extra')).toBe('base extra')
 })

 it('returns empty string when no classes given', () => {
 expect(cn()).toBe('')
 })

 it('handles object notation', () => {
 const result = cn({ 'text-red-500': true, 'text-blue-500': false })
 expect(result).toBe('text-red-500')
 })

 it('merges conflicting Tailwind text colors', () => {
 const result = cn('text-red-500', 'text-blue-500')
 expect(result).toBe('text-blue-500')
 })
})
