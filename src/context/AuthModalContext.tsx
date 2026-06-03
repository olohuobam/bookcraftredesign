'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AuthModalContextType {
 isRegisterRequested: boolean
 requestAuthModal: () => void
 clearAuthModalRequest: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
 const [isRegisterRequested, setIsRegisterRequested] = useState(false)

 const requestAuthModal = useCallback(() => {
 setIsRegisterRequested(true)
 }, [])

 const clearAuthModalRequest = useCallback(() => {
 setIsRegisterRequested(false)
 }, [])

 return (
 <AuthModalContext.Provider value={{ isRegisterRequested, requestAuthModal, clearAuthModalRequest }}>
 {children}
 </AuthModalContext.Provider>
 )
}

export function useAuthModal() {
 const context = useContext(AuthModalContext)
 if (context === undefined) {
 throw new Error('useAuthModal must be used within an AuthModalProvider')
 }
 return context
}
