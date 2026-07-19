'use strict'

jest.mock('../config/env', () => ({
  corsAllowedOrigins: [
    'http://localhost:5173',
    'https://git-repo-gilt.vercel.app',
    'https://git-repo-*.vercel.app',
    'https://*.example.com',
  ],
  corsAllowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Cache-Control',
    'X-Requested-With',
  ],
  isDev: false,
}))

const corsOptions = require('../config/cors')

describe('CORS originValidator', () => {
  const originValidator = corsOptions.origin

  test('allows undefined/null origin (server-to-server, postman)', () => {
    const callback = jest.fn()
    originValidator(undefined, callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  test('allows localhost in development allowlist', () => {
    const callback = jest.fn()
    originValidator('http://localhost:5173', callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  test('allows production Vercel production domain', () => {
    const callback = jest.fn()
    originValidator('https://git-repo-gilt.vercel.app', callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  test('allows Vercel preview deployments via wildcard pattern', () => {
    const callback = jest.fn()
    originValidator('https://git-repo-git-main-shalini-guptas-projects.vercel.app', callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  test('allows matched wildcard client URL', () => {
    const callback = jest.fn()
    originValidator('https://sub.example.com', callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  test('rejects unknown origins without throwing (callback false, not Error)', () => {
    const callback = jest.fn()
    originValidator('https://attacker.com', callback)
    expect(callback).toHaveBeenCalledWith(null, false)
    expect(callback).not.toHaveBeenCalledWith(expect.any(Error), expect.anything())
  })

  test('rejects unrelated vercel apps not covered by allowlist wildcards', () => {
    const callback = jest.fn()
    originValidator('https://other-project.vercel.app', callback)
    expect(callback).toHaveBeenCalledWith(null, false)
  })
})
