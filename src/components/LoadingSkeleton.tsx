/**
 * iOS-native loading skeleton components
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
 className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
 <div className={cn('skeleton shimmer', className)} />
)

export const SkeletonCard: React.FC<SkeletonProps> = ({ className }) => (
 <div className={cn('skeleton shimmer rounded-3xl p-6', className)}>
 <div className="skeleton shimmer h-6 w-3/4 mb-4 rounded-xl" />
 <div className="skeleton shimmer h-4 w-full mb-2 rounded-lg" />
 <div className="skeleton shimmer h-4 w-5/6 mb-4 rounded-lg" />
 <div className="skeleton shimmer h-10 w-full rounded-2xl" />
 </div>
)

export const SkeletonForm: React.FC<SkeletonProps> = ({ className }) => (
 <div className={cn('space-y-6', className)}>
 <div className="space-y-3">
 <div className="skeleton shimmer h-4 w-20 rounded-lg" />
 <div className="skeleton shimmer h-14 w-full rounded-2xl" />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-3">
 <div className="skeleton shimmer h-4 w-16 rounded-lg" />
 <div className="skeleton shimmer h-14 w-full rounded-2xl" />
 </div>
 <div className="space-y-3">
 <div className="skeleton shimmer h-4 w-24 rounded-lg" />
 <div className="skeleton shimmer h-14 w-full rounded-2xl" />
 </div>
 </div>
 <div className="space-y-3">
 <div className="skeleton shimmer h-4 w-20 rounded-lg" />
 <div className="skeleton shimmer h-32 w-full rounded-2xl" />
 </div>
 <div className="skeleton shimmer h-12 w-full rounded-2xl" />
 </div>
)

export const SkeletonProgress: React.FC<SkeletonProps> = ({ className }) => (
 <div className={cn('flex items-center justify-center gap-3', className)}>
 <div className="skeleton shimmer w-10 h-10 rounded-full" />
 <div className="skeleton shimmer w-16 h-1 rounded-full" />
 <div className="skeleton shimmer w-10 h-10 rounded-full" />
 <div className="skeleton shimmer w-16 h-1 rounded-full" />
 <div className="skeleton shimmer w-10 h-10 rounded-full" />
 </div>
)

export const SkeletonAnalyzing: React.FC<SkeletonProps> = ({ className }) => (
 <div className={cn('text-center space-y-6', className)}>
 <div className="relative">
 <div className="skeleton shimmer w-16 h-16 rounded-full mx-auto animate-pulse" />
 <div className="skeleton shimmer w-24 h-24 rounded-full mx-auto absolute inset-0 opacity-50 animate-ping" />
 </div>
 <div className="space-y-3">
 <div className="skeleton shimmer h-6 w-48 mx-auto rounded-xl" />
 <div className="skeleton shimmer h-4 w-64 mx-auto rounded-lg" />
 </div>
 <div className="skeleton shimmer h-2 w-80 mx-auto rounded-full" />
 </div>
)

export const SkeletonGrid: React.FC<SkeletonProps & { count?: number }> = ({ 
 className, 
 count = 6 
}) => (
 <div className={cn('grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2', className)}>
 {Array.from({ length: count }).map((_, i) => (
 <div key={i} className="skeleton shimmer aspect-square rounded-lg" />
 ))}
 </div>
)

export const SkeletonUpload: React.FC<SkeletonProps> = ({ className }) => (
 <div className={cn('border-2 border-dashed border-muted rounded-3xl p-12 text-center', className)}>
 <div className="skeleton shimmer w-16 h-16 rounded-2xl mx-auto mb-4" />
 <div className="skeleton shimmer h-6 w-32 mx-auto mb-2 rounded-xl" />
 <div className="skeleton shimmer h-4 w-48 mx-auto mb-4 rounded-lg" />
 <div className="skeleton shimmer h-12 w-32 mx-auto rounded-2xl" />
 </div>
)

interface LoadingSpinnerProps {
 size?: 'sm' | 'md' | 'lg'
 className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
 size = 'md', 
 className 
}) => {
 const sizeClasses = {
 sm: 'w-4 h-4',
 md: 'w-6 h-6',
 lg: 'w-8 h-8'
 }

 return (
 <div className={cn('animate-spin', sizeClasses[size], className)}>
 <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
 <circle 
 cx="12" 
 cy="12" 
 r="10" 
 stroke="currentColor" 
 strokeWidth="2" 
 strokeLinecap="round" 
 strokeDasharray="31.416" 
 strokeDashoffset="31.416"
 className="opacity-25"
 />
 <circle 
 cx="12" 
 cy="12" 
 r="10" 
 stroke="currentColor" 
 strokeWidth="2" 
 strokeLinecap="round" 
 strokeDasharray="31.416" 
 strokeDashoffset="23.562"
 className="animate-spin"
 />
 </svg>
 </div>
 )
}

interface ProgressRingProps {
 progress: number
 size?: 'sm' | 'md' | 'lg'
 className?: string
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ 
 progress, 
 size = 'md', 
 className 
}) => {
 const sizeClasses = {
 sm: 'w-8 h-8',
 md: 'w-12 h-12',
 lg: 'w-16 h-16'
 }

 const radius = 45
 const circumference = 2 * Math.PI * radius
 const strokeDashoffset = circumference - (progress / 100) * circumference

 return (
 <div className={cn('relative', sizeClasses[size], className)}>
 <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
 <circle 
 cx="50" 
 cy="50" 
 r={radius} 
 stroke="currentColor" 
 strokeWidth="8" 
 fill="none"
 className="opacity-20"
 />
 <circle 
 cx="50" 
 cy="50" 
 r={radius} 
 stroke="currentColor" 
 strokeWidth="8" 
 fill="none"
 strokeLinecap="round"
 strokeDasharray={circumference}
 strokeDashoffset={strokeDashoffset}
 className="transition-all duration-300 ease-out text-bookcraft-blue dark:text-bookcraft-blue/80"
 />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 <span className="text-xs font-semibold">{Math.round(progress)}%</span>
 </div>
 </div>
 )
}

// ─── BookCreation Skeletons ────────────────────────────────────────────────

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton as UISkeleton } from '@/components/ui/skeleton'

export function FormStepSkeleton() {
 return (
 <Card className="shadow-lg sm:shadow-xl border border-border bg-card/80 backdrop-blur">
 <CardHeader className="p-4 sm:p-6">
 <UISkeleton className="h-6 w-48" />
 </CardHeader>
 <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
 <div className="space-y-2">
 <UISkeleton className="h-4 w-20" />
 <UISkeleton className="h-10 w-full" />
 </div>
 <div className="space-y-2">
 <UISkeleton className="h-4 w-24" />
 <UISkeleton className="h-10 w-full" />
 </div>
 </div>

 <div className="space-y-2">
 <UISkeleton className="h-4 w-32" />
 <UISkeleton className="h-24 w-full" />
 </div>

 <div className="flex justify-end gap-2">
 <UISkeleton className="h-10 w-24" />
 <UISkeleton className="h-10 w-24" />
 </div>
 </CardContent>
 </Card>
 )
}

export function ProgressStepsSkeleton() {
 return (
 <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
 {[1, 2, 3, 4].map((step, idx) => (
 <div key={step} className="flex items-center">
 <UISkeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
 {idx < 3 && <UISkeleton className="w-4 sm:w-8 h-1 mx-1 sm:mx-2 rounded-full" />}
 </div>
 ))}
 </div>
 )
}

export function AutomatedBookCreationSkeleton() {
 return (
 <div className="min-h-screen bg-background">
 <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
 <div className="max-w-4xl mx-auto">
 {/* Header Skeleton */}
 <div className="text-center mb-6 sm:mb-8">
 <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
 <UISkeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
 <UISkeleton className="h-8 w-64" />
 </div>
 <UISkeleton className="h-5 w-96 max-w-full mx-auto mb-4 sm:mb-6" />

 {/* Progress Steps */}
 <ProgressStepsSkeleton />
 </div>

 {/* Form Skeleton */}
 <FormStepSkeleton />
 </div>
 </div>
 </div>
 )
}

export function PictureBookCreationSkeleton() {
 return (
 <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
 <div className="max-w-4xl mx-auto">
 <Card className="shadow-lg sm:shadow-xl border border-border bg-card">
 <CardHeader className="p-4 sm:p-6">
 <UISkeleton className="h-6 w-48" />
 </CardHeader>
 <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 <div className="space-y-2">
 <UISkeleton className="h-4 w-16" />
 <UISkeleton className="h-10 w-full" />
 </div>
 <div className="space-y-2">
 <UISkeleton className="h-4 w-12" />
 <UISkeleton className="h-10 w-full" />
 </div>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
 <div className="space-y-2">
 <UISkeleton className="h-4 w-28" />
 <UISkeleton className="h-10 w-full" />
 </div>
 <div className="space-y-2">
 <UISkeleton className="h-4 w-24" />
 <UISkeleton className="h-10 w-full" />
 </div>
 </div>

 <div className="space-y-2">
 <UISkeleton className="h-4 w-36" />
 <UISkeleton className="h-24 w-full" />
 </div>

 <div className="flex flex-col sm:flex-row justify-end gap-2">
 <UISkeleton className="h-10 w-full sm:w-24" />
 <UISkeleton className="h-10 w-full sm:w-24" />
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 )
}
