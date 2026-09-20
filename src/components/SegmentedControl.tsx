import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { GLASS_SPRING_SNAPPY } from '../lib/motion'
import HapticOverlay from './HapticOverlay'

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
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  /** Selects (and focuses) the option at `index`, wrapping around the ends -- the native radiogroup keyboard pattern. */
  function selectAt(index: number) {
    const wrapped = (index + options.length) % options.length
    const option = options[wrapped]
    if (!option) return
    onChange(option.value)
    buttonRefs.current[wrapped]?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        selectAt(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        selectAt(index - 1)
        break
      case 'Home':
        e.preventDefault()
        selectAt(0)
        break
      case 'End':
        e.preventDefault()
        selectAt(options.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`glass-surface inline-flex items-center gap-0.5 rounded-full p-1 ${className}`}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              active ? 'text-accent-300' : 'text-base-400 hover:text-base-200'
            }`}
          >
            <HapticOverlay />
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
