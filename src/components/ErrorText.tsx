/** Inline error copy, announced to screen readers immediately via role="alert". */
export default function ErrorText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`text-danger ${className}`}>
      {children}
    </p>
  )
}
