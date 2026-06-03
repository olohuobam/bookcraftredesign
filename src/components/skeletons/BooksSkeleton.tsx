export function BooksSkeleton() {
 return (
 <div className="min-h-screen bg-background pb-24">
 {/* Header Skeleton */}
 <div className="bg-card border-b border-border px-4 lg:px-8 py-6 safe-area-top">
 <div className="max-w-7xl mx-auto">
 <div className="text-center lg:text-left mb-2">
 <div className="skeleton mx-auto lg:mx-0 mb-2" style={{ width: '240px', height: '36px' }} />
 <div className="skeleton mx-auto lg:mx-0" style={{ width: '280px', height: '20px' }} />
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
 {/* Search Bar & Controls Skeleton */}
 <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg px-4 py-3 border-b border-border/50 -mx-4 mb-4">
 <div className="flex gap-3 mb-4">
 <div className="skeleton flex-1" style={{ height: '48px', borderRadius: '16px' }} />
 <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '16px' }} />
 <div className="flex bg-card rounded-2xl p-1 gap-1">
 <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
 <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
 </div>
 </div>

 {/* Category Chips */}
 <div className="flex gap-2 overflow-hidden">
 {[1, 2, 3, 4, 5].map((i) => (
 <div key={i} className="skeleton flex-shrink-0" style={{ width: '100px', height: '40px', borderRadius: '20px' }} />
 ))}
 </div>
 </div>

 {/* Books Grid Skeleton */}
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 pt-5">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
 <div key={i} className="flex flex-col">
 {/* Book Cover */}
 <div className="relative">
 <div className="skeleton aspect-[2/3] rounded-xl" />
 {/* Shadow */}
 <div className="absolute left-3 right-3 h-4 bg-black/10 blur-lg rounded-full -bottom-2" />
 </div>

 {/* Book Info */}
 <div className="mt-3 space-y-2 px-1">
 <div className="skeleton mx-auto" style={{ width: '80%', height: '16px' }} />
 <div className="skeleton mx-auto" style={{ width: '60%', height: '14px' }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )
}
