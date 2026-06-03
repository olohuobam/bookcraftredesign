'use client'

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

/**
 * OfflineFallback Component
 *
 * Displays when the mobile app cannot connect to the web server.
 * Provides user feedback and retry functionality.
 *
 * Usage: Import and conditionally render when server is unreachable.
 */
export default function OfflineFallback() {
 const [isRetrying, setIsRetrying] = useState(false)
 const { showToast } = useToast()

 const handleRetry = async () => {
 setIsRetrying(true)

 try {
      // Try to ping the server
 const serverUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
 const response = await fetch(`${serverUrl}/api/health`, {
 method: 'GET',
 signal: AbortSignal.timeout(5000), // 5 second timeout
 })

 if (response.ok) {
        // Server is back online - reload the page
 window.location.reload()
 } else {
 throw new Error('Server not responding')
 }
 } catch (error) {
      console.error('Retry failed:', error)
 setIsRetrying(false)

      // Show error message to user
 showToast('Connection failed. Please check your internet connection.', 'error')
 }
 }

 return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
 <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6">
 {/* Icon */}
 <div className="flex justify-center">
 <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
 <WifiOff className="w-12 h-12 text-red-600" />
 </div>
 </div>

 {/* Heading */}
 <div className="space-y-2">
 <h1 className="text-2xl font-bold font-display text-gray-900">
 No Connection
 </h1>
 <p className="text-gray-600 leading-relaxed">
 The app cannot connect to the server.
 Please check your internet connection.
 </p>
 </div>

 {/* Troubleshooting Tips */}
 <div className="bg-blue-50 rounded-xl p-4 text-left space-y-2">
 <h3 className="font-semibold text-blue-900 text-sm">
 Possible solutions:
 </h3>
 <ul className="text-sm text-blue-800 space-y-1">
 <li>• Check your WiFi or mobile data connection</li>
 <li>• Make sure the server is reachable</li>
 <li>• Try again in a few minutes</li>
 </ul>
 </div>

 {/* Retry Button */}
 <Button
 onClick={handleRetry}
 disabled={isRetrying}
 className="w-full h-14 text-lg font-semibold rounded-full bg-bookcraft-blue hover:brightness-110
 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all
 active:scale-95 shadow-lg"
 >
 {isRetrying ? (
 <>
 <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
 Connecting...
 </>
 ) : (
 <>
 <RefreshCw className="w-5 h-5 mr-2" />
 Try again
 </>
 )}
 </Button>

 {/* Server URL Info (Development Mode) */}
 {process.env.NODE_ENV === 'development' && (
 <div className="text-xs text-gray-400 pt-4 border-t border-gray-200">
 Server URL: {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}
 </div>
 )}
 </div>
 </div>
 )
}
