'use client'

import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LibraryBookshelf from '@/components/library/LibraryBookshelf'
import { useHaptics } from '@/hooks/useHaptics'
import { useBookCache } from '@/hooks/useBookCache'

import { BooksSkeleton } from '@/components/skeletons/BooksSkeleton'
import { AnimatePresence, motion } from 'framer-motion'
import { AppBar } from '@/components/AppBar'
// FAB moved to _deprecated
import { Plus } from 'lucide-react'


export default function BooksPage() {
 const { user, getIdToken } = useAuth()
 const { t } = useLanguage()
 const { impact } = useHaptics()
 const router = useRouter()


  // Use cached book fetching with stale-while-revalidate
 const {
 books,
 loading,
 isRevalidating,
 error,
 refresh,
 removeBookFromCache,
 setError
 } = useBookCache(user?.id, getIdToken)

  // Wrapper for LibraryBookshelf onRefresh (expects Promise<void>)
 const handleRefresh = useCallback(async () => {
 await refresh()
 }, [refresh])

 const handleDeleteBook = useCallback(async (bookId: string) => {
 impact('medium')
 if (!window.confirm(t('confirmDeleteBook'))) return

 try {
 const token = await getIdToken()
 if (!token) return

      // Optimistic update - remove from cache immediately
 removeBookFromCache(bookId)

 const res = await fetch(`/api/books/${bookId}`, {
 method: 'DELETE',
 headers: { 'Authorization': `Bearer ${token}` },
 })

 if (!res.ok) {
        // Revert on error by refreshing
 refresh()
 throw new Error(t('deleteFailed'))
 }
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Delete failed')
 }
 }, [getIdToken, impact, removeBookFromCache, refresh, setError, t])

 if (!user) {
 return null
 }

 return (
 <div className="h-full">
 <AnimatePresence mode="wait">
 {loading ? (
 <motion.div
 key="skeleton"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.3 }}
 >
 <BooksSkeleton />
 </motion.div>
 ) : (
 <motion.div
 key="content"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.4 }}
 >
 <div className="bg-background pb-32 lg:pb-8">
 {/* Mobile App Bar */}
 <div className="lg:hidden">
 <AppBar
 title={t('myLibrary')}
 subtitle={t('yourPersonalBookCollection')}
 />
 </div>

 {/* Desktop Header */}
 <div className="hidden lg:block bg-card border-b border-border px-6 py-6">
 <div className="text-center lg:text-left mb-2">
 <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
 {t('myLibrary')}
 </h1>
 <p className="text-muted-foreground mt-1">
 {t('yourPersonalBookCollection')}
 {isRevalidating && (
 <span className="ml-2 text-xs text-muted-foreground/60">
 ({t('refreshing')})
 </span>
 )}
 </p>
 </div>
 </div>

 {/* Error Message */}
 {error && (
 <div className="px-6 mt-4">
 <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
 <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
 <span className="text-destructive text-sm font-bold">!</span>
 </div>
 <div className="flex-1">
 <p className="text-sm text-destructive font-medium">{error}</p>
 </div>
 <button
 onClick={() => setError(null)}
 className="flex-shrink-0 text-destructive/60 hover:text-destructive transition-colors"
 >
 <span className="text-lg leading-none">×</span>
 </button>
 </div>
 </div>
 )}

 {/* Main Content */}
 <div className="px-6 py-6">
 <LibraryBookshelf
 books={books}
 onDeleteBook={handleDeleteBook}
 onRefresh={handleRefresh}
 isLoading={false}
 />
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Create New Book Button */}
 <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40">
 <button
 onClick={() => router.push('/dashboard/create')}
 title={t('createNewBook')}
 className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all bg-bookcraft-blue hover:brightness-110 shadow-bookcraft-blue/30 active:scale-95"
 >
 <Plus className="h-6 w-6" />
 </button>
 </div>
 </div>
 )
}
