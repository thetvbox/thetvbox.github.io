import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SearchField from './SearchField'

describe('SearchField', () => {
  it('shows the value, labels the field with its placeholder, and reports typing', () => {
    const onChange = vi.fn()
    render(<SearchField value="lup" onChange={onChange} placeholder="Search for a TV show…" />)
    const input = screen.getByRole('textbox', { name: 'Search for a TV show…' })
    expect(input).toHaveValue('lup')
    fireEvent.change(input, { target: { value: 'lupin' } })
    expect(onChange).toHaveBeenCalledWith('lupin')
  })
})
