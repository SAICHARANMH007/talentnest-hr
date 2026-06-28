import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import useSEO from '../../hooks/useSEO.js'

describe('useSEO', () => {
  beforeEach(() => {
    // Reset document title and clear any <head> elements we might have added
    document.title = ''
    document.head.innerHTML = ''
  })

  it('sets document.title when title provided', () => {
    renderHook(() => useSEO({ title: 'Jobs | TalentNest' }))
    expect(document.title).toBe('Jobs | TalentNest')
  })

  it('does not change document.title when title omitted', () => {
    document.title = 'Previous Title'
    renderHook(() => useSEO({ description: 'Some page' }))
    expect(document.title).toBe('Previous Title')
  })

  it('creates meta[name="description"] with provided description', () => {
    renderHook(() => useSEO({ title: 'T', description: 'My page description' }))
    const meta = document.querySelector('meta[name="description"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('My page description')
  })

  it('creates og:description meta tag', () => {
    renderHook(() => useSEO({ description: 'OG desc' }))
    const meta = document.querySelector('meta[property="og:description"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('OG desc')
  })

  it('creates twitter:description meta tag', () => {
    renderHook(() => useSEO({ description: 'TW desc' }))
    const meta = document.querySelector('meta[name="twitter:description"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('TW desc')
  })

  it('creates meta[name="keywords"] when provided', () => {
    renderHook(() => useSEO({ keywords: 'jobs, hiring, talent' }))
    const meta = document.querySelector('meta[name="keywords"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('jobs, hiring, talent')
  })

  it('does not create keywords meta when omitted', () => {
    renderHook(() => useSEO({ title: 'T' }))
    expect(document.querySelector('meta[name="keywords"]')).toBeNull()
  })

  it('sets robots meta to index, follow', () => {
    renderHook(() => useSEO({ title: 'T' }))
    const meta = document.querySelector('meta[name="robots"]')
    expect(meta).not.toBeNull()
    expect(meta.getAttribute('content')).toBe('index, follow')
  })

  it('sets canonical link href', () => {
    renderHook(() => useSEO({ path: '/jobs' }))
    const link = document.querySelector('link[rel="canonical"]')
    expect(link).not.toBeNull()
    expect(link.href).toContain('/jobs')
  })

  it('reuses existing canonical link rather than creating a duplicate', () => {
    renderHook(() => useSEO({ path: '/a' }))
    renderHook(() => useSEO({ path: '/b' }))
    const links = document.querySelectorAll('link[rel="canonical"]')
    expect(links.length).toBe(1)
  })

  it('sets og:title and twitter:title when title provided', () => {
    renderHook(() => useSEO({ title: 'My Title' }))
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('My Title')
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('My Title')
  })

  it('injects JSON-LD script tag when schema provided', () => {
    const schema = { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Home' }
    renderHook(() => useSEO({ schema }))
    const script = document.getElementById('tn-page-ld')
    expect(script).not.toBeNull()
    expect(script.type).toBe('application/ld+json')
    expect(JSON.parse(script.textContent)).toEqual(schema)
  })

  it('removes JSON-LD script tag when schema is omitted', () => {
    // First mount with schema
    const { rerender } = renderHook(({ schema }) => useSEO({ schema }), {
      initialProps: { schema: { '@type': 'WebPage' } },
    })
    expect(document.getElementById('tn-page-ld')).not.toBeNull()
    // Rerender without schema → script should be removed
    rerender({ schema: undefined })
    expect(document.getElementById('tn-page-ld')).toBeNull()
  })

  it('removes JSON-LD script on unmount', () => {
    const schema = { '@type': 'Organization' }
    const { unmount } = renderHook(() => useSEO({ schema }))
    expect(document.getElementById('tn-page-ld')).not.toBeNull()
    unmount()
    expect(document.getElementById('tn-page-ld')).toBeNull()
  })

  it('sets og:url using BASE_URL + path', () => {
    renderHook(() => useSEO({ path: '/careers' }))
    const og = document.querySelector('meta[property="og:url"]')
    expect(og?.getAttribute('content')).toContain('/careers')
  })

  it('sets twitter:card to summary_large_image', () => {
    renderHook(() => useSEO({}))
    const meta = document.querySelector('meta[name="twitter:card"]')
    expect(meta?.getAttribute('content')).toBe('summary_large_image')
  })
})
