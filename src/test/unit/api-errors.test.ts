import { describe, it, expect, vi } from 'vitest'
import {
 ApiError,
 getErrorMessage,
 getErrorDetails,
 errorContains,
 isError,
} from '@/lib/api-errors'

describe('ApiError', () => {
 it('creates error with message and default status 500', () => {
 const err = new ApiError('Something went wrong')
 expect(err.message).toBe('Something went wrong')
 expect(err.statusCode).toBe(500)
 expect(err.name).toBe('ApiError')
 })

 it('creates error with custom status code', () => {
 const err = new ApiError('Not found', 404)
 expect(err.statusCode).toBe(404)
 })

 it('creates error with optional code', () => {
 const err = new ApiError('Forbidden', 403, 'FORBIDDEN')
 expect(err.code).toBe('FORBIDDEN')
 })

 it('is an instance of Error', () => {
 const err = new ApiError('Test')
 expect(err).toBeInstanceOf(Error)
 })
})

describe('getErrorMessage', () => {
 it('returns message from Error instance', () => {
 expect(getErrorMessage(new Error('test error'))).toBe('test error')
 })

 it('returns string directly', () => {
 expect(getErrorMessage('just a string')).toBe('just a string')
 })

 it('returns fallback for unknown types', () => {
 expect(getErrorMessage(null)).toBe('An unknown error occurred')
 expect(getErrorMessage(42)).toBe('An unknown error occurred')
 expect(getErrorMessage({})).toBe('An unknown error occurred')
 })
})

describe('getErrorDetails', () => {
 it('returns message, stack, name for Error instance', () => {
 const err = new Error('detailed error')
 const details = getErrorDetails(err)
 expect(details.message).toBe('detailed error')
 expect(details.stack).toBeDefined()
 expect(details.name).toBe('Error')
 })

 it('returns message only for non-Error values', () => {
 const details = getErrorDetails('simple string')
 expect(details.message).toBe('simple string')
 expect(details.stack).toBeUndefined()
 })
})

describe('errorContains', () => {
 it('returns true when error message contains string (case-insensitive)', () => {
 expect(errorContains(new Error('Unauthorized access'), 'unauthorized')).toBe(true)
 expect(errorContains(new Error('TIMEOUT error'), 'timeout')).toBe(true)
 })

 it('returns false when string not in error', () => {
 expect(errorContains(new Error('Network error'), 'timeout')).toBe(false)
 })

 it('works with string errors', () => {
 expect(errorContains('Connection refused', 'refused')).toBe(true)
 })
})

describe('isError', () => {
 it('returns true for Error instances', () => {
 expect(isError(new Error('test'))).toBe(true)
 expect(isError(new TypeError('type error'))).toBe(true)
 })

 it('returns false for non-Error values', () => {
 expect(isError('string')).toBe(false)
 expect(isError(null)).toBe(false)
 expect(isError(42)).toBe(false)
 expect(isError({})).toBe(false)
 })
})
