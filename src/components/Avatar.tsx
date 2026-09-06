const SIZE_CLASSES = {
  xs: 'h-8 w-8 text-[11px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const

/** The circular initials avatar used anywhere a person shows up without a real profile photo. */
export default function Avatar({
  username,
  size = 'md',
}: {
  username: string
  size?: keyof typeof SIZE_CLASSES
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-500/15 font-semibold text-accent-300 ring-1 ring-accent-500/20 ${SIZE_CLASSES[size]}`}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  )
}
