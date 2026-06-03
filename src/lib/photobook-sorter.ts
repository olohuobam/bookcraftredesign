import type { PhotobookPhoto, PhotoSortOption, PhotoEra } from '@/types/photobook'
import { getEraOrder } from '@/types/photobook'

/**
 * Sortiert Fotos nach verschiedenen Kriterien
 */
export function sortPhotos(
 photos: PhotobookPhoto[],
 sortBy: PhotoSortOption
): PhotobookPhoto[] {
 const photosCopy = [...photos]

 switch (sortBy) {
 case 'age':
 return sortByAge(photosCopy)
 case 'similarity':
 return sortBySimilarity(photosCopy)
 case 'random':
 return shuffleArray(photosCopy)
 case 'date_taken':
 return sortByDateTaken(photosCopy)
 case 'manual':
 default:
 return photosCopy
 }
}

/**
 * Sortiert nach geschätztem Alter (älteste zuerst)
 */
function sortByAge(photos: PhotobookPhoto[]): PhotobookPhoto[] {
 return photos.sort((a, b) => {
 const eraA = a.analysis?.estimatedEra || 'unknown'
 const eraB = b.analysis?.estimatedEra || 'unknown'

    // Erst nach Era sortieren
 const eraOrderDiff = getEraOrder(eraA) - getEraOrder(eraB)
 if (eraOrderDiff !== 0) return eraOrderDiff

    // Bei gleicher Era nach geschätztem Jahr
 const yearA = a.manualYear || a.analysis?.estimatedYear || 9999
 const yearB = b.manualYear || b.analysis?.estimatedYear || 9999
 return yearA - yearB
 })
}

/**
 * Sortiert nach Aufnahmedatum (falls EXIF-Daten vorhanden)
 */
function sortByDateTaken(photos: PhotobookPhoto[]): PhotobookPhoto[] {
 return photos.sort((a, b) => {
    // Falls manuelle Jahre gesetzt sind, nutze diese
 const yearA = a.manualYear || a.analysis?.estimatedYear
 const yearB = b.manualYear || b.analysis?.estimatedYear

 if (yearA && yearB) {
 return yearA - yearB
 }
 if (yearA) return -1
 if (yearB) return 1

    // Fallback: nach Era sortieren
 const eraA = a.analysis?.estimatedEra || 'unknown'
 const eraB = b.analysis?.estimatedEra || 'unknown'
 return getEraOrder(eraA) - getEraOrder(eraB)
 })
}

/**
 * Fix 4: Cosine similarity between two embedding vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
 if (a.length !== b.length || a.length === 0) return 0
 let dot = 0, normA = 0, normB = 0
 for (let i = 0; i < a.length; i++) {
  dot += a[i] * b[i]
  normA += a[i] * a[i]
  normB += b[i] * b[i]
 }
 const denom = Math.sqrt(normA) * Math.sqrt(normB)
 return denom === 0 ? 0 : dot / denom
}

/**
 * Sortiert nach Ähnlichkeit - gruppiert ähnliche Fotos zusammen
 * Verwendet Embedding-Cosine-Similarity wenn vorhanden, sonst kategorie-basiertes Fallback
 */
function sortBySimilarity(photos: PhotobookPhoto[]): PhotobookPhoto[] {
 if (photos.length <= 2) return photos

  // Berechne Ähnlichkeitsscores zwischen allen Foto-Paaren
 const similarityMatrix = buildSimilarityMatrix(photos)

  // Greedy-Algorithmus: Starte mit erstem Foto und füge immer das ähnlichste hinzu
 const sorted: PhotobookPhoto[] = []
 const remaining = new Set(photos.map((_, i) => i))

  // Starte mit dem Foto, das die meisten Verbindungen hat
 let current = findMostConnectedPhoto(similarityMatrix, remaining)
 remaining.delete(current)
 sorted.push(photos[current])

 while (remaining.size > 0) {
    // Finde das ähnlichste Foto zum aktuellen
 let bestNext = -1
 let bestScore = -1

 for (const idx of remaining) {
 const score = similarityMatrix[current][idx]
 if (score > bestScore) {
 bestScore = score
 bestNext = idx
 }
 }

 if (bestNext >= 0) {
 remaining.delete(bestNext)
 sorted.push(photos[bestNext])
 current = bestNext
 } else {
      // Fallback: nimm das erste verbleibende
 const next = remaining.values().next().value
 if (next !== undefined) {
 remaining.delete(next)
 sorted.push(photos[next])
 current = next
 }
 }
 }

 return sorted
}

/**
 * Berechnet eine Ähnlichkeitsmatrix basierend auf Foto-Eigenschaften
 */
function buildSimilarityMatrix(photos: PhotobookPhoto[]): number[][] {
 const n = photos.length
 const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))

 for (let i = 0; i < n; i++) {
 for (let j = i + 1; j < n; j++) {
 const score = calculateSimilarity(photos[i], photos[j])
 matrix[i][j] = score
 matrix[j][i] = score
 }
 }

 return matrix
}

/**
 * Berechnet die Ähnlichkeit zwischen zwei Fotos (0-1)
 * Fix 4: Nutzt Embedding-Cosine-Similarity wenn vorhanden
 */
function calculateSimilarity(a: PhotobookPhoto, b: PhotobookPhoto): number {
 if (!a.analysis || !b.analysis) return 0

 // Fix 4: Use cosine similarity if both have embedding vectors
 if (a.analysis.embeddingVector && b.analysis.embeddingVector &&
     a.analysis.embeddingVector.length > 0 && b.analysis.embeddingVector.length > 0) {
  return cosineSimilarity(a.analysis.embeddingVector, b.analysis.embeddingVector)
 }

 let score = 0
 let weights = 0

  // 1. Zeitliche Nähe (30% Gewichtung)
 const eraWeight = 0.3
 weights += eraWeight
 if (a.analysis.estimatedEra === b.analysis.estimatedEra) {
 score += eraWeight
 } else {
 const eraDiff = Math.abs(
 getEraOrder(a.analysis.estimatedEra) - getEraOrder(b.analysis.estimatedEra)
 )
 score += eraWeight * Math.max(0, 1 - eraDiff * 0.2)
 }

  // 2. Ähnliche Kategorien (25% Gewichtung)
 const categoryWeight = 0.25
 weights += categoryWeight
 const commonCategories = a.analysis.categories.filter(
 cat => b.analysis!.categories.includes(cat)
 ).length
 const totalCategories = new Set([
 ...a.analysis.categories,
 ...b.analysis.categories
 ]).size
 if (totalCategories > 0) {
 score += categoryWeight * (commonCategories / totalCategories)
 }

  // 3. Ähnliche Stimmung (15% Gewichtung)
 const moodWeight = 0.15
 weights += moodWeight
 if (a.analysis.mood === b.analysis.mood) {
 score += moodWeight
 }

  // 4. Ähnliches Setting (15% Gewichtung)
 const settingWeight = 0.15
 weights += settingWeight
 if (a.analysis.setting === b.analysis.setting) {
 score += settingWeight
 }

  // 5. Ähnliche Farbgebung (10% Gewichtung)
 const colorWeight = 0.10
 weights += colorWeight
 if (a.analysis.isBlackAndWhite === b.analysis.isBlackAndWhite) {
 score += colorWeight * 0.5
 }
 if (a.analysis.isSepia === b.analysis.isSepia) {
 score += colorWeight * 0.5
 }

  // 6. Ähnliche Personenanzahl (5% Gewichtung)
 const peopleWeight = 0.05
 weights += peopleWeight
 const peopleDiff = Math.abs(a.analysis.peopleCount - b.analysis.peopleCount)
 score += peopleWeight * Math.max(0, 1 - peopleDiff * 0.2)

 return score / weights
}

/**
 * Findet das Foto mit den meisten/stärksten Verbindungen
 */
function findMostConnectedPhoto(
 matrix: number[][],
 available: Set<number>
): number {
 let best = available.values().next().value || 0
 let bestSum = -1

 for (const idx of available) {
 let sum = 0
 for (const other of available) {
 if (idx !== other) {
 sum += matrix[idx][other]
 }
 }
 if (sum > bestSum) {
 bestSum = sum
 best = idx
 }
 }

 return best
}

/**
 * Fisher-Yates Shuffle für zufällige Sortierung
 */
function shuffleArray<T>(array: T[]): T[] {
 const shuffled = [...array]
 for (let i = shuffled.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1))
 ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
 }
 return shuffled
}

/**
 * Gruppiert Fotos nach Era für die Anzeige
 */
export function groupPhotosByEra(
 photos: PhotobookPhoto[]
): Map<PhotoEra, PhotobookPhoto[]> {
 const groups = new Map<PhotoEra, PhotobookPhoto[]>()

 for (const photo of photos) {
 const era = photo.analysis?.estimatedEra || 'unknown'
 if (!groups.has(era)) {
 groups.set(era, [])
 }
 groups.get(era)!.push(photo)
 }

  // Sortiere die Map nach Era-Reihenfolge
 const sortedGroups = new Map<PhotoEra, PhotobookPhoto[]>()
 const eras: PhotoEra[] = [
 '1900-1920', '1920-1940', '1940-1960', '1960-1980',
 '1980-2000', '2000-2010', '2010-2020', '2020-present', 'unknown'
 ]

 for (const era of eras) {
 if (groups.has(era)) {
 sortedGroups.set(era, groups.get(era)!)
 }
 }

 return sortedGroups
}

/**
 * Gruppiert Fotos nach Kategorie
 */
export function groupPhotosByCategory(
 photos: PhotobookPhoto[]
): Map<string, PhotobookPhoto[]> {
 const groups = new Map<string, PhotobookPhoto[]>()

 for (const photo of photos) {
 const categories = photo.analysis?.categories || ['Sonstige']
 for (const category of categories) {
 if (!groups.has(category)) {
 groups.set(category, [])
 }
 groups.get(category)!.push(photo)
 }
 }

 return groups
}

/**
 * Erstellt Seiten aus sortierten Fotos
 */
export function createPagesFromPhotos(
 photos: PhotobookPhoto[],
 photosPerPage: number
): { pageNumber: number; photos: PhotobookPhoto[] }[] {
 const pages: { pageNumber: number; photos: PhotobookPhoto[] }[] = []

 for (let i = 0; i < photos.length; i += photosPerPage) {
 pages.push({
 pageNumber: pages.length + 1,
 photos: photos.slice(i, i + photosPerPage)
 })
 }

 return pages
}
