import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
 ({ className, type, ...props }, ref) => {
 return (
 <input
 type={type}
 className={cn(
 "flex h-12 w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bookcraft-blue focus-visible:ring-offset-2 focus-visible:border-bookcraft-blue focus-visible:shadow-[0_0_0_3px_rgba(62,134,215,0.15)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-muted-foreground/50 touch-target min-h-[48px]",
 className
 )}
 ref={ref}
 {...props}
 />
 )
 }
)
Input.displayName = "Input"

export { Input }
