import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
 "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bookcraft-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 btn-press transform-gpu ripple overflow-hidden spring-smooth active:scale-95 touch-target",
 {
 variants: {
 variant: {
 default: "bg-gradient-to-r from-bookcraft-blue to-bookcraft-blue text-white shadow-md hover:shadow-lg hover:shadow-bookcraft-blue/25 hover:brightness-110",
 destructive:
 "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
 outline:
 "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-bookcraft-blue/50",
 secondary:
 "bg-secondary text-secondary-foreground hover:bg-secondary/80",
 ghost: "hover:bg-accent hover:text-accent-foreground",
 link: "text-bookcraft-blue underline-offset-4 hover:underline",
 ios: "btn-ios btn-ios-primary",
 "ios-secondary": "btn-ios btn-ios-secondary",
 "ios-tertiary": "btn-ios btn-ios-tertiary",
 "ios-destructive": "btn-ios btn-ios-destructive",
 pill: "btn-pill rounded-full",
 },
 size: {
 default: "h-12 px-6 py-3 min-w-[48px] min-h-[48px]",
 sm: "h-11 rounded-xl px-4 min-w-[44px] min-h-[44px]",
 lg: "h-14 rounded-2xl px-8 text-base min-w-[48px] min-h-[48px]",
 xl: "h-16 rounded-3xl px-10 text-lg min-w-[56px] min-h-[56px]",
 icon: "h-12 w-12 min-w-[48px] min-h-[48px]",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 }
)

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, asChild = false, ...props }, ref) => {
 const Comp = asChild ? Slot : "button"
 return (
 <Comp
 className={cn(buttonVariants({ variant, size, className }))}
 ref={ref}
 {...props}
 />
 )
 }
)
Button.displayName = "Button"

export { Button, buttonVariants }
