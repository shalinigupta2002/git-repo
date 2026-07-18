import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchableDropdown } from '../components/ui/SearchableDropdown.jsx'

describe('SearchableDropdown', () => {
  const options = [
    { value: 'opt1', label: 'Option One' },
    { value: 'opt2', label: 'Option Two' },
  ]

  it('renders input with placeholder', () => {
    render(
      <SearchableDropdown
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Choose category"
      />
    )
    expect(screen.getByPlaceholderText('Choose category')).toBeInTheDocument()
  })

  it('filters options based on search query', async () => {
    const handleChange = vi.fn()
    render(
      <SearchableDropdown
        options={options}
        value=""
        onChange={handleChange}
        placeholder="Choose category"
      />
    )

    const input = screen.getByPlaceholderText('Choose category')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'One' } })

    expect(screen.getByText('Option One')).toBeInTheDocument()
    expect(screen.queryByText('Option Two')).not.toBeInTheDocument()
  })

  it('triggers onChange when option is clicked', () => {
    const handleChange = vi.fn()
    render(
      <SearchableDropdown
        options={options}
        value=""
        onChange={handleChange}
        placeholder="Choose category"
      />
    )

    const input = screen.getByPlaceholderText('Choose category')
    fireEvent.focus(input)

    const item = screen.getByText('Option Two')
    fireEvent.mouseDown(item)

    expect(handleChange).toHaveBeenCalledWith('opt2')
  })
})
