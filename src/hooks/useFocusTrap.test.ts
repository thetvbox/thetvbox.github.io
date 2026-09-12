import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

afterEach(() => {
  document.body.innerHTML = ''
})

function buildContainer(buttonCount: number) {
  const container = document.createElement('div')
  for (let i = 0; i < buttonCount; i++) {
    const button = document.createElement('button')
    button.textContent = `Button ${i}`
    container.appendChild(button)
  }
  document.body.appendChild(container)
  return container
}

function tab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
  document.dispatchEvent(event)
  return event
}

describe('useFocusTrap', () => {
  it('does nothing while inactive', () => {
    const container = buildContainer(2)
    const last = container.children[1] as HTMLElement
    last.focus()
    renderHook(() => useFocusTrap(false, { current: container }))
    tab()
    expect(document.activeElement).toBe(last)
  })

  it('wraps Tab from the last focusable element back to the first', () => {
    const container = buildContainer(3)
    const first = container.children[0] as HTMLElement
    const last = container.children[2] as HTMLElement
    last.focus()

    renderHook(() => useFocusTrap(true, { current: container }))
    const event = tab()

    expect(document.activeElement).toBe(first)
    expect(event.defaultPrevented).toBe(true)
  })

  it('wraps Shift+Tab from the first focusable element back to the last', () => {
    const container = buildContainer(3)
    const first = container.children[0] as HTMLElement
    const last = container.children[2] as HTMLElement
    first.focus()

    renderHook(() => useFocusTrap(true, { current: container }))
    const event = tab(true)

    expect(document.activeElement).toBe(last)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not interfere with Tab between elements in the middle of the container', () => {
    const container = buildContainer(3)
    const middle = container.children[1] as HTMLElement
    middle.focus()

    renderHook(() => useFocusTrap(true, { current: container }))
    const event = tab()

    // Browsers handle the actual focus move for non-boundary tabs; this hook only intervenes
    // at the first/last element, so it should leave the event alone here.
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores non-Tab keys', () => {
    const container = buildContainer(2)
    const last = container.children[1] as HTMLElement
    last.focus()

    renderHook(() => useFocusTrap(true, { current: container }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(document.activeElement).toBe(last)
  })

  it('does nothing when the container has no focusable elements', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    renderHook(() => useFocusTrap(true, { current: container }))
    const event = tab()

    expect(event.defaultPrevented).toBe(false)
  })

  it('removes its keydown listener on unmount', () => {
    const container = buildContainer(2)
    const last = container.children[1] as HTMLElement
    last.focus()

    const { unmount } = renderHook(() => useFocusTrap(true, { current: container }))
    unmount()
    tab()

    // No listener left to wrap focus back to the first element.
    expect(document.activeElement).toBe(last)
  })
})
