"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ContextMenuContextType {
 isOpen: boolean
 position: { x: number; y: number }
 open: (e: React.MouseEvent) => void
 close: () => void
}

const ContextMenuContext = React.createContext<ContextMenuContextType | undefined>(undefined)

const useContextMenu = () => {
 const context = React.useContext(ContextMenuContext)
 if (!context) {
 throw new Error("useContextMenu must be used within a ContextMenu")
 }
 return context
}

interface ContextMenuProps {
 children: React.ReactNode
}

const ContextMenu = ({ children }: ContextMenuProps) => {
 const [isOpen, setIsOpen] = React.useState(false)
 const [position, setPosition] = React.useState({ x: 0, y: 0 })

 const open = React.useCallback((e: React.MouseEvent) => {
 e.preventDefault()
 e.stopPropagation()

    // Calculate position with viewport bounds
 const x = Math.min(e.clientX, window.innerWidth - 200)
 const y = Math.min(e.clientY, window.innerHeight - 250)

 setPosition({ x, y })
 setIsOpen(true)
 }, [])

 const close = React.useCallback(() => {
 setIsOpen(false)
 }, [])

  // Close on click outside
 React.useEffect(() => {
 if (isOpen) {
 const handleClickOutside = () => close()
 const handleEscape = (e: KeyboardEvent) => {
 if (e.key === "Escape") close()
 }

 document.addEventListener("click", handleClickOutside)
 document.addEventListener("keydown", handleEscape)

 return () => {
 document.removeEventListener("click", handleClickOutside)
 document.removeEventListener("keydown", handleEscape)
 }
 }
 }, [isOpen, close])

 return (
 <ContextMenuContext.Provider value={{ isOpen, position, open, close }}>
 {children}
 </ContextMenuContext.Provider>
 )
}

interface ContextMenuTriggerProps {
 children: React.ReactNode
 className?: string
}

const ContextMenuTrigger = ({ children, className }: ContextMenuTriggerProps) => {
 const { open } = useContextMenu()

 return (
 <div onContextMenu={open} className={className}>
 {children}
 </div>
 )
}

interface ContextMenuContentProps {
 children: React.ReactNode
 className?: string
}

const ContextMenuContent = ({ children, className }: ContextMenuContentProps) => {
 const { isOpen, position } = useContextMenu()

 if (!isOpen) return null

 return (
 <div
 className={cn(
 "fixed z-[100] min-w-[180px] overflow-hidden rounded-xl",
 "bg-popover/95 backdrop-blur-xl shadow-2xl",
 "border border-border/50",
 "animate-in fade-in-0 zoom-in-95 duration-150",
 "p-1.5",
 className
 )}
 style={{
 left: position.x,
 top: position.y,
 }}
 onClick={(e) => e.stopPropagation()}
 >
 {children}
 </div>
 )
}

interface ContextMenuItemProps {
 children: React.ReactNode
 onClick?: () => void
 className?: string
 variant?: "default" | "danger"
 disabled?: boolean
 icon?: React.ReactNode
}

const ContextMenuItem = ({
 children,
 onClick,
 className,
 variant = "default",
 disabled = false,
 icon,
}: ContextMenuItemProps) => {
 const { close } = useContextMenu()

 const handleClick = () => {
 if (!disabled) {
 onClick?.()
 close()
 }
 }

 return (
 <button
 className={cn(
 "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg",
 "transition-all duration-150 ease-out",
 "text-left font-medium",
 variant === "default" && [
 "text-foreground hover:bg-accent/80",
 "active:bg-accent active:scale-[0.98]",
 ],
 variant === "danger" && [
 "text-destructive hover:bg-destructive/10",
 "active:bg-destructive/20 active:scale-[0.98]",
 ],
 disabled && "opacity-50 pointer-events-none",
 className
 )}
 onClick={handleClick}
 disabled={disabled}
 >
 {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
 {children}
 </button>
 )
}

const ContextMenuSeparator = ({ className }: { className?: string }) => (
 <div className={cn("h-px bg-border/80 my-1.5 mx-2", className)} />
)

export {
 ContextMenu,
 ContextMenuTrigger,
 ContextMenuContent,
 ContextMenuItem,
 ContextMenuSeparator,
 useContextMenu,
}
