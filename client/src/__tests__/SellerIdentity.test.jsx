import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SellerIdentity } from '../components/common/SellerIdentity.jsx'

describe('SellerIdentity', () => {
  it('renders seller id and city only', () => {
    render(
      <SellerIdentity
        seller={{ id: 'seller-uuid-123', city: 'Mumbai' }}
      />,
    )

    expect(screen.getByText('Seller ID')).toBeInTheDocument()
    expect(screen.getByText('seller-uuid-123')).toBeInTheDocument()
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
  })

  it('compact mode shows id and city labels', () => {
    render(
      <SellerIdentity
        seller={{ id: 'abc', city: 'Delhi' }}
        compact
        showLabel
      />,
    )

    expect(screen.getByText(/Seller ID:/)).toBeInTheDocument()
    expect(screen.getByText(/City:/)).toBeInTheDocument()
    expect(screen.getByText('Delhi')).toBeInTheDocument()
  })
})
