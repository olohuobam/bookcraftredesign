import { cn } from "@/lib/utils"

function Skeleton({
 className,
 ...props
}: React.HTMLAttributes<HTMLDivElement>) {
 return (
 <div
 className={cn("animate-pulse rounded-md bg-[#3E86D7]/10", className)}
 {...props}
 />
 )
}

export { Skeleton }
