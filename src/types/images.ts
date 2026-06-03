export type ImageStorageType = 'supabase' | 'local' | 'remote' | 'public'

export const SIGNED_URL_FRAGMENT_KEY = 'supaPath'

export function extractSignedUrlParts(value: string): { baseUrl: string; storagePath: string | null } {
 if (!value) {
 return { baseUrl: '', storagePath: null }
 }

 const [baseUrl, fragment] = value.split('#')
 if (!fragment) {
 return { baseUrl, storagePath: null }
 }

 const prefix = `${SIGNED_URL_FRAGMENT_KEY}=`
 const fragmentParts = fragment.split('&')
 for (const part of fragmentParts) {
 if (part.startsWith(prefix)) {
 return { baseUrl, storagePath: decodeURIComponent(part.slice(prefix.length)) }
 }
 }

 return { baseUrl, storagePath: null }
}

export function appendStoragePath(url: string, path: string | null | undefined): string {
 if (!url || !path) return url
 if (url.includes(`#${SIGNED_URL_FRAGMENT_KEY}=`)) return url
 return `${url}#${SIGNED_URL_FRAGMENT_KEY}=${encodeURIComponent(path)}`
}

export interface ImageAsset {
 path: string
 signedUrl: string
 type: ImageStorageType
}

export interface ImageAssetInput extends Partial<ImageAsset> {
 storagePath?: string | null
 localPath?: string | null
}

export type ImageLike = string | ImageAssetInput | null | undefined

export function isImageAsset(value: unknown): value is ImageAsset {
 return Boolean(
 value &&
 typeof value === 'object' &&
 typeof (value as ImageAsset).path === 'string' &&
 typeof (value as ImageAsset).signedUrl === 'string'
 )
}

export function normaliseImageLike(value: ImageLike): ImageAsset | null {
 if (!value) return null

 if (typeof value === 'string') {
 const { baseUrl, storagePath } = extractSignedUrlParts(value)
 const url = baseUrl || value
 const isLocal = url.startsWith('/images/')
 const type: ImageStorageType = isLocal
 ? 'local'
 : url.startsWith('http')
 ? (storagePath ? 'supabase' : 'remote')
 : 'supabase'

 const path = storagePath || (type === 'supabase' ? url : value)

 return {
 path,
 signedUrl: url,
 type
 }
 }

 if (isImageAsset(value)) {
 return value
 }

 const path = typeof value.path === 'string'
 ? value.path
 : typeof value.storagePath === 'string'
 ? value.storagePath
 : typeof value.localPath === 'string'
 ? value.localPath
 : null

 if (!path) return null

 const type: ImageStorageType = value.type
 ? value.type as ImageStorageType
 : path.startsWith('/images/')
 ? 'local'
 : path.startsWith('http')
 ? 'remote'
 : 'supabase'

 const signedUrl = typeof value.signedUrl === 'string'
 ? value.signedUrl
 : type === 'supabase'
 ? ''
 : path

 return {
 path,
 signedUrl,
 type
 }
}

export function imageSrc(value: ImageLike): string {
 if (!value) return ''
 if (typeof value === 'string') return value
 if (typeof value.signedUrl === 'string' && value.signedUrl.length > 0) return value.signedUrl

 const normalised = normaliseImageLike(value)
 return normalised?.signedUrl || normalised?.path || ''
}

export function mapImageLikes(values: ImageLike[]): ImageAsset[] {
 return values
 .map((item) => normaliseImageLike(item))
 .filter((item): item is ImageAsset => Boolean(item))
}
