import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactCard } from '../components/deals/ContactCard.jsx'

const lockedDeal = {
  contactUnlockStatus: 'LOCKED',
}

const unlockedDeal = {
  contactUnlockStatus: 'UNLOCKED',
}

const counterparty = {
  portalUserId: 'USR-DEMO-000002',
  addresses: [{ city: 'Mumbai', line1: '123 Market Road', phone: '9999999999' }],
  companyName: 'Seller Co',
  email: 'seller@test.com',
  gst: 'GST123',
}

describe('ContactCard', () => {
  it('shows only portal user id and city when locked', () => {
    render(<ContactCard deal={lockedDeal} counterparty={counterparty} title="Seller contact" />)

    expect(screen.getByText('USR-DEMO-000002')).toBeInTheDocument()
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
    expect(screen.queryByText('Seller Co')).not.toBeInTheDocument()
    expect(screen.queryByText('seller@test.com')).not.toBeInTheDocument()
  })

  it('shows full profile when unlocked', () => {
    render(<ContactCard deal={unlockedDeal} counterparty={counterparty} title="Seller contact" />)

    expect(screen.getByText('Seller Co')).toBeInTheDocument()
    expect(screen.getByText('seller@test.com')).toBeInTheDocument()
    expect(screen.getByText('GST123')).toBeInTheDocument()
  })
})

describe('PaymentCard', () => {
  it('opens confirmation dialog and calls onPay', async () => {
    const user = userEvent.setup()
    const onPay = vi.fn().mockResolvedValue(undefined)
    const { PaymentCard } = await import('../components/deals/PaymentCard.jsx')

    render(
      <PaymentCard
        deal={{ ...lockedDeal, status: 'PAYMENT_PENDING' }}
        viewerRole="BUYER"
        payment={{ paymentStatus: 'PENDING', amount: '90', currency: 'INR', paymentReference: 'DPAY-1' }}
        chargeAmount="90"
        onPay={onPay}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Pay Platform Charge' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))
    expect(onPay).toHaveBeenCalledTimes(1)
  })
})
