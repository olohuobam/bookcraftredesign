import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
 "rounded-lg text-card-foreground transform-gpu transition-all duration-150 spring-smooth",
 {
 variants: {
 variant: {
 default: "bg-card border border-border shadow-sm interactive-lift",
 outline: "bg-card border border-border shadow-sm",
 glass: "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-lg hover:shadow-xl",
 premium: "bg-card border border-border shadow-lg hover:shadow-2xl hover:shadow-bookcraft-blue/10 depth-shadow interactive-lift hover:border-bookcraft-blue/20 transition-all duration-500",
 },
 },
 defaultVariants: {
 variant: "default",
 },
 }
)

const Card = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, variant, ...props }, ref) => (
 <div
 ref={ref}
 className={cn(cardVariants({ variant, className }))}
 {...props}
 />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn("flex flex-col space-y-1.5 p-6", className)}
 {...props}
 />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
 <h3
 ref={ref}
 className={cn(
 "text-title-large",
 className
 )}
 {...props}
 />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
 HTMLParagraphElement,
 React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
 <p
 ref={ref}
 className={cn("text-caption", className)}
 {...props}
 />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
 HTMLDivElement,
 React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn("flex items-center p-6 pt-0", className)}
 {...props}
 />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
