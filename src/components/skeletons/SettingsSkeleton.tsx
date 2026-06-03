export function SettingsSkeleton() {
 return (
 <div className="min-h-screen bg-background pb-32 lg:pb-8">
 {/* Mobile Header Skeleton */}
 <div className="lg:hidden sticky top-0 z-20 backdrop-blur-xl bg-background/95 border-b border-border safe-area-top">
 <div className="flex items-center justify-between px-4 sm:px-6 h-14">
 <div>
 <div className="skeleton mb-1" style={{ width: '120px', height: '22px' }} />
 <div className="skeleton" style={{ width: '160px', height: '14px' }} />
 </div>
 </div>
 </div>

 <div className="px-6 py-6">
 {/* Desktop Header */}
 <div className="hidden lg:block mb-8">
 <div className="skeleton mb-2" style={{ width: '200px', height: '36px' }} />
 <div className="skeleton" style={{ width: '240px', height: '20px' }} />
 </div>

 <div className="space-y-8">
 {/* Profile Card Skeleton */}
 <div className="bg-card rounded-lg border border-border p-6">
 <div className="flex items-center space-x-2 mb-6">
 <div className="skeleton skeleton-circle" style={{ width: '20px', height: '20px' }} />
 <div className="skeleton" style={{ width: '160px', height: '24px' }} />
 </div>

 {/* Avatar */}
 <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 pb-6 border-b border-border">
 <div className="skeleton skeleton-circle flex-shrink-0" style={{ width: '96px', height: '96px' }} />
 <div className="flex-1">
 <div className="skeleton mb-2" style={{ width: '120px', height: '18px' }} />
 <div className="skeleton mb-3" style={{ width: '200px', height: '14px' }} />
 <div className="skeleton" style={{ width: '160px', height: '36px', borderRadius: '8px' }} />
 </div>
 </div>

 {/* Form Fields */}
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <div className="skeleton mb-2" style={{ width: '60px', height: '14px' }} />
 <div className="skeleton" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
 </div>
 <div>
 <div className="skeleton mb-2" style={{ width: '60px', height: '14px' }} />
 <div className="skeleton" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
 </div>
 </div>
 <div>
 <div className="skeleton mb-2" style={{ width: '80px', height: '14px' }} />
 <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '8px' }} />
 </div>
 {/* Theme selector */}
 <div>
 <div className="skeleton mb-3" style={{ width: '60px', height: '14px' }} />
 <div className="skeleton" style={{ width: '280px', height: '44px', borderRadius: '8px' }} />
 </div>
 </div>
 </div>

 {/* Notifications Card Skeleton */}
 <div className="bg-card rounded-lg border border-border p-6">
 <div className="flex items-center space-x-2 mb-6">
 <div className="skeleton skeleton-circle" style={{ width: '20px', height: '20px' }} />
 <div className="skeleton" style={{ width: '140px', height: '24px' }} />
 </div>
 <div className="space-y-4">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="flex items-center justify-between gap-4">
 <div className="flex-1">
 <div className="skeleton mb-1" style={{ width: '160px', height: '16px' }} />
 <div className="skeleton" style={{ width: '240px', height: '14px' }} />
 </div>
 <div className="skeleton flex-shrink-0" style={{ width: '48px', height: '28px', borderRadius: '14px' }} />
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
