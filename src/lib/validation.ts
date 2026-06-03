import { z } from 'zod'

// ====================================
// BOOK GENERATION SCHEMAS
// ====================================

export const GenerateBookSchema = z.object({
 title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
 genre: z.string().min(1, 'Genre is required').max(100),
 description: z.string().max(5000, 'Description too long').optional(),
 chapters: z.number().int().min(1).max(50).optional(),
 style: z.string().max(500).optional(),
 targetAudience: z.string().max(200).optional(),
 bookType: z.enum(['text', 'picture', 'production']).optional(),
 language: z.string().max(50).optional(),
 additionalInstructions: z.string().max(2000).optional()
})

export const GenerateChapterSchema = z.object({
 bookId: z.string().uuid('Invalid Book ID'),
 chapterIndex: z.number().int().min(0).max(100),
 title: z.string().max(255).optional(),
 description: z.string().max(5000).optional(),
 genre: z.string().max(100).optional(),
 style: z.string().max(500).optional(),
 targetAudience: z.string().max(200).optional(),
 bookType: z.enum(['text', 'picture', 'production']).optional(),
 context: z.string().max(10000).optional(),
 prompt: z.string().max(2000).optional(),
 content: z.string().max(50000).optional()
})

export const GeneratePictureBookSchema = z.object({
 title: z.string().min(1).max(255),
 genre: z.string().max(100).optional(),
 targetAudience: z.string().max(200).optional(),
 description: z.string().max(2000).optional(),
 totalPages: z.number().int().min(1).max(50).optional(),
 imageStyle: z.string().max(100).optional(),
 tone: z.string().max(100).optional(),
 mainCharacters: z.string().max(500).optional(),
 setting: z.string().max(500).optional(),
 additionalInstructions: z.string().max(2000).optional(),
 imagesPerPage: z.number().int().min(1).max(4).optional(),
 referenceImageUrl: z.string().url().optional()
})

// ====================================
// PAYMENT SCHEMAS
// ====================================

export const PurchaseBookSchema = z.object({
 bookId: z.string().uuid('Invalid Book ID'),
 amount: z.number().min(0).max(1000, 'Amount too high'),
 currency: z.enum(['EUR', 'USD']).default('EUR'),
 paymentMethod: z.enum(['stripe', 'paypal']).optional()
})

export const CreatePaymentIntentSchema = z.object({
 amount: z.number().int().min(50, 'Minimum amount €0.50').max(100000, 'Amount too high'),
 currency: z.enum(['EUR', 'USD']).default('EUR'),
 bookId: z.string().uuid().optional(),
 metadata: z.record(z.string()).optional()
})

// ====================================
// PRINT ORDER SCHEMAS
// ====================================

export const PrintOrderSchema = z.object({
 bookId: z.string().uuid('Invalid Book ID'),
 paymentIntentId: z.string().min(1, 'Payment Intent ID required'),
 quantity: z.number().int().min(1).max(100, 'Maximum 100 copies'),
 shippingAddress: z.object({
 name: z.string().min(1).max(200),
 street1: z.string().min(1).max(200),
 street2: z.string().max(200).optional(),
 city: z.string().min(1).max(100),
 stateCode: z.string().max(10).optional(),
 postcode: z.string().min(1).max(20),
 countryCode: z.string().length(2, 'Country code must be 2 letters (e.g. US)')
 }),
 email: z.string().email('Invalid email address').max(255)
})

// ====================================
// USER SCHEMAS
// ====================================

export const UpdateProfileSchema = z.object({
 name: z.string().min(1).max(200).optional(),
 bio: z.string().max(1000).optional(),
 language: z.string().max(50).optional(),
 theme: z.enum(['light', 'dark', 'system']).optional(),
 email_notifications: z.boolean().optional(),
 push_notifications: z.boolean().optional(),
 weekly_report: z.boolean().optional(),
 book_completion_alert: z.boolean().optional()
})

export const SavedAddressSchema = z.object({
 name: z.string().min(1).max(200),
 street1: z.string().min(1).max(200),
 street2: z.string().max(200).optional(),
 city: z.string().min(1).max(100),
 state_code: z.string().max(10).optional(),
 postcode: z.string().min(1).max(20),
 country_code: z.string().length(2),
 email: z.string().email().max(255).optional(),
 phone_number: z.string().max(50).optional(),
 is_default: z.boolean().optional()
})

// ====================================
// IMAGE GENERATION SCHEMAS
// ====================================

export const GenerateImageSchema = z.object({
 bookId: z.string().uuid().optional(),
 prompt: z.string().min(10, 'Prompt too short').max(2000, 'Prompt too long'),
 style: z.string().max(500).optional(),
 size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional(),
 quality: z.enum(['standard', 'hd']).optional()
})

export const GenerateCoverSchema = z.object({
 bookId: z.string().uuid(),
 title: z.string().min(1).max(255),
 author: z.string().max(200).optional(),
 description: z.string().max(1000).optional(),
 style: z.string().max(500).optional()
})

export const GenerateCompleteBookSchema = z.object({
 bookId: z.string().uuid(),
 title: z.string().min(1).max(255),
 genre: z.string().max(100).optional(),
 description: z.string().max(5000).optional(),
 chapters: z.number().int().min(1).max(50).optional(),
 style: z.string().max(500).optional(),
 targetAudience: z.string().max(200).optional()
})

export const GenerateImagesSchema = z.object({
 bookId: z.string().uuid(),
 prompts: z.array(z.string().min(10).max(2000)).min(1).max(20),
 style: z.string().max(500).optional(),
 size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional()
})

export const GenerateBackCoverSchema = z.object({
 bookId: z.string().uuid(),
 title: z.string().min(1).max(255),
 description: z.string().max(2000).optional(),
 genre: z.string().max(100).optional()
})

export const GenerateBackCoverImageSchema = z.object({
 bookId: z.string().uuid(),
 prompt: z.string().min(10).max(2000),
 style: z.string().max(500).optional()
})

export const StartLiveGenerationSchema = z.object({
 bookId: z.string().uuid(),
 style: z.string().max(500).optional(),
 chapterIndex: z.number().int().min(0).max(100).optional()
})

export const AIConfigGeneratorSchema = z.object({
 prompt: z.string().min(10, 'Prompt too short').max(2000),
 context: z.string().max(5000).optional()
})

export const ImprovePromptSchema = z.object({
 prompt: z.string().min(1).max(2000),
 context: z.string().max(2000).optional(),
 purpose: z.enum(['image', 'text', 'general']).optional()
})

// ====================================
// PAYMENT SCHEMAS (Extended)
// ====================================

export const PayPalOrderSchema = z.object({
 bookId: z.string().uuid().optional(),
 amount: z.number().min(0).max(10000),
 currency: z.enum(['EUR', 'USD']).default('EUR'),
 description: z.string().max(500).optional(),
 type: z.enum(['book_purchase', 'print_order']).optional()
})

export const CapturePayPalOrderSchema = z.object({
 orderId: z.string().min(1),
 bookId: z.string().uuid().optional()
})

export const ProcessPurchaseSchema = z.object({
 bookId: z.string().uuid(),
 paymentIntentId: z.string().min(1),
 amount: z.number().min(0).max(1000).optional()
})

export const CreateCheckoutSchema = z.object({
 bookId: z.string().uuid(),
 priceId: z.string().optional(),
 amount: z.number().int().min(50).max(100000).optional(),
 currency: z.enum(['EUR', 'USD']).default('EUR'),
 successUrl: z.string().url().optional(),
 cancelUrl: z.string().url().optional()
})

export const StripeCheckoutSchema = z.object({
 amount: z.number().int().min(50).max(100000),
 currency: z.enum(['EUR', 'USD']).default('EUR'),
 bookId: z.string().uuid().optional(),
 type: z.enum(['book_purchase', 'print_order', 'cover_generation']).optional(),
 metadata: z.record(z.string()).optional()
})

export const PrintPaymentSchema = z.object({
 bookId: z.string().uuid(),
 quantity: z.number().int().min(1).max(100),
 shippingLevel: z.enum(['MAIL', 'PRIORITY_MAIL', 'GROUND', 'EXPEDITED']).optional(),
 amount: z.number().min(0).max(10000).optional()
})

// ====================================
// WEBHOOK SCHEMAS
// ====================================

export const N8NWebhookSchema = z.object({
 jobId: z.string().uuid(),
 status: z.enum(['processing', 'completed', 'failed']),
 progress: z.number().min(0).max(100).optional(),
 currentStep: z.string().max(500).optional(),
 error: z.string().max(2000).optional(),
  // Picture book specific
 pictureBookConfig: z.object({
 pages: z.array(z.object({
 pageIndex: z.number().int().min(0),
 text: z.string().optional(),
 panels: z.array(z.object({
 panelIndex: z.number().int().min(0),
 description: z.string()
 }))
 }))
 }).optional(),
 image: z.object({
 pageIndex: z.number().int().min(0),
 panelIndex: z.number().int().min(0),
 imageUrl: z.string().url(),
 description: z.string().optional()
 }).optional(),
  // Text streaming
 chapterIndex: z.number().int().min(0).optional(),
 textChunk: z.string().optional(),
 isComplete: z.boolean().optional()
})

// ====================================
// OTHER SCHEMAS
// ====================================

export const PricingSchema = z.object({
 bookId: z.string().uuid().optional(),
 format: z.string().max(50).optional(),
 pages: z.number().int().min(1).max(1000).optional(),
 quantity: z.number().int().min(1).max(100).optional(),
 coverType: z.enum(['matte', 'gloss']).optional(),
 paperType: z.enum(['white', 'cream']).optional()
})

export const LuluValidateSchema = z.object({
 bookId: z.string().uuid(),
 format: z.string().max(50).optional(),
 coverType: z.string().max(50).optional(),
 paperType: z.string().max(50).optional()
})

// ====================================
// HELPER TYPES
// ====================================

export type GenerateBookInput = z.infer<typeof GenerateBookSchema>
export type GenerateChapterInput = z.infer<typeof GenerateChapterSchema>
export type GeneratePictureBookInput = z.infer<typeof GeneratePictureBookSchema>
export type GenerateCompleteBookInput = z.infer<typeof GenerateCompleteBookSchema>
export type GenerateImagesInput = z.infer<typeof GenerateImagesSchema>
export type GenerateBackCoverInput = z.infer<typeof GenerateBackCoverSchema>
export type GenerateBackCoverImageInput = z.infer<typeof GenerateBackCoverImageSchema>
export type StartLiveGenerationInput = z.infer<typeof StartLiveGenerationSchema>
export type AIConfigGeneratorInput = z.infer<typeof AIConfigGeneratorSchema>
export type ImprovePromptInput = z.infer<typeof ImprovePromptSchema>
export type PurchaseBookInput = z.infer<typeof PurchaseBookSchema>
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>
export type PayPalOrderInput = z.infer<typeof PayPalOrderSchema>
export type CapturePayPalOrderInput = z.infer<typeof CapturePayPalOrderSchema>
export type ProcessPurchaseInput = z.infer<typeof ProcessPurchaseSchema>
export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>
export type StripeCheckoutInput = z.infer<typeof StripeCheckoutSchema>
export type PrintPaymentInput = z.infer<typeof PrintPaymentSchema>
export type PrintOrderInput = z.infer<typeof PrintOrderSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type SavedAddressInput = z.infer<typeof SavedAddressSchema>
export type GenerateImageInput = z.infer<typeof GenerateImageSchema>
export type GenerateCoverInput = z.infer<typeof GenerateCoverSchema>
export type N8NWebhookInput = z.infer<typeof N8NWebhookSchema>
export type PricingInput = z.infer<typeof PricingSchema>
export type LuluValidateInput = z.infer<typeof LuluValidateSchema>
