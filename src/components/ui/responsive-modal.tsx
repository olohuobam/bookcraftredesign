'use client'

/**
 * ResponsiveModal — Bottom Sheet on Mobile, Centered Modal on Desktop
 *
 * On mobile (< sm / < 640px): slides up from bottom as a bottom sheet
 * On desktop (≥ sm / ≥ 640px): appears as a centered modal with backdrop
 *
 * Built on top of the existing <Dialog> primitive which already implements
 * this behavior. This component provides a clean, self-contained API for
 * one-off modals without needing to import every Dialog sub-part.
 *
 * Usage:
 *   <ResponsiveModal open={open} onOpenChange={setOpen} title="Title">
 *     <p>Content here</p>
 *   </ResponsiveModal>
 *
 * Or with a trigger:
 *   <ResponsiveModal trigger={<Button>Open</Button>} title="Title">
 *     <p>Content here</p>
 *   </ResponsiveModal>
 */

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface ResponsiveModalProps {
  /** Controlled open state */
  open?: boolean
  /** Called when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Optional trigger element — renders a <DialogTrigger> */
  trigger?: React.ReactNode
  /** Modal title (required for accessibility) */
  title?: React.ReactNode
  /** Optional description shown below the title */
  description?: React.ReactNode
  /** Modal body content */
  children: React.ReactNode
  /** Extra className applied to <DialogContent> */
  className?: string
  /** Hide the close (X) button */
  hideClose?: boolean
}

export function ResponsiveModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
}: ResponsiveModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn('sm:max-w-md', className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}

export default ResponsiveModal
