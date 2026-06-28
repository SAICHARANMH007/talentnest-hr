import { describe, it, expect, beforeEach } from 'vitest'
import { logAudit, getAuditLog } from '../../utils/audit.js'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('logAudit', () => {
  it('writes an entry to localStorage', () => {
    logAudit('Login', 'Auth', 'user signed in')
    const log = JSON.parse(localStorage.getItem('tn_audit_log'))
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ action: 'Login', resource: 'Auth', detail: 'user signed in', level: 'info' })
  })

  it('prepends new entries so the latest is first', () => {
    logAudit('A', 'R', 'first')
    logAudit('B', 'R', 'second')
    const log = JSON.parse(localStorage.getItem('tn_audit_log'))
    expect(log[0].action).toBe('B')
    expect(log[1].action).toBe('A')
  })

  it('caps log at 100 entries', () => {
    for (let i = 0; i < 110; i++) logAudit('Action', 'Resource', `detail-${i}`)
    const log = JSON.parse(localStorage.getItem('tn_audit_log'))
    expect(log).toHaveLength(100)
  })

  it('uses userOverride when provided', () => {
    logAudit('Test', 'X', 'detail', 'warn', { name: 'Alice', role: 'admin' })
    const log = JSON.parse(localStorage.getItem('tn_audit_log'))
    expect(log[0].user).toBe('Alice')
    expect(log[0].role).toBe('admin')
    expect(log[0].level).toBe('warn')
  })

  it('falls back to Unknown/unknown when no user in storage', () => {
    logAudit('Action', 'Resource', 'detail')
    const log = JSON.parse(localStorage.getItem('tn_audit_log'))
    expect(log[0].user).toBe('Unknown')
    expect(log[0].role).toBe('unknown')
  })

  it('reads user name from sessionStorage', () => {
    sessionStorage.setItem('tn_user', JSON.stringify({ name: 'Bob', role: 'recruiter' }))
    logAudit('View', 'Job', 'opened JD')
    const log = JSON.parse(localStorage.getItem('tn_audit_log'))
    expect(log[0].user).toBe('Bob')
    expect(log[0].role).toBe('recruiter')
  })

  it('each entry has a unique id and ISO timestamp', () => {
    logAudit('A', 'B', 'C')
    logAudit('D', 'E', 'F')
    const log = JSON.parse(localStorage.getItem('tn_audit_log'))
    expect(log[0].id).toBeTruthy()
    expect(log[1].id).toBeTruthy()
    expect(log[0].id).not.toBe(log[1].id)
    expect(() => new Date(log[0].time)).not.toThrow()
  })

  it('silently handles corrupt localStorage (no throw)', () => {
    localStorage.setItem('tn_audit_log', 'INVALID_JSON')
    expect(() => logAudit('A', 'B', 'C')).not.toThrow()
  })
})

describe('getAuditLog', () => {
  it('returns empty array when storage is empty', () => {
    expect(getAuditLog()).toEqual([])
  })

  it('returns entries up to the requested limit', () => {
    for (let i = 0; i < 30; i++) logAudit('A', 'B', `${i}`)
    const log = getAuditLog(10)
    expect(log).toHaveLength(10)
  })

  it('defaults to 20 entries', () => {
    for (let i = 0; i < 25; i++) logAudit('A', 'B', `${i}`)
    expect(getAuditLog()).toHaveLength(20)
  })

  it('returns all entries when count is less than limit', () => {
    logAudit('A', 'B', '1')
    logAudit('C', 'D', '2')
    expect(getAuditLog(50)).toHaveLength(2)
  })

  it('silently returns [] when localStorage contains invalid JSON', () => {
    localStorage.setItem('tn_audit_log', '{{bad}}')
    expect(getAuditLog()).toEqual([])
  })
})
