/**
 * Migration script to download existing OpenAI image URLs and save them locally
 * Now uses Supabase instead of Prisma
 */

import { SupabaseDB } from '../src/lib/supabase-db'
import { downloadAndSaveImage, normalizeImageRecord } from '../src/lib/image-storage'

async function migrateExistingImages() {
  console.log('Starting migration of existing images...')
  
  try {
    // Find all books
    const books = await SupabaseDB.getAllBooks()

    console.log(`Found ${books.length} books with images`)

    for (const book of books) {
      if (!book.images || !Array.isArray(book.images)) continue
      
      const images = (book.images as any[]) || []
      const migratedImages: any[] = []
      let hasChanges = false

      console.log(`Processing book: ${book.title} (${images.length} images)`)

      for (let i = 0; i < images.length; i++) {
        const imageEntry = images[i]
        const normalized = normalizeImageRecord(imageEntry)

        if (normalized && normalized.type === 'supabase') {
          migratedImages.push({ path: normalized.path, type: normalized.type })
          if (typeof imageEntry === 'string') {
            hasChanges = true
          }
          continue
        }

        if (typeof imageEntry === 'string' && imageEntry.startsWith('/images/')) {
          migratedImages.push({ path: imageEntry, type: 'local' })
          hasChanges = true
          continue
        }

        if (typeof imageEntry === 'string' && !imageEntry.includes('oaidalleapiprodscus.blob.core.windows.net')) {
          migratedImages.push(imageEntry)
          continue
        }

        try {
          console.log(`  Downloading image ${i + 1}/${images.length}...`)
          const storedImage = await downloadAndSaveImage(imageEntry, {
            userId: book.user_id,
            bookId: book.id
          })
          migratedImages.push({ path: storedImage.path, type: storedImage.type })
          hasChanges = true

          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`    Failed to download image ${i + 1}: ${error}`)
          migratedImages.push(imageEntry)
        }
      }

      // Update the book if we made changes
      if (hasChanges && book.id) {
        await SupabaseDB.updateBook(book.id, { images: migratedImages })
        console.log(`  Updated book: ${book.title}`)
      }
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// Run the migration
migrateExistingImages()
