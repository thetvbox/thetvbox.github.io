import { Fragment, createElement, forwardRef } from 'react'
import type { ComponentType, ReactNode } from 'react'

const MOTION_ONLY_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'layout',
  'layoutId',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'variants',
  'onAnimationComplete',
  'onAnimationStart',
])

function stripMotionProps(props: Record<string, unknown>) {
  const rest: Record<string, unknown> = {}
  for (const key in props) {
    if (!MOTION_ONLY_PROPS.has(key)) rest[key] = props[key]
  }
  return rest
}

const tagComponentCache = new Map<string, ComponentType<Record<string, unknown>>>()

/** Test double for framer-motion: renders plain elements/children with no animation delay. */
export const motion = new Proxy(
  {},
  {
    get: (_target, tag: string) => {
      const cached = tagComponentCache.get(tag)
      if (cached) return cached
      const component = forwardRef<unknown, Record<string, unknown>>((props, ref) =>
        createElement(tag, { ...stripMotionProps(props), ref }),
      ) as unknown as ComponentType<Record<string, unknown>>
      tagComponentCache.set(tag, component)
      return component
    },
  },
) as Record<string, ComponentType<Record<string, unknown>>>

export function AnimatePresence({ children }: { children?: ReactNode }) {
  return createElement(Fragment, null, children)
}
