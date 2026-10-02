'use strict'

const jwt = require('jsonwebtoken')
const env = require('../config/env.js')
const { verifyToken, JWT_ISSUER, JWT_ALGORITHMS } = require('../utils/jwt.js')
const { signToken } = require('../utils/jwt.js')

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

describe('JWT sign/verify hygiene', () => {
  test('valid token verifies and exposes sub as B2B user id', () => {
    const token = signToken({ sub: USER_ID, email: 'u@test.com', role: 'BUYER' })
    const decoded = verifyToken(token)
    expect(decoded.sub).toBe(USER_ID)
    expect(decoded.iss).toBe(JWT_ISSUER)
  })

  test('expired token is rejected', () => {
    const token = jwt.sign(
      { sub: USER_ID, email: 'u@test.com', role: 'BUYER' },
      env.jwtSecret,
      { expiresIn: '-10s', issuer: JWT_ISSUER, algorithm: 'HS256' },
    )
    expect(() => verifyToken(token)).toThrow(/expired/i)
  })

  test('wrong signing secret is rejected', () => {
    const token = jwt.sign(
      { sub: USER_ID },
      'totally-different-secret-at-least-32-chars!!',
      { expiresIn: '1h', issuer: JWT_ISSUER, algorithm: 'HS256' },
    )
    expect(() => verifyToken(token)).toThrow()
  })

  test('wrong issuer is rejected', () => {
    const token = jwt.sign(
      { sub: USER_ID },
      env.jwtSecret,
      { expiresIn: '1h', issuer: 'main-portal-sso', algorithm: 'HS256' },
    )
    expect(() => verifyToken(token)).toThrow()
  })

  test('unsupported algorithm (HS384) is rejected', () => {
    const token = jwt.sign(
      { sub: USER_ID },
      env.jwtSecret,
      { expiresIn: '1h', issuer: JWT_ISSUER, algorithm: 'HS384' },
    )
    expect(() => verifyToken(token)).toThrow()
  })

  test('alg=none style token is rejected', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({ sub: USER_ID, iss: JWT_ISSUER, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url')
    const token = `${header}.${payload}.`
    expect(() => verifyToken(token)).toThrow()
  })

  test('only HS256 is accepted for verification', () => {
    expect(JWT_ALGORITHMS).toEqual(['HS256'])
  })
})
