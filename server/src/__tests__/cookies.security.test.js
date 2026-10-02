'use strict'

describe('auth cookie security options', () => {
  afterEach(() => {
    jest.resetModules()
  })

  test('production cross-site config uses httpOnly, secure, SameSite=None', () => {
    jest.doMock('../config/env.js', () => ({
      useCrossSiteCookies: true,
      nodeEnv: 'production',
      cookieMaxAge: 604_800_000,
    }))
    const { authCookieOptions, clearAuthCookieOptions } = require('../config/cookies.js')
    expect(authCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      partitioned: true,
    })
    expect(clearAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    })
  })

  test('local dev uses httpOnly and SameSite=lax', () => {
    jest.doMock('../config/env.js', () => ({
      useCrossSiteCookies: false,
      nodeEnv: 'development',
      cookieMaxAge: 604_800_000,
    }))
    const { authCookieOptions } = require('../config/cookies.js')
    expect(authCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    })
  })
})
