import { motion } from 'framer-motion'
import { GLASS_SPRING_SNAPPY } from '../lib/motion'

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

/** iOS-style segmented control -- a glass track with a sliding pill behind the active option, for an exclusive choice between a few options. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`glass-surface inline-flex items-center gap-0.5 rounded-full p-1 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              active ? 'text-accent-300' : 'text-base-400 hover:text-base-200'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${label}`}
                className="absolute inset-0 rounded-full bg-accent-500/15 ring-1 ring-accent-500/40"
                transition={GLASS_SPRING_SNAPPY}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
