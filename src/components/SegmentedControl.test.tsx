import { fireEvent, render, screen } from '@testing-library/react'
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
})
