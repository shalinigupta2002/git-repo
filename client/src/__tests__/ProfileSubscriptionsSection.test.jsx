import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileSubscriptionsSection } from '../components/profile/ProfileSubscriptionsSection.jsx'

describe('ProfileSubscriptionsSection', () => {
  it('renders only buyer card when seller subscription is absent', () => {
    render(
      <ProfileSubscriptionsSection
        subscriptions={{
          buyer: {
            plan: { display: 'BUYER LIFETIME' },
            status: { display: 'ACTIVE' },
            startDate: { display: '1 Jan 2026' },
            expiryDate: { display: 'Lifetime' },
          },
          seller: null,
        }}
      />,
    )

    expect(screen.getByText('Buyer subscription')).toBeInTheDocument()
    expect(screen.queryByText('Seller subscription')).not.toBeInTheDocument()
    expect(screen.getByText('BUYER LIFETIME')).toBeInTheDocument()
  })

  it('renders both cards when both subscriptions exist', () => {
    render(
      <ProfileSubscriptionsSection
        subscriptions={{
          buyer: {
            plan: { display: 'BUYER LIFETIME' },
            status: { display: 'ACTIVE' },
            startDate: { display: '1 Jan 2026' },
            expiryDate: { display: 'Lifetime' },
          },
          seller: {
            plan: { display: 'SELLER LIFETIME' },
            status: { display: 'ACTIVE' },
            startDate: { display: '2 Jan 2026' },
            expiryDate: { display: 'Lifetime' },
          },
        }}
      />,
    )

    expect(screen.getByText('Buyer subscription')).toBeInTheDocument()
    expect(screen.getByText('Seller subscription')).toBeInTheDocument()
  })
})
