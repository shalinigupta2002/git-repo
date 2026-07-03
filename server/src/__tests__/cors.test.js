'use strict'

jest.mock('../config/env', () => ({
  clientUrls: [
    'http://localhost:5173',
    'https://*.example.com',
    'https://b2-b-marketplace-r6sp8lrkt-shalini-guptas-projects-ccd2dc4c.vercel.app'
  ],
  isDev: false
}))

const corsOptions = require('../config/cors')

describe('CORS originValidator', () => {
  const originValidator = corsOptions.origin

  test('allows undefined/null origin (server-to-server, postman)', () => {
    const callback = jest.fn()
    originValidator(undefined, callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  test('allows exactly configured client URL', () => {
    const callback = jest.fn()
    originValidator('http://localhost:5173', callback)
    expect(callback).toHaveBeenCalledWith(null, true)
  })

  test('allows matched wildcard client URL', () => {
    const callback = jest.fn()
    originValidator('https://sub.example.com', callback)
    expect(callback).toHaveBeenCalledWith(null, true)
    
    const callback2 = jest.fn()
    originValidator('https://another-sub.example.com', callback2)
    expect(callback2).toHaveBeenCalledWith(null, true)
  })

  test('allows project Vercel preview domain automatically', () => {
    const callback = jest.fn()
    originValidator('https://b2-b-marketplace-r6sp8lrkt-shalini-guptas-projects-ccd2dc4c.vercel.app', callback)
    expect(callback).toHaveBeenCalledWith(null, true)

    const callback2 = jest.fn()
    originValidator('https://b2-b-marketplace-anybranch-shalini-guptas-projects-ccd2dc4c.vercel.app', callback2)
    expect(callback2).toHaveBeenCalledWith(null, true)

    const callback3 = jest.fn()
    originValidator('https://b2-b-marketplace.vercel.app', callback3)
    expect(callback3).toHaveBeenCalledWith(null, true)
  })

  test('rejects arbitrary attacker domains beginning with b2-b-marketplace-', () => {
    const callback = jest.fn()
    originValidator('https://b2-b-marketplace-attacker.vercel.app', callback)
    expect(callback).toHaveBeenCalledWith(expect.any(Error))
  })

  test('rejects attacker domains targeting the same vercel project scope', () => {
    const callback = jest.fn()
    originValidator('https://attacker-shalini-guptas-projects-ccd2dc4c.vercel.app', callback)
    expect(callback).toHaveBeenCalledWith(expect.any(Error))
  })

  test('rejects unrecognized origins', () => {
    const callback = jest.fn()
    originValidator('https://attacker.com', callback)
    expect(callback).toHaveBeenCalledWith(expect.any(Error))
  })
})
