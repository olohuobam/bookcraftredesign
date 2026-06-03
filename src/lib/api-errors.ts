/**
 * Utility functions for consistent API error handling
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Custom API Error class with status code
 */
export class ApiError extends Error {
 constructor(
 message: string,
 public statusCode: number = 500,
 public code?: string
 ) {
 super(message)
 this.name = 'ApiError'
 }
}

/**
 * Extract error message safely from unknown error type
 */
export function getErrorMessage(error: unknown): string {
 if (error instanceof Error) {
 return error.message
 }
 if (typeof error === 'string') {
 return error
 }
 return 'An unknown error occurred'
}

/**
 * Extract error details for logging (includes stack trace)
 */
export function getErrorDetails(error: unknown): { message: string; stack?: string; name?: string } {
 if (error instanceof Error) {
 return {
 message: error.message,
 stack: error.stack,
 name: error.name
 }
 }
 return { message: getErrorMessage(error) }
}

/**
 * Check if error message contains a specific string
 */
export function errorContains(error: unknown, searchString: string): boolean {
 const message = getErrorMessage(error)
 return message.toLowerCase().includes(searchString.toLowerCase())
}

/**
 * Standard API error response format
 */
interface ApiErrorResponse {
 error: string
 code?: string
 details?: string[]
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
 error: unknown,
 defaultMessage: string = 'Internal server error',
 statusCode: number = 500
): NextResponse<ApiErrorResponse> {
  // Handle Zod validation errors
 if (error instanceof ZodError) {
 return NextResponse.json(
 {
 error: 'Validation failed',
 code: 'VALIDATION_ERROR',
 details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
 },
 { status: 400 }
 )
 }

  // Handle custom API errors
 if (error instanceof ApiError) {
 return NextResponse.json(
 {
 error: error.message,
 code: error.code
 },
 { status: error.statusCode }
 )
 }

  // Handle standard errors
 if (error instanceof Error) {
    // Check for common HTTP status codes in error message
 if (error.message.includes('401') || error.message.includes('Unauthorized')) {
 return NextResponse.json(
 { error: 'Unauthorized', code: 'UNAUTHORIZED' },
 { status: 401 }
 )
 }
 if (error.message.includes('403') || error.message.includes('Forbidden')) {
 return NextResponse.json(
 { error: 'Forbidden', code: 'FORBIDDEN' },
 { status: 403 }
 )
 }
 if (error.message.includes('404') || error.message.includes('not found')) {
 return NextResponse.json(
 { error: 'Not found', code: 'NOT_FOUND' },
 { status: 404 }
 )
 }
 }

  // Default error response
 return NextResponse.json(
 { error: defaultMessage, code: 'INTERNAL_ERROR' },
 { status: statusCode }
 )
}

/**
 * Log error with consistent format
 */
export function logError(context: string, error: unknown): void {
 const details = getErrorDetails(error)
  console.error(`[${context}] Error:`, details.message)
 if (details.stack && process.env.NODE_ENV === 'development') {
    console.error(`[${context}] Stack:`, details.stack)
 }
}

/**
 * Type guard to check if value is an Error
 */
export function isError(value: unknown): value is Error {
 return value instanceof Error
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandling<T>(
 handler: () => Promise<T>,
 context: string,
 defaultMessage: string = 'Internal server error'
): Promise<T | NextResponse<ApiErrorResponse>> {
 return handler().catch((error: unknown) => {
 logError(context, error)
 return createErrorResponse(error, defaultMessage)
 })
}
