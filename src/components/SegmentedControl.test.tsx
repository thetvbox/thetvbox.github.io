import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import SegmentedControl from './SegmentedControl'

const OPTIONS = [
  { value: 'following', label: 'Following' },
  { value: 'everyone', label: 'Everyone' },
] as const

describe('SegmentedControl', () => {
  it('renders a labeled radiogroup with one radio per option', () => {
    render(<SegmentedControl options={OPTIONS} value="following" onChange={vi.fn()} label="Scope" />)
    expect(screen.getByRole('radiogroup', { name: 'Scope' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Following' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Everyone' })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the clicked option value', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="following" onChange={onChange} label="Scope" />)
    fireEvent.click(screen.getByRole('radio', { name: 'Everyone' }))
    expect(onChange).toHaveBeenCalledWith('everyone')
  })

  it('still calls onChange when clicking the already-active option', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="following" onChange={onChange} label="Scope" />)
    fireEvent.click(screen.getByRole('radio', { name: 'Following' }))
    expect(onChange).toHaveBeenCalledWith('following')
  })

  it('supports more than two options', () => {
    const three = [...OPTIONS, { value: 'mine', label: 'Just me' }] as const
    render(<SegmentedControl options={three} value="mine" onChange={vi.fn()} label="Scope" />)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Just me' })).toHaveAttribute('aria-checked', 'true')
  })

  it('only puts the active option in the tab sequence (roving tabindex)', () => {
    render(<SegmentedControl options={OPTIONS} value="following" onChange={vi.fn()} label="Scope" />)
    expect(screen.getByRole('radio', { name: 'Following' })).toHaveAttribute('tabIndex', '0')
    expect(screen.getByRole('radio', { name: 'Everyone' })).toHaveAttribute('tabIndex', '-1')
  })

  it('selects and focuses the next option on ArrowRight, wrapping past the end', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="everyone" onChange={onChange} label="Scope" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Everyone' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('following')
  })

  it('selects and focuses the previous option on ArrowLeft, wrapping before the start', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="following" onChange={onChange} label="Scope" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Following' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('everyone')
  })

  it('jumps to the first option on Home and the last option on End', () => {
    const three = [...OPTIONS, { value: 'mine', label: 'Just me' }] as const
    const onChange = vi.fn()
    render(<SegmentedControl options={three} value="everyone" onChange={onChange} label="Scope" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Everyone' }), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('mine')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Everyone' }), { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('following')
  })

  it('moves focus to the newly active option after an arrow key', () => {
    function Controlled() {
      const [value, setValue] = useState<'following' | 'everyone'>('following')
      return <SegmentedControl options={OPTIONS} value={value} onChange={setValue} label="Scope" />
    }
    render(<Controlled />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Following' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Everyone' })).toHaveFocus()
  })

  it('ignores unrelated keys', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="following" onChange={onChange} label="Scope" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Following' }), { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })
})
