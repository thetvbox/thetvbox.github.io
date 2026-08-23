import type { ReactNode } from 'react'

/** Shared "nothing here yet" card shell -- icon + bordered panel -- reused for every empty state in the app. */
export default function EmptyState({
  icon,
  className = 'mt-10',
  children,
}: {
  icon: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-hairline bg-base-850/40 px-6 py-14 text-center ${className}`}
    >
      <div className="mb-3 text-4xl">{icon}</div>
      {children}
    </div>
  )
}
