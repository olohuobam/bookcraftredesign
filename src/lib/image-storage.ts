import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

import { supabaseAdmin, isSupabaseConfigured } from './supabase-admin'
import { normaliseImageLike, appendStoragePath, extractSignedUrlParts } from '@/types/images'
import type { ImageAsset, ImageLike } from '@/types/images'
import { PHOTOBOOK_MAX_FILE_SIZE_BYTES } from '@/types/photobook'

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET || 'bookifly-images'
const PUBLIC_AVATARS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATARS_BUCKET || 'bookifly-avatars'
// 1 year validity (maximum for Supabase Signed URLs)
const SIGNED_URL_EXPIRATION = Number(process.env.SUPABASE_SIGNED_URL_EXPIRATION || 60 * 60 * 24 * 365)
// Optional CDN prefix (e.g. CloudFront, Cloudflare). When set, public bucket URLs and
// signed URLs for public images are rewritten to use the CDN domain instead of the
// Supabase storage origin. The CDN itself must be configured externally to proxy the bucket.
const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || ''

interface StorageOptions {
 userId?: string
 bookId?: string
 directory?: string
 filename?: string
 filenamePrefix?: string
 contentType?: string
 usePublicBucket?: boolean // For avatars - URLs never expire
}

let bucketEnsured = false
let avatarBucketEnsured = false

export const attachPathFragment = appendStoragePath
export const splitSignedUrl = extractSignedUrlParts

function detectExtension(contentType?: string, fallback = 'png') {
 if (!contentType) return fallback
 if (contentType.includes('png')) return 'png'
 if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
 if (contentType.includes('webp')) return 'webp'
 if (contentType.includes('gif')) return 'gif'
 return fallback
}

function normaliseSegment(value?: string | null) {
 if (!value) return null
 return value
 .trim()
 .replace(/[^a-zA-Z0-9/_-]/g, '-')
 .replace(/-+/g, '-')
}

async function ensureBucketExists() {
 if (bucketEnsured || !supabaseAdmin) return

 const { data, error } = await supabaseAdmin.storage.listBuckets()
 if (error) {
    console.error('Failed to list Supabase buckets:', error)
 throw error
 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const exists = data?.some((bucket: any) => bucket.name === STORAGE_BUCKET)
 if (!exists) {
 const { error: createError } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
 public: false,
 fileSizeLimit: String(PHOTOBOOK_MAX_FILE_SIZE_BYTES), // photobook uploads up to 50MB
 allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
 })
 if (createError) {
      console.error('Failed to create Supabase bucket:', createError)
 throw createError
 }
 }

 bucketEnsured = true
}

/**
 * Ensures the public avatars bucket exists (URLs never expire)
 */
async function ensurePublicAvatarsBucketExists() {
 if (avatarBucketEnsured || !supabaseAdmin) return

 const { data, error } = await supabaseAdmin.storage.listBuckets()
 if (error) {
    console.error('Failed to list Supabase buckets:', error)
 throw error
 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const exists = data?.some((bucket: any) => bucket.name === PUBLIC_AVATARS_BUCKET)
 if (!exists) {
 const { error: createError } = await supabaseAdmin.storage.createBucket(PUBLIC_AVATARS_BUCKET, {
 public: true, // Public bucket - URLs never expire!
 fileSizeLimit: '5242880', // 5MB for avatars
 allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
 })
 if (createError) {
      console.error('Failed to create public avatars bucket:', createError)
 throw createError
 }
    console.log('✅ Created public avatars bucket:', PUBLIC_AVATARS_BUCKET)
 }

 avatarBucketEnsured = true
}

function buildStoragePath(options?: StorageOptions, extension = 'png') {
 const segments: string[] = []
 const userSegment = normaliseSegment(options?.userId)
 if (userSegment) segments.push(userSegment)

 const directory = options?.directory || options?.bookId
 const directorySegment = normaliseSegment(directory)
 if (directorySegment) segments.push(directorySegment)

 const prefix = options?.filenamePrefix ? `${normaliseSegment(options.filenamePrefix)}-` : ''
 const baseName = options?.filename ? options.filename.replace(/[^a-zA-Z0-9._-]/g, '-') : `${prefix}${randomUUID()}.${extension}`

 segments.push(baseName.endsWith(`.${extension}`) ? baseName : `${baseName}.${extension}`)

 return segments.join('/')
}

async function saveBufferToLocal(buffer: ArrayBuffer, extension: string): Promise<ImageAsset> {
 const imagesDir = path.join(process.cwd(), 'public', 'images')
 if (!fs.existsSync(imagesDir)) {
 fs.mkdirSync(imagesDir, { recursive: true })
 }

 const filename = `${randomUUID()}.${extension}`
 const filePath = path.join(imagesDir, filename)
 fs.writeFileSync(filePath, Buffer.from(buffer))

 return {
 path: `/images/${filename}`,
 signedUrl: `/images/${filename}`,
 type: 'local'
 }
}

async function saveBufferToSupabase(buffer: ArrayBuffer, options?: StorageOptions): Promise<ImageAsset> {
 if (!supabaseAdmin) {
 throw new Error('Supabase Admin not initialised')
 }

 const usePublicBucket = options?.usePublicBucket === true
 const bucketName = usePublicBucket ? PUBLIC_AVATARS_BUCKET : STORAGE_BUCKET

  // Ensure the correct bucket exists
 if (usePublicBucket) {
 await ensurePublicAvatarsBucketExists()
 } else {
 await ensureBucketExists()
 }

 const contentType = options?.contentType || 'image/png'
 const extension = detectExtension(contentType)
 const storagePath = buildStoragePath(options, extension)

  // Different settings for public vs private buckets
 const uploadOptions = usePublicBucket
 ? { contentType, cacheControl: '31536000', upsert: true } // 1 year cache, allow overwrite for avatars
 : { contentType, cacheControl: '3600', upsert: false } // 1 hour cache, no overwrite for other images

 const { error: uploadError } = await supabaseAdmin.storage
 .from(bucketName)
 .upload(storagePath, Buffer.from(buffer), uploadOptions)

 if (uploadError) {
    console.error('Failed to upload image to Supabase Storage:', uploadError)
 throw uploadError
 }

  // For public buckets: Permanent URL without expiration
 if (usePublicBucket) {
 const publicUrl = getPublicUrl(storagePath, bucketName)
 return {
 path: storagePath,
 signedUrl: publicUrl,
 type: 'public' // New type for public URLs
 }
 }

  // For private buckets: Signed URL with expiration
 const signedUrl = await createSignedUrl(storagePath)
 if (!signedUrl) {
 throw new Error('Failed to create signed URL for stored image')
 }

 return {
 path: storagePath,
 signedUrl,
 type: 'supabase'
 }
}

/**
 * Get a permanent public URL for an image in a public bucket.
 * These URLs NEVER expire!
 * If NEXT_PUBLIC_CDN_URL is set, the returned URL is rewritten to use the CDN prefix
 * instead of the Supabase storage origin.
 */
export function getPublicUrl(storagePath: string, bucket: string = PUBLIC_AVATARS_BUCKET): string {
 if (!supabaseAdmin) {
 return storagePath
 }

 const { data } = supabaseAdmin.storage
 .from(bucket)
 .getPublicUrl(storagePath)

 const publicUrl = data.publicUrl

 if (CDN_BASE_URL && publicUrl) {
   // Replace the Supabase storage origin with the CDN base URL.
   // e.g. https://xyz.supabase.co/storage/v1/object/public/... →
   //      https://cdn.example.com/storage/v1/object/public/...
   try {
     const url = new URL(publicUrl)
     const cdnBase = CDN_BASE_URL.replace(/\/$/, '') // strip trailing slash
     return `${cdnBase}${url.pathname}${url.search}`
   } catch (e) {
     console.warn('CDN URL rewrite failed:', e)
     return publicUrl
   }
 }

 return publicUrl
}

export async function saveImageBufferToStorage(buffer: ArrayBuffer, options?: StorageOptions): Promise<ImageAsset> {
 if (isSupabaseConfigured && supabaseAdmin) {
 return await saveBufferToSupabase(buffer, options)
    // No silent fallback — if Supabase fails, we want to know
 }

  // Only use local storage when Supabase is NOT configured (local dev)
 const extension = detectExtension(options?.contentType)
 return saveBufferToLocal(buffer, extension)
}

/**
 * Saves a base64 encoded image to storage (like picture book workflow).
 */
export async function saveBase64Image(base64Data: string, options?: StorageOptions): Promise<ImageAsset> {
 try {
    // Convert base64 to ArrayBuffer
 const binaryString = Buffer.from(base64Data, 'base64')
 const arrayBuffer = binaryString.buffer.slice(
 binaryString.byteOffset,
 binaryString.byteOffset + binaryString.byteLength
 )

 return saveImageBufferToStorage(arrayBuffer, options)
 } catch (error) {
    console.error('Error saving base64 image:', error)
 throw error
 }
}

/**
 * Downloads an image from a remote URL and stores it in Supabase Storage (or falls back to local storage).
 */
export async function downloadAndSaveImage(imageUrl: string, options?: StorageOptions): Promise<ImageAsset> {
 try {
 const response = await fetch(imageUrl)
 if (!response.ok) {
 throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
 }

 const arrayBuffer = await response.arrayBuffer()
 const contentType = response.headers.get('content-type') || undefined

 return saveImageBufferToStorage(arrayBuffer, {
 ...options,
 contentType
 })
 } catch (error) {
    console.error('Error downloading and saving image:', error)
 throw error
 }
}

/**
 * Parses a Supabase Storage URL into its bucket and object key.
 *
 * Handles the three access forms:
 *   /storage/v1/object/public/<bucket>/<path>
 *   /storage/v1/object/sign/<bucket>/<path>?token=...
 *   /storage/v1/object/authenticated/<bucket>/<path>
 *
 * Legacy records (written by the n8n workflow / older app versions) live in
 * buckets such as `user-images` / `book-covers`, not the app's default
 * STORAGE_BUCKET. Re-signing them against STORAGE_BUCKET fails and the stale
 * (expired) token leaks through, causing 400s. Deriving the real bucket from
 * the URL lets us re-sign / serve them correctly.
 */
function parseSupabaseStorageUrl(
 value: string | null | undefined
): { bucket: string; objectPath: string; isPublic: boolean } | null {
 if (!value || !/^https?:\/\//i.test(value)) return null
 let parsed: URL
 try {
 parsed = new URL(value)
 } catch {
 return null
 }
 const match = parsed.pathname.match(
 /\/storage\/v1\/object\/(public|sign|authenticated)\/([^/]+)\/(.+)$/
 )
 if (!match) return null
 try {
 return {
 bucket: decodeURIComponent(match[2]),
 objectPath: decodeURIComponent(match[3]),
 isPublic: match[1] === 'public',
 }
 } catch {
 return null
 }
}

/**
 * Resolves the authoritative { bucket, objectPath } for an image record,
 * looking first at the (possibly malformed) stored path, then at the existing
 * signed URL, and finally falling back to the app's default bucket.
 */
function resolveStorageRef(
 asset: ImageAsset
): { bucket: string; objectPath: string; isPublic: boolean } | null {
 const isHttp = (v: string) => /^https?:\/\//i.test(v)

 const fromPath = parseSupabaseStorageUrl(asset.path)
 if (fromPath) return fromPath

 const fromSigned = parseSupabaseStorageUrl(asset.signedUrl)
 if (fromSigned) {
 // Prefer the stored relative key when it is a plain object key.
 const objectPath =
 asset.path && !isHttp(asset.path) ? asset.path : fromSigned.objectPath
 return { bucket: fromSigned.bucket, objectPath, isPublic: fromSigned.isPublic }
 }

 if (asset.path && !isHttp(asset.path)) {
 return { bucket: STORAGE_BUCKET, objectPath: asset.path, isPublic: false }
 }

 return null
}

export async function createSignedUrl(pathOrRecord: string | ImageAsset | null | undefined): Promise<string | null> {
 const asset = normaliseImageLike(pathOrRecord)
 if (!asset) return null

 if (asset.path.startsWith('/')) {
 return asset.path
 }

 if (!supabaseAdmin || !isSupabaseConfigured) {
 return asset.path
 }

 const ref = resolveStorageRef(asset)
 if (!ref) {
 return asset.signedUrl || asset.path || null
 }

 // Only genuinely public objects get a permanent public URL. A configured
 // CDN must not turn a private object into a /object/public/ URL (that
 // would 400/404) — getPublicUrl already applies the CDN rewrite for
 // public objects.
 if (ref.isPublic) {
 const publicUrl = getPublicUrl(ref.objectPath, ref.bucket)
 if (publicUrl) return publicUrl
 }

 // ensureBucketExists() only manages the app's default bucket; skip it for
 // legacy/foreign buckets and just attempt to sign against them.
 if (ref.bucket === STORAGE_BUCKET) {
 await ensureBucketExists()
 }

 const { data, error } = await supabaseAdmin.storage
 .from(ref.bucket)
 .createSignedUrl(ref.objectPath, SIGNED_URL_EXPIRATION)

 if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error)
 // Fall back to whatever we had rather than returning null (which would
 // blank the image entirely).
 return asset.signedUrl || null
 }

 return data.signedUrl
}

export async function refreshSignedUrls(records: ImageLike[]): Promise<(ImageAsset | null)[]> {
 if (!Array.isArray(records) || records.length === 0) {
 return []
 }

 const assets: Array<ImageAsset | null> = []
 // Group by the asset's actual bucket — legacy records can live in
 // user-images / book-covers, not just the app's default bucket.
 const byBucket = new Map<
 string,
 Array<{ index: number; objectPath: string; isPublic: boolean }>
 >()

 records.forEach((record) => {
 const asset = normaliseImageLike(record)
 const currentIndex = assets.push(asset) - 1

 if (asset && asset.type === 'supabase') {
 const ref = resolveStorageRef(asset)
 if (!ref) return
 const list = byBucket.get(ref.bucket) ?? []
 list.push({ index: currentIndex, objectPath: ref.objectPath, isPublic: ref.isPublic })
 byBucket.set(ref.bucket, list)
 }
 })

 if (byBucket.size > 0 && supabaseAdmin && isSupabaseConfigured) {
 for (const [bucket, entries] of byBucket) {
 // Public objects get a permanent public URL (getPublicUrl applies the
 // CDN rewrite itself). Private objects are always signed — never
 // downgraded to a /object/public/ URL.
 const publicEntries = entries.filter((e) => e.isPublic)
 const privateEntries = entries.filter((e) => !e.isPublic)

 publicEntries.forEach((entry) => {
 const asset = assets[entry.index]
 if (asset) asset.signedUrl = getPublicUrl(entry.objectPath, bucket)
 })

 if (privateEntries.length === 0) continue

 if (bucket === STORAGE_BUCKET) {
 await ensureBucketExists()
 }

 const { data, error } = await supabaseAdmin.storage
 .from(bucket)
 .createSignedUrls(privateEntries.map((entry) => entry.objectPath), SIGNED_URL_EXPIRATION)

 if (error) {
      console.error(`Failed to refresh signed URLs for bucket "${bucket}":`, error)
 continue
 }

 data?.forEach((item: { signedUrl: string | null } | null | undefined, idx: number) => {
 const entry = privateEntries[idx]
 const asset = assets[entry.index]
 if (item?.signedUrl && asset) {
 asset.signedUrl = item.signedUrl
 }
 })
 }
 }

 return assets
}

export function extractStoragePath(record: ImageLike): string | null {
 const asset = normaliseImageLike(record)
 return asset?.path || null
}

export function normalizeImageRecord(record: ImageLike): ImageAsset | null {
 return normaliseImageLike(record)
}

export async function deleteStoredImage(record: ImageLike): Promise<void> {
 try {
 const asset = normaliseImageLike(record)
 if (!asset) return

 if (asset.type === 'supabase') {
 if (!supabaseAdmin || !isSupabaseConfigured) return
 await ensureBucketExists()
 const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([asset.path])
 if (error) {
        console.error('Failed to delete image from Supabase Storage:', error)
 }
 } else if (asset.type === 'local' && asset.path.startsWith('/images/')) {
 const filename = asset.path.replace('/images/', '')
 const filePath = path.join(process.cwd(), 'public', 'images', filename)
 if (fs.existsSync(filePath)) {
 fs.unlinkSync(filePath)
 }
 }
 } catch (error) {
    console.error('Error deleting stored image:', error)
 }
}

export { STORAGE_BUCKET, PUBLIC_AVATARS_BUCKET, SIGNED_URL_EXPIRATION }
