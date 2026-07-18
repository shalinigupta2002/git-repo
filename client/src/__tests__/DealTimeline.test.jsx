import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DealTimeline } from '../components/deals/DealTimeline.jsx'

describe('DealTimeline', () => {
  it('renders events from backend in chronological order', () => {
    render(
      <DealTimeline
        events={[
          {
            id: '2',
            eventType: 'PAYMENT_SUCCESS',
            payload: { payerRole: 'BUYER' },
            createdAt: '2026-07-02T10:00:00.000Z',
          },
          {
            id: '1',
            eventType: 'DEAL_CREATED',
            createdAt: '2026-07-01T10:00:00.000Z',
          },
          {
            id: '3',
            eventType: 'CONTACT_UNLOCKED',
            createdAt: '2026-07-03T10:00:00.000Z',
          },
        ]}
      />,
    )

    expect(screen.getByText('Deal created')).toBeInTheDocument()
    expect(screen.getByText('Buyer paid')).toBeInTheDocument()
    expect(screen.getByText('Contact unlocked')).toBeInTheDocument()

    const titles = screen.getAllByText(/Deal created|Buyer paid|Contact unlocked/)
    expect(titles[0]).toHaveTextContent('Deal created')
    expect(titles[1]).toHaveTextContent('Buyer paid')
    expect(titles[2]).toHaveTextContent('Contact unlocked')
  })

  it('shows empty state when no events exist', () => {
    render(<DealTimeline events={[]} />)
    expect(screen.getByText('No timeline events yet.')).toBeInTheDocument()
  })
})
