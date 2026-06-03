import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function EditorHeaderSkeleton() {
 return (
 <div className="bg-background/95 backdrop-blur-xl shadow-sm border-b border-border sticky top-0 z-40">
 <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
 <div className="flex items-center gap-2 sm:gap-4">
 <Skeleton className="h-8 w-20" />
 <div>
 <Skeleton className="h-6 w-32 mb-1" />
 <Skeleton className="h-4 w-48" />
 </div>
 </div>
 <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
 <Skeleton className="h-6 w-24" />
 <Skeleton className="h-6 w-24" />
 </div>
 </div>

 {/* Tab Navigation Skeleton */}
 <div className="flex gap-1 sm:gap-2 mt-3 sm:mt-4 border-b border-border overflow-x-auto">
 <Skeleton className="h-10 w-24" />
 <Skeleton className="h-10 w-32" />
 <Skeleton className="h-10 w-28" />
 </div>
 </div>
 </div>
 )
}

export function BookInfoSkeleton() {
 return (
 <div className="mb-6 sm:mb-8">
 <div className="bg-gradient-to-br from-blue-950/30 to-blue-950/30 dark:from-blue-950/40 dark:to-blue-950/40 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-4 sm:p-6 md:p-8 text-center border border-blue-800/30">
 <Skeleton className="h-8 sm:h-10 w-64 mx-auto mb-3 sm:mb-4" />
 <Skeleton className="h-4 sm:h-5 w-96 max-w-full mx-auto mb-4 sm:mb-6" />
 <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
 <Skeleton className="h-6 w-24" />
 <Skeleton className="h-6 w-32" />
 <Skeleton className="h-6 w-28" />
 <Skeleton className="h-6 w-24" />
 </div>
 </div>
 </div>
 )
}

export function BookPageSkeleton() {
 return (
 <div className="w-full md:w-1/2">
 <div className="w-full bg-card p-4 sm:p-6 md:rounded-l-2xl md:border-r border-border min-h-[500px] md:h-[700px] flex flex-col relative shadow-inner">
 {/* Page number skeleton */}
 <Skeleton className="absolute top-2 sm:top-4 left-2 sm:left-4 h-4 w-8" />

 {/* Chapter title skeleton */}
 <Skeleton className="h-6 sm:h-8 w-3/4 mx-auto mb-4 sm:mb-6" />

 {/* Content skeleton */}
 <div className="flex-1 space-y-3">
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-11/12" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-10/12" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-11/12" />
 <Skeleton className="h-4 w-9/12" />
 </div>
 </div>
 </div>
 )
}

export function EditorSkeleton() {
 return (
 <div className="min-h-screen bg-background">
 <EditorHeaderSkeleton />

 <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
 <BookInfoSkeleton />

 {/* Book Pages Skeleton */}
 <div className="relative">
 <div className="flex flex-col md:flex-row bg-card rounded-xl md:rounded-2xl shadow-2xl border border-border overflow-hidden min-h-[500px] md:h-[700px] relative max-w-6xl mx-auto">
 <div className="hidden md:block absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-border to-border/50 transform -translate-x-1/2 z-10 shadow-lg" />
 <BookPageSkeleton />
 <div className="hidden md:block w-1/2">
 <BookPageSkeleton />
 </div>
 </div>

 {/* Navigation Skeleton */}
 <div className="flex flex-col sm:flex-row justify-between items-center mt-4 sm:mt-6 gap-3 sm:gap-0">
 <Skeleton className="h-10 w-full sm:w-32" />
 <div className="flex items-center gap-2">
 <Skeleton className="h-4 w-24" />
 <div className="flex gap-1">
 <Skeleton className="h-2 w-2 rounded-full" />
 <Skeleton className="h-2 w-2 rounded-full" />
 <Skeleton className="h-2 w-2 rounded-full" />
 </div>
 </div>
 <Skeleton className="h-10 w-full sm:w-32" />
 </div>
 </div>

 {/* Statistics Skeleton */}
 <div className="mt-6 sm:mt-8 bg-card rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border">
 <Skeleton className="h-5 w-48 mb-3 sm:mb-4" />
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
 <div className="text-center">
 <Skeleton className="h-8 w-16 mx-auto mb-1" />
 <Skeleton className="h-4 w-20 mx-auto" />
 </div>
 <div className="text-center">
 <Skeleton className="h-8 w-16 mx-auto mb-1" />
 <Skeleton className="h-4 w-24 mx-auto" />
 </div>
 <div className="text-center">
 <Skeleton className="h-8 w-16 mx-auto mb-1" />
 <Skeleton className="h-4 w-20 mx-auto" />
 </div>
 <div className="text-center">
 <Skeleton className="h-8 w-16 mx-auto mb-1" />
 <Skeleton className="h-4 w-28 mx-auto" />
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
