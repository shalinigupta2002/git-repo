import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SellerIdentity } from '../components/common/SellerIdentity.jsx'

describe('SellerIdentity', () => {
  it('renders portal user id and city only', () => {
    render(
      <SellerIdentity
        seller={{ portalUserId: 'USR-DEMO-000001', city: 'Mumbai' }}
      />,
    )

    expect(screen.getByText('User ID')).toBeInTheDocument()
    expect(screen.getByText('USR-DEMO-000001')).toBeInTheDocument()
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
  })

  it('compact mode shows id and city labels', () => {
    render(
      <SellerIdentity
        seller={{ portalUserId: 'USR-DEMO-000002', city: 'Delhi' }}
        compact
        showLabel
      />,
    )

    expect(screen.getByText(/User ID:/)).toBeInTheDocument()
    expect(screen.getByText(/City:/)).toBeInTheDocument()
    expect(screen.getByText('Delhi')).toBeInTheDocument()
    expect(screen.getByText('USR-DEMO-000002')).toBeInTheDocument()
  })
})
