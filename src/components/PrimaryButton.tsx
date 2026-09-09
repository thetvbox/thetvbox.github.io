import type { ButtonHTMLAttributes } from 'react'

/** Full-width accent CTA button shared by every auth/gate form. */
export default function PrimaryButton({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className={`w-full min-h-11 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition-[background-color,box-shadow,transform] duration-200 hover:bg-accent-600 hover:shadow-accent-500/40 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${className}`}
      {...props}
    />
  )
}
