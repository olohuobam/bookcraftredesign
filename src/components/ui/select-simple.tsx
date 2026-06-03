import * as React from "react"
import { cn } from "@/lib/utils"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
 ({ className, children, ...props }, ref) => (
 <select
 className={cn(
 "flex h-10 w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
 className
 )}
 ref={ref}
 {...props}
 >
 {children}
 </select>
 )
)
Select.displayName = "Select"

interface TriggerProps extends React.HTMLAttributes<HTMLDivElement> {
 children: React.ReactNode
}
const SelectTrigger = ({ children, ...props }: TriggerProps) => <div {...props}>{children}</div>

const SelectValue = ({ placeholder }: { placeholder?: string }) => (
 <span className="text-muted-foreground">{placeholder}</span>
)

const SelectContent = ({ children }: { children: React.ReactNode }) => (
 <div>{children}</div>
)

interface ItemProps {
 value: string
 children: React.ReactNode
 onClick?: () => void
}
const SelectItem = ({ value, children, onClick }: ItemProps) => (
 <option value={value} onClick={onClick}>{children}</option>
)

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
