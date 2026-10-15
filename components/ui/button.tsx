import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-50',
  { variants: { variant: { default: 'bg-[#b8f36d] text-[#142018] hover:bg-[#cdf8a0]', outline: 'border border-[#7b857e] bg-[#151a17] text-white hover:bg-[#303b33]' } }, defaultVariants: { variant: 'default' } },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} className={cn(buttonVariants({ variant, className }))} {...props} />
})
Button.displayName = 'Button'
