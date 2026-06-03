import type { MetadataRoute } from 'next'

const rawUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://bookcraft.dev').replace(/\/+$/, '')
const BASE_URL = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`

export default function sitemap(): MetadataRoute.Sitemap {
 return [
 {
 url: BASE_URL,
 lastModified: new Date(),
 changeFrequency: 'weekly',
 priority: 1.0,
 },
 {
 url: `${BASE_URL}/ueber-uns`,
 lastModified: new Date(),
 changeFrequency: 'monthly',
 priority: 0.8,
 },
 {
 url: `${BASE_URL}/faq`,
 lastModified: new Date(),
 changeFrequency: 'monthly',
 priority: 0.8,
 },
 {
 url: `${BASE_URL}/kontakt`,
 lastModified: new Date(),
 changeFrequency: 'monthly',
 priority: 0.7,
 },
 {
 url: `${BASE_URL}/demo-book-scene`,
 lastModified: new Date(),
 changeFrequency: 'monthly',
 priority: 0.6,
 },
 {
 url: `${BASE_URL}/video-demo`,
 lastModified: new Date(),
 changeFrequency: 'monthly',
 priority: 0.6,
 },
 {
 url: `${BASE_URL}/impressum`,
 lastModified: new Date(),
 changeFrequency: 'yearly',
 priority: 0.3,
 },
 {
 url: `${BASE_URL}/datenschutz`,
 lastModified: new Date(),
 changeFrequency: 'yearly',
 priority: 0.3,
 },
 {
 url: `${BASE_URL}/agb`,
 lastModified: new Date(),
 changeFrequency: 'yearly',
 priority: 0.3,
 },
 {
 url: `${BASE_URL}/widerruf`,
 lastModified: new Date(),
 changeFrequency: 'yearly',
 priority: 0.3,
 },
 ]
}
