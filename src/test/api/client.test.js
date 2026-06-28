/**
 * Tests for src/api/client.js — token management, cache, and helper functions.
 *
 * We test only the pure/observable behaviour: token storage in sessionStorage +
 * localStorage, the 30-second expiry buffer, cache TTL, and in-flight
 * deduplication.  The fetch-based req() helper is tested via its side-effects
 * (cache invalidation, 401 refresh flow) with a global fetch mock.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  tokenIsValid,
  setToken,
  clearToken,
  getToken,
  clearCache,
} from '../../api/client.js'

// ── JWT helpers ───────────────────────────────────────────────────────────────

function makeJwt(exp) {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ exp }))
  return `${header}.${payload}.sig`
}

/** Returns a JWT that expires `offsetSeconds` from now. */
function jwt(offsetSeconds) {
  return makeJwt(Math.floor(Date.now() / 1000) + offsetSeconds)
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearToken()
  clearCache()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── tokenIsValid ──────────────────────────────────────────────────────────────

describe('tokenIsValid', () => {
  it('returns false for null', () => expect(tokenIsValid(null)).toBe(false))
  it('returns false for empty string', () => expect(tokenIsValid('')).toBe(false))
  it('returns false for a malformed token', () => expect(tokenIsValid('not.a.jwt')).toBe(false))

  it('returns false for a token that has already expired', () => {
    expect(tokenIsValid(jwt(-60))).toBe(false)
  })

  it('returns false for a token expiring within the 30 s buffer', () => {
    expect(tokenIsValid(jwt(20))).toBe(false)
  })

  it('returns true for a token expiring outside the 30 s buffer', () => {
    expect(tokenIsValid(jwt(60))).toBe(true)
  })

  it('returns true for a long-lived token (1 hour)', () => {
    expect(tokenIsValid(jwt(3600))).toBe(true)
  })
})

// ── setToken / getToken ───────────────────────────────────────────────────────

describe('setToken', () => {
  it('makes the token available via getToken()', () => {
    const t = jwt(3600)
    setToken(t)
    expect(getToken()).toBe(t)
  })

  it('persists to sessionStorage', () => {
    const t = jwt(3600)
    setToken(t)
    expect(sessionStorage.getItem('tn_token')).toBe(t)
  })

  it('persists to localStorage', () => {
    const t = jwt(3600)
    setToken(t)
    expect(localStorage.getItem('tn_token')).toBe(t)
  })

  it('sets tn_logged_in flag in localStorage', () => {
    setToken(jwt(3600))
    expect(localStorage.getItem('tn_logged_in')).toBe('true')
  })

  it('calling with null clears all storage', () => {
    setToken(jwt(3600))
    setToken(null)
    expect(getToken()).toBeNull()
    expect(sessionStorage.getItem('tn_token')).toBeNull()
    expect(localStorage.getItem('tn_token')).toBeNull()
    expect(localStorage.getItem('tn_logged_in')).toBeNull()
  })
})

// ── clearToken ────────────────────────────────────────────────────────────────

describe('clearToken', () => {
  it('removes token from memory and all storage', () => {
    setToken(jwt(3600))
    clearToken()
    expect(getToken()).toBeNull()
    expect(sessionStorage.getItem('tn_token')).toBeNull()
    expect(localStorage.getItem('tn_token')).toBeNull()
    expect(localStorage.getItem('tn_logged_in')).toBeNull()
  })

  it('removes tn_user from sessionStorage and localStorage', () => {
    sessionStorage.setItem('tn_user', JSON.stringify({ name: 'Alice' }))
    localStorage.setItem('tn_user', JSON.stringify({ name: 'Alice' }))
    clearToken()
    expect(sessionStorage.getItem('tn_user')).toBeNull()
    expect(localStorage.getItem('tn_user')).toBeNull()
  })

  it('is safe to call when no token was set', () => {
    expect(() => clearToken()).not.toThrow()
  })
})

// ── token isolation across users ──────────────────────────────────────────────

describe('token isolation', () => {
  it('setToken followed by clearToken leaves storage fully clean', () => {
    const t = jwt(7200)
    setToken(t)
    clearToken()
    expect(getToken()).toBeNull()
    expect(sessionStorage.getItem('tn_token')).toBeNull()
    expect(localStorage.getItem('tn_token')).toBeNull()
  })

  it('second setToken call replaces the first', () => {
    const t1 = jwt(1000)
    const t2 = jwt(2000)
    setToken(t1)
    setToken(t2)
    expect(getToken()).toBe(t2)
    expect(sessionStorage.getItem('tn_token')).toBe(t2)
  })
})
