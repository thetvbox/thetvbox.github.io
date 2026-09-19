import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useGoBack } from './useGoBack'

function CurrentPath() {
  return <span>at:{useLocation().pathname}</span>
}

function BackButton({ fallback }: { fallback: string }) {
  const goBack = useGoBack(fallback)
  return (
    <>
      <button type="button" onClick={goBack}>
        Back
      </button>
      <CurrentPath />
    </>
  )
}

describe('useGoBack', () => {
  it('goes to the previous entry when there is in-app history', () => {
    render(
      <MemoryRouter initialEntries={['/a', '/b']} initialIndex={1}>
        <Routes>
          <Route path="/a" element={<CurrentPath />} />
          <Route path="/b" element={<BackButton fallback="/fallback" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('at:/b')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('at:/a')).toBeInTheDocument()
  })

  it('goes to the fallback when this is the first screen in the session', () => {
    render(
      <MemoryRouter initialEntries={['/b']}>
        <Routes>
          <Route path="/fallback" element={<CurrentPath />} />
          <Route path="/b" element={<BackButton fallback="/fallback" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('at:/b')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('at:/fallback')).toBeInTheDocument()
  })
})
