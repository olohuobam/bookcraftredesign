import type { MetadataRoute } from 'next'

const rawUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://bookcraft.dev').replace(/\/+$/, '')
const BASE_URL = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`

export default function robots(): MetadataRoute.Robots {
 return {
 rules: [
 {
 userAgent: '*',
 allow: '/',
 disallow: [
 '/api/',
 '/dashboard/',
 '/payment/',
 '/success',
 '/cancel',
 ],
 },
 ],
 sitemap: `${BASE_URL}/sitemap.xml`,
 }
}
