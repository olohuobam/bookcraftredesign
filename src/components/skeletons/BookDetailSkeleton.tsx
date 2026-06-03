export function BookDetailSkeleton() {
 return (
 <div className="min-h-screen bg-background pb-32 lg:pb-8">
 {/* Mobile App Bar Skeleton */}
 <div className="lg:hidden sticky top-0 z-20 backdrop-blur-xl bg-background/95 border-b border-border safe-area-top">
 <div className="flex items-center justify-between px-4 sm:px-6 h-14">
 <div className="flex items-center gap-3">
 <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px' }} />
 <div>
 <div className="skeleton mb-1" style={{ width: '140px', height: '22px' }} />
 <div className="skeleton" style={{ width: '100px', height: '14px' }} />
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '12px' }} />
 </div>
 </div>
 </div>

 <div className="px-4 sm:px-6 py-4 space-y-4 max-w-5xl mx-auto">
 {/* Desktop Header */}
 <div className="hidden lg:flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
 <div>
 <div className="skeleton mb-1" style={{ width: '240px', height: '28px' }} />
 <div className="skeleton" style={{ width: '180px', height: '16px' }} />
 </div>
 </div>
 <div className="flex gap-2">
 <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
 <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
 </div>
 </div>

 {/* Tabs Skeleton */}
 <div className="flex gap-1 border-b border-border pb-1">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '8px' }} />
 ))}
 </div>

 {/* Book Info Card */}
 <div className="bg-card rounded-2xl border border-border p-6">
 <div className="flex flex-col sm:flex-row gap-6">
 {/* Cover Image */}
 <div className="skeleton flex-shrink-0" style={{ width: '160px', height: '240px', borderRadius: '12px' }} />

 {/* Book Details */}
 <div className="flex-1 space-y-4">
 <div className="skeleton" style={{ width: '70%', height: '28px' }} />
 <div className="skeleton" style={{ width: '50%', height: '18px' }} />

 {/* Stats */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="text-center p-3 rounded-xl bg-muted">
 <div className="skeleton mx-auto mb-2" style={{ width: '40px', height: '24px' }} />
 <div className="skeleton mx-auto" style={{ width: '60px', height: '14px' }} />
 </div>
 ))}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-2 mt-4">
 <div className="skeleton" style={{ width: '120px', height: '40px', borderRadius: '8px' }} />
 <div className="skeleton" style={{ width: '120px', height: '40px', borderRadius: '8px' }} />
 </div>
 </div>
 </div>
 </div>

 {/* Chapter List Skeleton */}
 <div className="bg-card rounded-2xl border border-border overflow-hidden">
 <div className="p-4 border-b border-border">
 <div className="skeleton" style={{ width: '120px', height: '22px' }} />
 </div>
 <div className="divide-y divide-border">
 {[1, 2, 3, 4, 5].map((i) => (
 <div key={i} className="p-4">
 <div className="flex items-center gap-3">
 <div className="skeleton skeleton-circle flex-shrink-0" style={{ width: '32px', height: '32px' }} />
 <div className="flex-1 space-y-2">
 <div className="skeleton" style={{ width: '60%', height: '18px' }} />
 <div className="skeleton" style={{ width: '40%', height: '14px' }} />
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )
}
