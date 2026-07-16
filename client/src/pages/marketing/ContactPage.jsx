import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { HomeMarketingNav } from '../../components/common/HomeMarketingNav.jsx'

const schema = Yup.object({
  name: Yup.string().trim().min(2, 'Enter your name').max(120).required('Name is required'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  topic: Yup.string().oneOf(['Sales', 'Support', 'Partnership', 'Other']).required('Topic is required'),
  message: Yup.string().trim().min(10, 'Tell us a bit more').max(3000).required('Message is required'),
})

export function ContactPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', email: '', topic: 'Support', message: '' },
    mode: 'onBlur',
  })

  const onSubmit = async () => {
    toast.success('Message sent (demo)')
    reset()
  }

  return (
    <div className="subPage subPage--help subPage--helpFit">
      <HomeMarketingNav tagline="Help & contact" />

      <main className="subMain helpMain">
        <header className="helpHero">
          <h1 className="subHero__title helpHero__title">Help &amp; Contact</h1>
        </header>

        <section className="helpGrid helpGrid--contact" aria-label="Help and contact options">
          <article className="helpCard helpCard--primary">
            <h2 className="helpCard__title">Send a message</h2>
            <p className="helpCard__body">
              Tell us what you need and we’ll route it to the right team.
            </p>

            <form className="form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <label className="field">
                <div className="fieldLabel">Name</div>
                <input
                  placeholder="Your name"
                  className={`input ${errors.name ? 'input--error' : ''}`}
                  aria-invalid={Boolean(errors.name)}
                  {...register('name')}
                />
                {errors.name ? <div className="fieldError">{errors.name.message}</div> : null}
              </label>

              <label className="field">
                <div className="fieldLabel">Email</div>
                <input
                  type="email"
                  placeholder="you@company.com"
                  className={`input ${errors.email ? 'input--error' : ''}`}
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
                {errors.email ? <div className="fieldError">{errors.email.message}</div> : null}
              </label>

              <label className="field">
                <div className="fieldLabel">Topic</div>
                <select
                  className="select"
                  aria-invalid={Boolean(errors.topic)}
                  {...register('topic')}
                >
                  <option value="Support">Support</option>
                  <option value="Sales">Sales</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Other">Other</option>
                </select>
                {errors.topic ? <div className="fieldError">{errors.topic.message}</div> : null}
              </label>

              <label className="field">
                <div className="fieldLabel">Message</div>
                <textarea
                  rows={6}
                  placeholder="Tell us what you need…"
                  className={`textarea ${errors.message ? 'input--error' : ''}`}
                  aria-invalid={Boolean(errors.message)}
                  {...register('message')}
                />
                {errors.message ? (
                  <div className="fieldError">{errors.message.message}</div>
                ) : null}
              </label>

              <div className="helpCard__actions">
                <button className="btn btn--primary helpCard__btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          </article>

          <aside className="helpCard helpCard--buyers">
            <h2 className="helpCard__title">Contact channels</h2>
            <p className="helpCard__body">Prefer email? Here are the default contact points.</p>
            <ul className="helpCard__list">
              <li>
                <span className="helpCard__label">Support</span>
                <span className="helpCard__value">support@b2b-marketplace.example</span>
              </li>
              <li>
                <span className="helpCard__label">Sales</span>
                <span className="helpCard__value">sales@b2b-marketplace.example</span>
              </li>
              <li>
                <span className="helpCard__label">Response time</span>
                <span className="helpCard__value">Within 1 business day</span>
              </li>
            </ul>
            <p className="helpCard__foot">
              Pricing questions? See{' '}
              <Link to="/pricing" className="helpLink">
                plans &amp; pricing
              </Link>
              .
            </p>
          </aside>
        </section>
      </main>
    </div>
  )
}
