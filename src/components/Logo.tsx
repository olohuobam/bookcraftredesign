'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
 href?: string
 size?: 'sm' | 'md' | 'lg' | 'xl'
 showText?: boolean
 className?: string
 darkMode?: boolean
}

const sizeMap = {
 sm: { width: 32, height: 32 },
 md: { width: 40, height: 40 },
 lg: { width: 48, height: 48 },
 xl: { width: 64, height: 64 },
}

export default function Logo({
 href,
 size = 'md',
 showText = false,
 className = '',
 darkMode = false
}: LogoProps) {
 const dimensions = sizeMap[size]

 const logoContent = (
 <div className={`flex items-center space-x-2 ${className}`}>
 <Image
 src="/Logo/Logo.svg"
 alt="Bookcraft Logo"
 width={dimensions.width}
 height={dimensions.height}
 className="object-contain"
 priority
 />
 {showText && (
 <span className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
 bookcraft<span className="text-bookcraft-blue">.dev</span>
 </span>
 )}
 </div>
 )

 if (href) {
 return (
 <Link href={href} className="flex items-center">
 {logoContent}
 </Link>
 )
 }

 return logoContent
}
