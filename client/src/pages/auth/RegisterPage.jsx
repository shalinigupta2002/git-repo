import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BrandLogo } from '../../components/common/BrandLogo.jsx'
import { register as registerUser } from '../../store/slices/authSlice.js'
import { useAppDispatch } from '../../hooks/redux.js'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { roleDashboardPath } from '../../utils/portalNav.js'

const schema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: Yup.string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Za-z]/, 'Include at least one letter')
    .matches(/\d/, 'Include at least one number')
    .required('Password is required'),
  companyName: Yup.string().trim().max(255).optional(),
  role: Yup.mixed().oneOf(['BUYER', 'SELLER']).required('Choose a role'),
})

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      companyName: '',
      role: 'BUYER',
    },
    mode: 'onBlur',
  })

  const role = useWatch({ control, name: 'role' })

  const onSubmit = async (values) => {
    setApiError('')
    const action = await dispatch(
      registerUser({
        email: values.email,
        password: values.password,
        role: values.role,
        companyName: values.companyName || undefined,
      }),
    )
    if (registerUser.rejected.match(action)) {
      const msg = action.payload || 'Registration failed'
      setApiError(msg)
      toast.error(msg)
      return
    }
    const user = action.payload
    toast.success('Account created')
    navigate(roleDashboardPath(user?.role), { replace: true })
  }

  return (
    <div className="authPage">
      <div className="authCard authCard--elevated">
        <Link to="/" className="authBrand" aria-label="Home">
          <BrandLogo size="lg" />
        </Link>
        <div className="authHeader">
          <h1 className="authTitle">Create account</h1>
          <p className="authSub">Register as a buyer or seller. Admin accounts are provisioned separately.</p>
        </div>

        <form className="form form--tight" noValidate onSubmit={handleSubmit(onSubmit)}>
          <fieldset className="field">
            <div className="fieldLabel">I am registering as</div>
            <div className="rolePick">
              <label className={`rolePick__opt ${role === 'BUYER' ? 'rolePick__opt--on' : ''}`}>
                <input
                  type="radio"
                  value="BUYER"
                  checked={role === 'BUYER'}
                  onChange={() => setValue('role', 'BUYER', { shouldValidate: true })}
                />
                Buyer
              </label>
              <label className={`rolePick__opt ${role === 'SELLER' ? 'rolePick__opt--on' : ''}`}>
                <input
                  type="radio"
                  value="SELLER"
                  checked={role === 'SELLER'}
                  onChange={() => setValue('role', 'SELLER', { shouldValidate: true })}
                />
                Seller
              </label>
            </div>
            {errors.role ? <div className="fieldError">{errors.role.message}</div> : null}
          </fieldset>

          <label className="field">
            <div className="fieldLabel">Company (optional)</div>
            <input
              className={`input ${errors.companyName ? 'input--error' : ''}`}
              placeholder="Acme Industries Pvt Ltd"
              aria-invalid={Boolean(errors.companyName)}
              {...register('companyName')}
            />
            {errors.companyName ? (
              <div className="fieldError">{errors.companyName.message}</div>
            ) : null}
          </label>

          <label className="field">
            <div className="fieldLabel">Email</div>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className={`input ${errors.email ? 'input--error' : ''}`}
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email ? <div className="fieldError">{errors.email.message}</div> : null}
          </label>

          <label className="field">
            <div className="fieldLabel">Password</div>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={`input ${errors.password ? 'input--error' : ''}`}
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password ? <div className="fieldError">{errors.password.message}</div> : null}
          </label>

          {apiError ? (
            <div className="fieldError" style={{ marginBottom: 4 }}>{apiError}</div>
          ) : null}

          <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" /> Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>

          <p className="authFooterText">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
