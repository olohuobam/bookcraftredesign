import { describe, it, expect } from 'vitest'
import {
 GenerateBookSchema,
 GenerateChapterSchema,
 GeneratePictureBookSchema,
 PurchaseBookSchema,
 CreatePaymentIntentSchema,
 PrintOrderSchema,
 UpdateProfileSchema,
 GenerateImageSchema,
 SavedAddressSchema,
 N8NWebhookSchema,
} from '@/lib/validation'

describe('GenerateBookSchema', () => {
 it('accepts valid book data', () => {
 const result = GenerateBookSchema.safeParse({
 title: 'My Awesome Book',
 genre: 'Fantasy',
 })
 expect(result.success).toBe(true)
 })

 it('rejects empty title', () => {
 const result = GenerateBookSchema.safeParse({
 title: '',
 genre: 'Fantasy',
 })
 expect(result.success).toBe(false)
 })

 it('rejects missing title', () => {
 const result = GenerateBookSchema.safeParse({ genre: 'Fantasy' })
 expect(result.success).toBe(false)
 })

 it('rejects too-long title (> 255 chars)', () => {
 const result = GenerateBookSchema.safeParse({
 title: 'a'.repeat(256),
 genre: 'Fantasy',
 })
 expect(result.success).toBe(false)
 })

 it('accepts valid optional fields', () => {
 const result = GenerateBookSchema.safeParse({
 title: 'My Book',
 genre: 'Sci-Fi',
 chapters: 10,
 language: 'en',
 bookType: 'text',
 })
 expect(result.success).toBe(true)
 })

 it('rejects invalid bookType', () => {
 const result = GenerateBookSchema.safeParse({
 title: 'My Book',
 genre: 'Sci-Fi',
 bookType: 'invalid',
 })
 expect(result.success).toBe(false)
 })

 it('rejects too many chapters (> 50)', () => {
 const result = GenerateBookSchema.safeParse({
 title: 'My Book',
 genre: 'Fantasy',
 chapters: 51,
 })
 expect(result.success).toBe(false)
 })
})

describe('GenerateChapterSchema', () => {
 it('accepts valid chapter data with UUID', () => {
 const result = GenerateChapterSchema.safeParse({
 bookId: '550e8400-e29b-41d4-a716-446655440000',
 chapterIndex: 0,
 })
 expect(result.success).toBe(true)
 })

 it('rejects invalid UUID for bookId', () => {
 const result = GenerateChapterSchema.safeParse({
 bookId: 'not-a-uuid',
 chapterIndex: 0,
 })
 expect(result.success).toBe(false)
 })

 it('rejects negative chapter index', () => {
 const result = GenerateChapterSchema.safeParse({
 bookId: '550e8400-e29b-41d4-a716-446655440000',
 chapterIndex: -1,
 })
 expect(result.success).toBe(false)
 })
})

describe('PurchaseBookSchema', () => {
 it('accepts valid purchase data', () => {
 const result = PurchaseBookSchema.safeParse({
 bookId: '550e8400-e29b-41d4-a716-446655440000',
 amount: 999,
 currency: 'EUR',
 })
 expect(result.success).toBe(true)
 })

 it('defaults currency to EUR', () => {
 const result = PurchaseBookSchema.safeParse({
 bookId: '550e8400-e29b-41d4-a716-446655440000',
 amount: 999,
 })
 expect(result.success).toBe(true)
 if (result.success) {
 expect(result.data.currency).toBe('EUR')
 }
 })

 it('rejects amount above 1000', () => {
 const result = PurchaseBookSchema.safeParse({
 bookId: '550e8400-e29b-41d4-a716-446655440000',
 amount: 1001,
 })
 expect(result.success).toBe(false)
 })

 it('rejects invalid UUID', () => {
 const result = PurchaseBookSchema.safeParse({
 bookId: 'bad-id',
 amount: 999,
 })
 expect(result.success).toBe(false)
 })
})

describe('CreatePaymentIntentSchema', () => {
 it('accepts valid payment data', () => {
 const result = CreatePaymentIntentSchema.safeParse({
 amount: 999,
 currency: 'EUR',
 })
 expect(result.success).toBe(true)
 })

 it('rejects amount below minimum (50 cents)', () => {
 const result = CreatePaymentIntentSchema.safeParse({
 amount: 49,
 currency: 'EUR',
 })
 expect(result.success).toBe(false)
 })

 it('rejects unsupported currency', () => {
 const result = CreatePaymentIntentSchema.safeParse({
 amount: 999,
 currency: 'GBP',
 })
 expect(result.success).toBe(false)
 })
})

describe('PrintOrderSchema', () => {
 const validOrder = {
 bookId: '550e8400-e29b-41d4-a716-446655440000',
 paymentIntentId: 'pi_test_123',
 quantity: 1,
 shippingAddress: {
 name: 'John Doe',
 street1: '123 Main St',
 city: 'Berlin',
 postcode: '10115',
 countryCode: 'DE',
 },
 email: 'john@example.com',
 }

 it('accepts valid print order', () => {
 const result = PrintOrderSchema.safeParse(validOrder)
 expect(result.success).toBe(true)
 })

 it('rejects invalid email', () => {
 const result = PrintOrderSchema.safeParse({
 ...validOrder,
 email: 'not-an-email',
 })
 expect(result.success).toBe(false)
 })

 it('rejects quantity above 100', () => {
 const result = PrintOrderSchema.safeParse({
 ...validOrder,
 quantity: 101,
 })
 expect(result.success).toBe(false)
 })

 it('rejects invalid country code (must be 2 letters)', () => {
 const result = PrintOrderSchema.safeParse({
 ...validOrder,
 shippingAddress: { ...validOrder.shippingAddress, countryCode: 'DEU' },
 })
 expect(result.success).toBe(false)
 })
})

describe('UpdateProfileSchema', () => {
 it('accepts empty object (all optional)', () => {
 const result = UpdateProfileSchema.safeParse({})
 expect(result.success).toBe(true)
 })

 it('accepts valid theme values', () => {
 for (const theme of ['light', 'dark', 'system']) {
 const result = UpdateProfileSchema.safeParse({ theme })
 expect(result.success).toBe(true)
 }
 })

 it('rejects invalid theme value', () => {
 const result = UpdateProfileSchema.safeParse({ theme: 'blue' })
 expect(result.success).toBe(false)
 })

 it('accepts boolean notification preferences', () => {
 const result = UpdateProfileSchema.safeParse({
 email_notifications: true,
 push_notifications: false,
 })
 expect(result.success).toBe(true)
 })
})

describe('GenerateImageSchema', () => {
 it('accepts valid image prompt', () => {
 const result = GenerateImageSchema.safeParse({
 prompt: 'A beautiful fantasy landscape with mountains',
 })
 expect(result.success).toBe(true)
 })

 it('rejects prompt that is too short (< 10 chars)', () => {
 const result = GenerateImageSchema.safeParse({ prompt: 'short' })
 expect(result.success).toBe(false)
 })

 it('accepts valid image size', () => {
 const result = GenerateImageSchema.safeParse({
 prompt: 'A beautiful fantasy landscape with mountains',
 size: '1024x1024',
 })
 expect(result.success).toBe(true)
 })

 it('rejects invalid image size', () => {
 const result = GenerateImageSchema.safeParse({
 prompt: 'A beautiful fantasy landscape with mountains',
 size: '512x512',
 })
 expect(result.success).toBe(false)
 })
})

describe('N8NWebhookSchema', () => {
 it('accepts valid webhook payload', () => {
 const result = N8NWebhookSchema.safeParse({
 jobId: '550e8400-e29b-41d4-a716-446655440000',
 status: 'completed',
 progress: 100,
 })
 expect(result.success).toBe(true)
 })

 it('accepts processing status', () => {
 const result = N8NWebhookSchema.safeParse({
 jobId: '550e8400-e29b-41d4-a716-446655440000',
 status: 'processing',
 progress: 50,
 })
 expect(result.success).toBe(true)
 })

 it('rejects invalid status', () => {
 const result = N8NWebhookSchema.safeParse({
 jobId: '550e8400-e29b-41d4-a716-446655440000',
 status: 'unknown',
 })
 expect(result.success).toBe(false)
 })

 it('rejects progress > 100', () => {
 const result = N8NWebhookSchema.safeParse({
 jobId: '550e8400-e29b-41d4-a716-446655440000',
 status: 'processing',
 progress: 101,
 })
 expect(result.success).toBe(false)
 })
})
