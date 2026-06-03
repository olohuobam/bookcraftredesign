import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

/**
 * Validates request body against a Zod schema
 * Returns validated data or NextResponse with error
 */
export async function validateRequest<T extends z.ZodType>(
 body: unknown,
 schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
 try {
 const validatedData = schema.parse(body)
 return { success: true, data: validatedData }
 } catch (error) {
 if (error instanceof ZodError) {
 return {
 success: false,
 response: NextResponse.json(
 {
 error: 'Validation failed',
 details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
 },
 { status: 400 }
 )
 }
 }
 return {
 success: false,
 response: NextResponse.json(
 { error: 'Invalid request body' },
 { status: 400 }
 )
 }
 }
}
