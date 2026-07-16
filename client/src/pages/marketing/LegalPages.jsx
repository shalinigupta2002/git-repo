import { Link } from 'react-router-dom'
import { HomeMarketingNav } from '../../components/common/HomeMarketingNav.jsx'
import { MarketingFooter } from '../../components/common/MarketingFooter.jsx'

const COMPANY_EMAIL = 'support@b2b-marketplace.example'
const BUSINESS_NAME = 'B2B Marketplace'

const POLICIES = {
  terms: {
    title: 'Terms and Conditions',
    updated: 'Last updated: June 2026',
    sections: [
      {
        heading: 'Use of the platform',
        body:
          'B2B Marketplace connects buyers and sellers for wholesale discovery, quotations, orders, and subscription-based access. By using the platform, you agree to provide accurate account, business, and payment information.',
      },
      {
        heading: 'Accounts and access',
        body:
          'Users may register as buyers, sellers, or administrators. You are responsible for keeping your login credentials secure and for all activity performed through your account.',
      },
      {
        heading: 'Subscriptions and payments',
        body:
          'Paid plans unlock buyer, seller, or combined access. Payments are processed securely through Razorpay. Access is activated after successful payment verification.',
      },
      {
        heading: 'Marketplace responsibility',
        body:
          'Sellers are responsible for listing accurate product details, pricing, taxes, inventory, and fulfilment terms. Buyers are responsible for reviewing product and order information before confirming a purchase.',
      },
      {
        heading: 'Contact',
        body: `For questions about these terms, contact ${COMPANY_EMAIL}.`,
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: June 2026',
    sections: [
      {
        heading: 'Information we collect',
        body:
          'We collect account details such as name, email, company name, role, order details, subscription details, and support messages needed to operate the marketplace.',
      },
      {
        heading: 'How we use information',
        body:
          'We use this information to authenticate users, process subscriptions, show dashboards, manage buyer and seller workflows, provide support, and improve the platform.',
      },
      {
        heading: 'Payments',
        body:
          'Payment information is processed by Razorpay. We do not store card numbers, UPI credentials, or banking details on our servers.',
      },
      {
        heading: 'Cookies',
        body:
          'We use secure, httpOnly cookies for authentication so users can stay signed in safely across protected pages.',
      },
      {
        heading: 'Contact',
        body: `For privacy requests or questions, contact ${COMPANY_EMAIL}.`,
      },
    ],
  },
  shipping: {
    title: 'Shipping Policy',
    updated: 'Last updated: June 2026',
    sections: [
      {
        heading: 'Marketplace fulfilment',
        body:
          'B2B Marketplace is a platform connecting buyers and sellers. Shipping, dispatch timelines, freight charges, and delivery terms are provided by the seller for each transaction.',
      },
      {
        heading: 'Delivery timelines',
        body:
          'Delivery timelines may vary depending on product availability, order quantity, buyer location, and seller fulfilment capacity.',
      },
      {
        heading: 'Shipping charges',
        body:
          'Any applicable shipping, handling, freight, or logistics charges should be reviewed and confirmed before completing an order.',
      },
      {
        heading: 'Support',
        body: `For shipping-related help, contact ${COMPANY_EMAIL} with your order details.`,
      },
    ],
  },
  refunds: {
    title: 'Cancellation and Refunds',
    updated: 'Last updated: June 2026',
    sections: [
      {
        heading: 'Subscription cancellations',
        body:
          'Subscription purchases provide access to buyer, seller, or combined platform features. Once access is activated, subscription fees are generally non-refundable unless required by law or approved by support after review.',
      },
      {
        heading: 'Order cancellations',
        body:
          'Order cancellation eligibility depends on seller confirmation, fulfilment status, and the commercial terms agreed between buyer and seller.',
      },
      {
        heading: 'Refund review',
        body:
          'Approved refunds, if any, will be processed to the original payment method through the payment gateway according to bank and Razorpay timelines.',
      },
      {
        heading: 'Contact',
        body: `To request cancellation or refund support, contact ${COMPANY_EMAIL}.`,
      },
    ],
  },
}

function LegalPage({ type }) {
  const policy = POLICIES[type] || POLICIES.terms

  return (
    <div className="subPage legalPage">
      <HomeMarketingNav tagline={policy.title} />

      <main className="subMain legalMain">
        <article className="legalCard">
          <p className="subEyebrow">{BUSINESS_NAME}</p>
          <h1 className="subHero__title legalTitle">{policy.title}</h1>
          <p className="legalUpdated">{policy.updated}</p>

          <div className="legalSections">
            {policy.sections.map((section) => (
              <section key={section.heading} className="legalSection">
                <h2>{section.heading}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>

          <p className="legalBack">
            <Link to="/contact">Contact us</Link>
            {' · '}
            <Link to="/">Back to home</Link>
          </p>
        </article>
      </main>

      <MarketingFooter />
    </div>
  )
}

export function TermsPage() {
  return <LegalPage type="terms" />
}

export function PrivacyPolicyPage() {
  return <LegalPage type="privacy" />
}

export function ShippingPolicyPage() {
  return <LegalPage type="shipping" />
}

export function CancellationRefundsPage() {
  return <LegalPage type="refunds" />
}
