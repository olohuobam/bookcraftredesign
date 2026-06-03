"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropdownContextType {
 isOpen: boolean
 setIsOpen: (open: boolean) => void
}

const DropdownContext = React.createContext<DropdownContextType | undefined>(undefined)

const useDropdown = () => {
 const context = React.useContext(DropdownContext)
 if (!context) {
 throw new Error("useDropdown must be used within a DropdownMenu")
 }
 return context
}

const DropdownMenu = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & {
 open?: boolean
 onOpenChange?: (open: boolean) => void
 }
>(({ className, children, open: controlledOpen, onOpenChange, ...props }, _ref) => {
 const [internalOpen, setInternalOpen] = React.useState(false)
 const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Use controlled state if provided, otherwise use internal state
 const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
 const setIsOpen = React.useCallback((open: boolean) => {
 if (controlledOpen !== undefined) {
 onOpenChange?.(open)
 } else {
 setInternalOpen(open)
 }
 }, [controlledOpen, onOpenChange])

  // Close dropdown when clicking outside
 React.useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
 setIsOpen(false)
 }
 }

 if (isOpen) {
 document.addEventListener('mousedown', handleClickOutside)
 }

 return () => {
 document.removeEventListener('mousedown', handleClickOutside)
 }
 }, [isOpen])

 return (
 <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
 <div
 ref={dropdownRef}
 className={cn("relative inline-block text-left", className)}
 {...props}
 >
 {children}
 </div>
 </DropdownContext.Provider>
 )
})
DropdownMenu.displayName = "DropdownMenu"

const DropdownMenuTrigger = React.forwardRef<
 HTMLButtonElement,
 React.ButtonHTMLAttributes<HTMLButtonElement> & {
 asChild?: boolean
 }
>(({ className, children, asChild = false, onClick, ...props }, ref) => {
 const { isOpen, setIsOpen } = useDropdown()

 const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
 setIsOpen(!isOpen)
 onClick?.(e)
 }

 if (asChild) {
 const child = React.Children.only(children) as React.ReactElement<any>
 return React.cloneElement(child, {
 ...child.props,
 onClick: (e: React.MouseEvent) => {
 if (child.props?.onClick) {
 child.props.onClick(e)
 }
 handleClick(e as React.MouseEvent<HTMLButtonElement>)
 }
 })
 }

 return (
 <button
 ref={ref}
 className={cn(
 "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
 "border border-border bg-background text-foreground",
 "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
 className
 )}
 onClick={handleClick}
 {...props}
 >
 {children}
 <ChevronDown className="ml-2 h-4 w-4" />
 </button>
 )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & {
 align?: "start" | "center" | "end"
 }
>(({ className, align = "end", ...props }, ref) => {
 const { isOpen } = useDropdown()

 if (!isOpen) return null

 return (
 <div
 ref={ref}
 className={cn(
 "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-md",
 "animate-in fade-in-0 zoom-in-95",
 align === "end" && "right-0",
 align === "center" && "left-1/2 -translate-x-1/2",
 align === "start" && "left-0",
 className
 )}
 {...props}
 />
 )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & {
 disabled?: boolean
 asChild?: boolean
 }
>(({ className, disabled, asChild = false, children, onClick, ...props }, ref) => {
 const { setIsOpen } = useDropdown()

 const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
 if (!disabled) {
 onClick?.(e)
 setIsOpen(false)
 }
 }

 if (asChild) {
 const child = React.Children.only(children) as React.ReactElement<any>
 return React.cloneElement(child, {
 ...child.props,
 className: cn(
 "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
 "transition-colors hover:bg-accent focus:bg-accent",
 disabled && "pointer-events-none opacity-50",
 child.props?.className
 ),
 onClick: (e: React.MouseEvent) => {
 if (child.props?.onClick) {
 child.props.onClick(e)
 }
 handleClick(e as React.MouseEvent<HTMLDivElement>)
 }
 })
 }

 return (
 <div
 ref={ref}
 className={cn(
 "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
 "transition-colors hover:bg-accent focus:bg-accent",
 disabled && "pointer-events-none opacity-50",
 className
 )}
 onClick={handleClick}
 {...props}
 >
 {children}
 </div>
 )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuSeparator = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn("-mx-1 my-1 h-px bg-border", className)}
 {...props}
 />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
}