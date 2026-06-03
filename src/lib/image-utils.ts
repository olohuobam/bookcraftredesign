/**
 * Normalize an image reference that may be either a plain URL string
 * or a `{ path, type }` object stored in the database.
 *
 * Returns a usable URL string, or an empty string when nothing is available.
 */
export type ImageRef = string | { path?: string; url?: string; type?: string; imageUrl?: string } | null | undefined

export function getImageUrl(image: ImageRef): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  if (typeof image === 'object') {
    // Try common URL-carrying keys in order of preference
    if (image.url && typeof image.url === 'string') return image.url
    if (image.imageUrl && typeof image.imageUrl === 'string') return image.imageUrl
    if (image.path && typeof image.path === 'string') return image.path
  }
  return ''
}
