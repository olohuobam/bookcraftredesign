import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
 ({ className, ...props }, ref) => {
 return (
 <textarea
 className={cn(
 "flex min-h-[120px] md:min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bookcraft-blue focus-visible:ring-offset-2 focus-visible:border-bookcraft-blue focus-visible:shadow-[0_0_0_3px_rgba(62,134,215,0.15)] transition-all duration-200 hover:border-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50",
 className
 )}
 ref={ref}
 {...props}
 />
 )
 }
)
Textarea.displayName = "Textarea"

export { Textarea }
