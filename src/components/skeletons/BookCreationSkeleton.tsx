import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function FormStepSkeleton() {
 return (
 <Card className="shadow-lg sm:shadow-xl border-0 bg-white/95 backdrop-blur">
 <CardHeader className="p-4 sm:p-6">
 <Skeleton className="h-6 w-48" />
 </CardHeader>
 <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
 <div className="space-y-2">
 <Skeleton className="h-4 w-20" />
 <Skeleton className="h-10 w-full" />
 </div>
 <div className="space-y-2">
 <Skeleton className="h-4 w-24" />
 <Skeleton className="h-10 w-full" />
 </div>
 </div>

 <div className="space-y-2">
 <Skeleton className="h-4 w-32" />
 <Skeleton className="h-24 w-full" />
 </div>

 <div className="flex justify-end gap-2">
 <Skeleton className="h-10 w-24" />
 <Skeleton className="h-10 w-24" />
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
 <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
 {idx < 3 && <Skeleton className="w-4 sm:w-8 h-1 mx-1 sm:mx-2 rounded-full" />}
 </div>
 ))}
 </div>
 )
}

export function AutomatedBookCreationSkeleton() {
 return (
 <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
 <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
 <div className="max-w-4xl mx-auto">
 {/* Header Skeleton */}
 <div className="text-center mb-6 sm:mb-8">
 <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
 <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
 <Skeleton className="h-8 w-64" />
 </div>
 <Skeleton className="h-5 w-96 max-w-full mx-auto mb-4 sm:mb-6" />

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
 <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 p-3 sm:p-4 md:p-6">
 <div className="max-w-4xl mx-auto">
 <Card className="shadow-lg sm:shadow-xl border-0">
 <CardHeader className="p-4 sm:p-6">
 <Skeleton className="h-6 w-48" />
 </CardHeader>
 <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 <div className="space-y-2">
 <Skeleton className="h-4 w-16" />
 <Skeleton className="h-10 w-full" />
 </div>
 <div className="space-y-2">
 <Skeleton className="h-4 w-12" />
 <Skeleton className="h-10 w-full" />
 </div>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
 <div className="space-y-2">
 <Skeleton className="h-4 w-28" />
 <Skeleton className="h-10 w-full" />
 </div>
 <div className="space-y-2">
 <Skeleton className="h-4 w-24" />
 <Skeleton className="h-10 w-full" />
 </div>
 </div>

 <div className="space-y-2">
 <Skeleton className="h-4 w-36" />
 <Skeleton className="h-24 w-full" />
 </div>

 <div className="flex flex-col sm:flex-row justify-end gap-2">
 <Skeleton className="h-10 w-full sm:w-24" />
 <Skeleton className="h-10 w-full sm:w-24" />
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 )
}
