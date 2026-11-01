/** Full-width text field with a leading magnifier, used by Search and People. */
export default function SearchField({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base-500"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-hairline-strong bg-base-850 py-3 pl-10 pr-4 text-base text-base-100 placeholder:text-base-500 transition-[border-color,box-shadow] duration-200 focus:border-accent-500/60 focus:ring-4 focus:ring-accent-500/10 sm:text-sm"
      />
    </div>
  )
}
