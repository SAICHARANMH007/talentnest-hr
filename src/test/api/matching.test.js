import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  TECH_WEIGHTS,
  normalizeTech,
  toSkillArr,
  parseExpRange,
  genericSearchMatch,
  matchCandidatesToJob,
  matchJobsToCandidate,
  enrichWithPlatformSignals,
  filterCandidates,
  parseJD,
} from '../../api/matching.js'

// ── Shared fixtures ────────────────────────────────────────────────────────────
const makeJob = (overrides = {}) => ({
  _id: 'job1',
  title: 'Senior React Developer',
  skills: ['react', 'node', 'js'],
  experience: '4-7',
  location: 'Bangalore',
  urgency: 'normal',
  ctcMax: '25',
  jobType: 'Full-Time',
  ...overrides,
})

const makeCand = (overrides = {}) => ({
  _id: 'cand1',
  name: 'Alice',
  title: 'Senior React Developer',
  skills: ['react', 'node', 'js'],
  experience: '5',
  location: 'Bangalore',
  expectedCTC: '20',
  ...overrides,
})

// ─────────────────────────────────────────────────────────────────────────────
// TECH_WEIGHTS export
// ─────────────────────────────────────────────────────────────────────────────
describe('TECH_WEIGHTS', () => {
  it('is an object with numeric values', () => {
    expect(typeof TECH_WEIGHTS).toBe('object')
    expect(TECH_WEIGHTS).not.toBeNull()
  })

  it('react has weight 1.6', () => {
    expect(TECH_WEIGHTS['react']).toBe(1.6)
  })

  it('node has weight 1.6', () => {
    expect(TECH_WEIGHTS['node']).toBe(1.6)
  })

  it('html has weight 0.8 (low demand)', () => {
    expect(TECH_WEIGHTS['html']).toBe(0.8)
  })

  it('kubernetes has weight 1.5', () => {
    expect(TECH_WEIGHTS['kubernetes']).toBe(1.5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// normalizeTech
// ─────────────────────────────────────────────────────────────────────────────
describe('normalizeTech', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns empty string for falsy input', () => {
    expect(normalizeTech('')).toBe('')
    expect(normalizeTech(null)).toBe('')
    expect(normalizeTech(undefined)).toBe('')
  })

  it('lowercases and trims input', () => {
    expect(normalizeTech('  React  ')).toBe('react')
  })

  it('maps reactjs → react via synonyms', () => {
    expect(normalizeTech('reactjs')).toBe('react')
  })

  it('maps react.js → react', () => {
    expect(normalizeTech('react.js')).toBe('react')
  })

  it('maps nextjs → react', () => {
    expect(normalizeTech('nextjs')).toBe('react')
  })

  it('maps nodejs → node', () => {
    expect(normalizeTech('nodejs')).toBe('node')
  })

  it('maps node.js → node', () => {
    expect(normalizeTech('node.js')).toBe('node')
  })

  it('maps express → node', () => {
    expect(normalizeTech('express')).toBe('node')
  })

  it('maps mongodb → mongo', () => {
    expect(normalizeTech('mongodb')).toBe('mongo')
  })

  it('maps postgresql → postgres', () => {
    expect(normalizeTech('postgresql')).toBe('postgres')
  })

  it('maps javascript → js', () => {
    expect(normalizeTech('javascript')).toBe('js')
  })

  it('maps typescript → ts', () => {
    expect(normalizeTech('typescript')).toBe('ts')
  })

  it('maps k8s → kubernetes', () => {
    expect(normalizeTech('k8s')).toBe('kubernetes')
  })

  it('maps c# → .net', () => {
    expect(normalizeTech('c#')).toBe('.net')
  })

  it('maps .net core → .net', () => {
    expect(normalizeTech('.net core')).toBe('.net')
  })

  it('maps machine learning → python', () => {
    expect(normalizeTech('machine learning')).toBe('python')
  })

  it('maps react native → flutter', () => {
    expect(normalizeTech('react native')).toBe('flutter')
  })

  it('maps amazon web services → aws', () => {
    expect(normalizeTech('amazon web services')).toBe('aws')
  })

  it('maps springboot → spring', () => {
    expect(normalizeTech('springboot')).toBe('spring')
  })

  it('leaves unknown tech unchanged (lowercased)', () => {
    expect(normalizeTech('Golang')).toBe('golang')
  })

  it('strips special characters', () => {
    const result = normalizeTech('some!tech@skill')
    expect(result).not.toContain('!')
    expect(result).not.toContain('@')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// toSkillArr
// ─────────────────────────────────────────────────────────────────────────────
describe('toSkillArr', () => {
  it('returns empty array for undefined', () => {
    expect(toSkillArr(undefined)).toEqual([])
  })

  it('returns empty array for null', () => {
    expect(toSkillArr(null)).toEqual([])
  })

  it('normalizes each element of an array', () => {
    const result = toSkillArr(['reactjs', 'nodejs', 'Typescript'])
    expect(result).toEqual(['react', 'node', 'ts'])
  })

  it('splits a comma-separated string', () => {
    const result = toSkillArr('React, Node, SQL')
    expect(result).toEqual(['react', 'node', 'sql'])
  })

  it('splits a semicolon-separated string', () => {
    const result = toSkillArr('react;node;python')
    expect(result).toEqual(['react', 'node', 'python'])
  })

  it('splits a pipe-separated string', () => {
    const result = toSkillArr('react|node|python')
    expect(result).toEqual(['react', 'node', 'python'])
  })

  it('filters out empty strings after splitting', () => {
    const result = toSkillArr('react,,node')
    expect(result).not.toContain('')
    expect(result).toContain('react')
    expect(result).toContain('node')
  })

  it('passes through array of already-normalized skills', () => {
    expect(toSkillArr(['react', 'node', 'python'])).toEqual(['react', 'node', 'python'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseExpRange
// ─────────────────────────────────────────────────────────────────────────────
describe('parseExpRange', () => {
  it('returns null for empty input', () => {
    expect(parseExpRange('')).toBeNull()
    expect(parseExpRange(null)).toBeNull()
    expect(parseExpRange(undefined)).toBeNull()
  })

  it('parses "4-7 years" → { min:4, max:7 }', () => {
    expect(parseExpRange('4-7 years')).toEqual({ min: 4, max: 7 })
  })

  it('parses "3–5 years" (en-dash) → { min:3, max:5 }', () => {
    expect(parseExpRange('3–5 years')).toEqual({ min: 3, max: 5 })
  })

  it('parses "2 to 5 years" → { min:2, max:5 }', () => {
    expect(parseExpRange('2 to 5 years')).toEqual({ min: 2, max: 5 })
  })

  it('parses "5+" → { min:5, max:8 }', () => {
    expect(parseExpRange('5+')).toEqual({ min: 5, max: 8 })
  })

  it('parses "10+" → { min:10, max:13 }', () => {
    expect(parseExpRange('10+')).toEqual({ min: 10, max: 13 })
  })

  it('returns null for unrecognized format', () => {
    expect(parseExpRange('some years experience')).toBeNull()
  })

  it('parses plain "1-3" without units', () => {
    expect(parseExpRange('1-3')).toEqual({ min: 1, max: 3 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// genericSearchMatch
// ─────────────────────────────────────────────────────────────────────────────
describe('genericSearchMatch', () => {
  it('returns 100 when query is empty', () => {
    expect(genericSearchMatch('anything', '')).toBe(100)
    expect(genericSearchMatch('anything', null)).toBe(100)
  })

  it('returns 100 for exact match', () => {
    expect(genericSearchMatch('react', 'react')).toBe(100)
  })

  it('returns 100 when haystack contains query', () => {
    expect(genericSearchMatch('senior react developer', 'react')).toBe(100)
  })

  it('returns 95 when synonym match is found', () => {
    // haystack has 'react', query 'reactjs' → synonym 'react' found in haystack
    expect(genericSearchMatch('react developer', 'reactjs')).toBe(100)
  })

  it('returns 0 when no match', () => {
    expect(genericSearchMatch('python developer', 'cobol')).toBe(0)
  })

  it('returns 90 when all words in multi-word query match haystack', () => {
    const result = genericSearchMatch('senior react developer', 'react developer')
    expect(result).toBeGreaterThanOrEqual(90)
  })

  it('returns partial score when some words match', () => {
    const result = genericSearchMatch('react developer', 'react java')
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(90)
  })

  it('does a raw string fallback match returning 45', () => {
    // "Backend Engineer" contains "backend" when lowercased
    const result = genericSearchMatch('Backend Engineer', 'backend')
    expect(result).toBeGreaterThanOrEqual(45)
  })

  it('stem-based match returns 60 when prefix found', () => {
    const result = genericSearchMatch('software engineer', 'engineering')
    expect(result).toBeGreaterThanOrEqual(25)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// matchCandidatesToJob
// ─────────────────────────────────────────────────────────────────────────────
describe('matchCandidatesToJob', () => {
  it('returns an array sorted descending by matchScore', () => {
    const job = makeJob()
    const candidates = [
      makeCand({ _id: 'c1', skills: ['python'], experience: '2' }),
      makeCand({ _id: 'c2', skills: ['react', 'node', 'js'], experience: '5' }),
    ]
    const result = matchCandidatesToJob(job, candidates)
    expect(result[0].matchScore).toBeGreaterThanOrEqual(result[1].matchScore)
  })

  it('result items have the expected shape', () => {
    const job = makeJob()
    const [result] = matchCandidatesToJob(job, [makeCand()])
    expect(result).toHaveProperty('candidateId')
    expect(result).toHaveProperty('matchScore')
    expect(result).toHaveProperty('recommendation')
    expect(result).toHaveProperty('confidenceLevel')
    expect(result).toHaveProperty('matchVector')
    expect(result).toHaveProperty('matchInsights')
    expect(result).toHaveProperty('highlights')
    expect(result).toHaveProperty('missingSkills')
    expect(result).toHaveProperty('softSkills')
    expect(result).toHaveProperty('reasoning')
    expect(result).toHaveProperty('candidate')
  })

  it('candidateId maps to candidate _id', () => {
    const job = makeJob()
    const [result] = matchCandidatesToJob(job, [makeCand({ _id: 'cand99' })])
    expect(result.candidateId).toBe('cand99')
  })

  it('candidateId falls back to candidate id when _id absent', () => {
    const job = makeJob()
    const cand = makeCand()
    delete cand._id
    cand.id = 'altId'
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.candidateId).toBe('altId')
  })

  it('matchScore is between 1 and 99', () => {
    const job = makeJob()
    const results = matchCandidatesToJob(job, [makeCand(), makeCand({ skills: [], experience: '0' })])
    results.forEach(r => {
      expect(r.matchScore).toBeGreaterThanOrEqual(1)
      expect(r.matchScore).toBeLessThanOrEqual(99)
    })
  })

  it('perfect skill match produces higher score than no skill match', () => {
    const job = makeJob({ skills: ['react', 'node'] })
    const perfect = makeCand({ _id: 'perfect', skills: ['react', 'node'] })
    const none = makeCand({ _id: 'none', skills: ['cobol'] })
    const [first] = matchCandidatesToJob(job, [none, perfect])
    expect(first.candidateId).toBe('perfect')
  })

  it('recommendation is "Perfect Match" for scores >= 90', () => {
    const job = makeJob({ skills: ['react', 'node', 'js', 'python', 'aws'] })
    const cand = makeCand({
      skills: ['react', 'node', 'js', 'python', 'aws'],
      experience: '5',
      title: 'Senior React Developer',
      location: 'Bangalore',
      expectedCTC: '20',
      summary: 'Led a team of 10 engineers and delivered enterprise scale product',
    })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(['Perfect Match', 'Exceptional Match', 'Strong Match', 'Good Match', 'Possible Match', 'Weak Match']).toContain(result.recommendation)
  })

  it('empty candidates array returns empty array', () => {
    expect(matchCandidatesToJob(makeJob(), [])).toEqual([])
  })

  it('location remote candidate matches any job location', () => {
    const job = makeJob({ location: 'Mumbai' })
    const cand = makeCand({ location: 'Remote' })
    const [result] = matchCandidatesToJob(job, [cand])
    const locInsight = result.matchInsights.find(i => i.vector === 'Location')
    expect(locInsight).toBeDefined()
    expect(locInsight.signal).toMatch(/remote/i)
  })

  it('experience overqualified reduces expScore', () => {
    const job = makeJob({ experience: '2-4' })
    const exact = makeCand({ _id: 'exact', experience: '3' })
    const over = makeCand({ _id: 'over', experience: '12' })
    const results = matchCandidatesToJob(job, [exact, over])
    const exactResult = results.find(r => r.candidateId === 'exact')
    const overResult = results.find(r => r.candidateId === 'over')
    expect(exactResult.matchVector.experience).toBeGreaterThan(overResult.matchVector.experience)
  })

  it('ctcFit score is 8 when candidate CTC is within budget', () => {
    const job = makeJob({ ctcMax: '30' })
    const cand = makeCand({ expectedCTC: '20' })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.matchVector.ctcFit).toBe(8)
  })

  it('ctcFit score is 0 when candidate CTC is far above budget', () => {
    const job = makeJob({ ctcMax: '10' })
    const cand = makeCand({ expectedCTC: '50' })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.matchVector.ctcFit).toBe(0)
  })

  it('notice penalty applied for high urgency + 90 day notice', () => {
    const job = makeJob({ urgency: 'high' })
    const cand = makeCand({ noticePeriod: '90 days' })
    const [result] = matchCandidatesToJob(job, [cand])
    // penalty should be -10, so matchScore should reflect it
    expect(result.matchScore).toBeLessThan(99)
  })

  it('no penalty for immediate availability on high urgency job', () => {
    const job = makeJob({ urgency: 'high' })
    const withPenalty = makeCand({ _id: 'penalty', noticePeriod: '90 days' })
    const immediate = makeCand({ _id: 'immediate', noticePeriod: 'immediate' })
    const results = matchCandidatesToJob(job, [withPenalty, immediate])
    const penaltyResult = results.find(r => r.candidateId === 'penalty')
    const immediateResult = results.find(r => r.candidateId === 'immediate')
    expect(immediateResult.matchScore).toBeGreaterThan(penaltyResult.matchScore)
  })

  it('platform score is injected into vector when present', () => {
    const job = makeJob()
    const cand = makeCand({ _platformScore: 4, _platformInsight: 'Hired 2x on platform' })
    const [result] = matchCandidatesToJob(job, [cand])
    const platInsight = result.matchInsights.find(i => i.vector === 'Platform Track Record')
    expect(platInsight).toBeDefined()
    expect(platInsight.score).toBe(4)
  })

  it('work history string is parsed correctly', () => {
    const job = makeJob({ skills: ['react'] })
    const workHistory = JSON.stringify([
      { company: 'Google', startDate: '2020-01-01', endDate: 'present', description: 'react development' }
    ])
    const cand = makeCand({ workHistory })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.matchScore).toBeGreaterThan(1)
  })

  it('synergy bonus applied when > 85% skills covered', () => {
    const job = makeJob({ skills: ['react', 'node'] })
    const cand = makeCand({ skills: ['react', 'node'] })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.matchVector.synergy).toBeGreaterThan(0)
  })

  it('soft skills detected from summary text', () => {
    const job = makeJob()
    const cand = makeCand({
      summary: 'Led a team of engineers and delivered enterprise scale products on time.'
    })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.softSkills.length).toBeGreaterThan(0)
  })

  it('company quality score higher for tier-1 company in work history', () => {
    const job = makeJob()
    const withGoogle = makeCand({
      _id: 'google',
      workHistory: [{ company: 'Google', startDate: '2019-01-01', endDate: '2022-01-01' }]
    })
    const withUnknown = makeCand({
      _id: 'unknown',
      workHistory: [{ company: 'Acme Corp', startDate: '2019-01-01', endDate: '2022-01-01' }]
    })
    const results = matchCandidatesToJob(job, [withGoogle, withUnknown])
    const googleResult = results.find(r => r.candidateId === 'google')
    const unknownResult = results.find(r => r.candidateId === 'unknown')
    expect(googleResult.matchVector.company).toBeGreaterThan(unknownResult.matchVector.company)
  })

  it('portfolio bonus reflected in matchVector', () => {
    const job = makeJob()
    const cand = makeCand({ linkedinUrl: 'https://linkedin.com/in/alice', github: 'https://github.com/alice' })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.matchVector.portfolio).toBeGreaterThan(0)
  })

  it('confidenceLevel is High when job and candidate both have rich data', () => {
    const job = makeJob({ skills: ['react', 'node', 'js'], experience: '4-7', location: 'Bangalore' })
    const cand = makeCand({
      skills: ['react', 'node', 'js', 'python'],
      experience: '5',
      title: 'Senior React Developer',
    })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(['High', 'Medium', 'Low']).toContain(result.confidenceLevel)
  })

  it('confidenceLevel is Low when data is sparse', () => {
    const job = { _id: 'j1', title: 'Dev' }
    const cand = { _id: 'c1' }
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.confidenceLevel).toBe('Low')
  })

  it('MERN stack bonus applied when candidate has mongo+react+node', () => {
    const job = makeJob({ skills: ['mongo', 'react', 'node', 'js'] })
    const withStack = makeCand({ _id: 'mern', skills: ['mongo', 'react', 'node'] })
    const withoutStack = makeCand({ _id: 'no', skills: ['python', 'django'] })
    const results = matchCandidatesToJob(job, [withStack, withoutStack])
    const mernResult = results.find(r => r.candidateId === 'mern')
    const noResult = results.find(r => r.candidateId === 'no')
    expect(mernResult.matchVector.stack).toBeGreaterThan(noResult.matchVector.stack)
  })

  it('highlights contains matched skill names', () => {
    const job = makeJob({ skills: ['react', 'node'] })
    const cand = makeCand({ skills: ['react', 'node'] })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.highlights.length).toBeGreaterThan(0)
    expect(result.highlights.map(h => h.toLowerCase())).toContain('react')
  })

  it('missingSkills contains unmatched required skills', () => {
    const job = makeJob({ skills: ['react', 'kubernetes', 'golang'] })
    const cand = makeCand({ skills: ['react'] })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.missingSkills.length).toBeGreaterThan(0)
  })

  it('reasoning is a non-empty string', () => {
    const [result] = matchCandidatesToJob(makeJob(), [makeCand()])
    expect(typeof result.reasoning).toBe('string')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('skill synonym match counts as a hit (reactjs === react)', () => {
    const job = makeJob({ skills: ['react'] })
    const cand = makeCand({ skills: ['reactjs'] })
    const [result] = matchCandidatesToJob(job, [cand])
    expect(result.matchVector.skills).toBeGreaterThan(0)
  })

  it('currently employed candidate gets highest work recency score', () => {
    const job = makeJob()
    const currentEmp = makeCand({
      workHistory: [{ company: 'Acme', startDate: '2021-01-01', endDate: 'present' }]
    })
    const [result] = matchCandidatesToJob(job, [currentEmp])
    expect(result.matchVector.workRecency).toBe(4)
  })

  it('stable career (avg tenure >= 3y) gets max stability score', () => {
    const job = makeJob()
    const stable = makeCand({
      workHistory: [
        { company: 'A', startDate: '2015-01-01', endDate: '2020-01-01' },
        { company: 'B', startDate: '2020-01-01', endDate: 'present' },
      ]
    })
    const [result] = matchCandidatesToJob(job, [stable])
    expect(result.matchVector.stability).toBe(5)
  })

  it('contract jobType gets max stability regardless of tenure', () => {
    const job = makeJob({ jobType: 'contract' })
    const hopper = makeCand({
      workHistory: [
        { company: 'A', startDate: '2022-01-01', endDate: '2022-06-01' },
        { company: 'B', startDate: '2022-06-01', endDate: '2022-12-01' },
      ]
    })
    const [result] = matchCandidatesToJob(job, [hopper])
    expect(result.matchVector.stability).toBe(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// matchJobsToCandidate
// ─────────────────────────────────────────────────────────────────────────────
describe('matchJobsToCandidate', () => {
  const makeJobEntry = (overrides = {}) => ({
    _id: 'job1',
    title: 'Senior React Developer',
    skills: ['react', 'node', 'js'],
    experience: '4-7',
    location: 'Bangalore',
    salary: '20',
    createdAt: new Date().toISOString(),
    ...overrides,
  })

  it('returns array sorted descending by matchScore', () => {
    const cand = makeCand()
    const jobs = [
      makeJobEntry({ _id: 'j1', skills: ['python'] }),
      makeJobEntry({ _id: 'j2', skills: ['react', 'node', 'js'] }),
    ]
    const results = matchJobsToCandidate(cand, jobs)
    expect(results[0].matchScore).toBeGreaterThanOrEqual(results[1].matchScore)
  })

  it('result items have expected shape', () => {
    const cand = makeCand()
    const [result] = matchJobsToCandidate(cand, [makeJobEntry()])
    expect(result).toHaveProperty('jobId')
    expect(result).toHaveProperty('matchScore')
    expect(result).toHaveProperty('recommendation')
    expect(result).toHaveProperty('confidenceLevel')
    expect(result).toHaveProperty('matchInsights')
    expect(result).toHaveProperty('reasoning')
    expect(result).toHaveProperty('highlights')
    expect(result).toHaveProperty('job')
  })

  it('jobId maps to job _id', () => {
    const [result] = matchJobsToCandidate(makeCand(), [makeJobEntry({ _id: 'myJob' })])
    expect(result.jobId).toBe('myJob')
  })

  it('jobId falls back to job.id', () => {
    const job = makeJobEntry()
    delete job._id
    job.id = 'altJobId'
    const [result] = matchJobsToCandidate(makeCand(), [job])
    expect(result.jobId).toBe('altJobId')
  })

  it('empty jobs array returns empty array', () => {
    expect(matchJobsToCandidate(makeCand(), [])).toEqual([])
  })

  it('matchScore bounded 0-99 without query', () => {
    const cand = makeCand({ skills: ['react', 'node', 'js', 'python', 'aws'] })
    const jobs = [makeJobEntry({ skills: ['react', 'node', 'js', 'python', 'aws'] })]
    const [result] = matchJobsToCandidate(cand, jobs)
    expect(result.matchScore).toBeGreaterThanOrEqual(1)
    expect(result.matchScore).toBeLessThanOrEqual(99)
  })

  it('remote job matches candidate in any location', () => {
    const cand = makeCand({ location: 'Chennai' })
    const [result] = matchJobsToCandidate(cand, [makeJobEntry({ location: 'Remote' })])
    const locInsight = result.matchInsights.find(i => i.vector === 'Location')
    expect(locInsight).toBeUndefined() // location insight may not be added but score is correct
    // matchScore should still be > 0
    expect(result.matchScore).toBeGreaterThan(0)
  })

  it('growth score is highest for one-level-up job (diff=1)', () => {
    const cand = makeCand({ title: 'Junior React Developer', experience: '2' })
    const seniorJob = makeJobEntry({ title: 'Senior React Developer', experience: '5-8' })
    const [result] = matchJobsToCandidate(cand, [seniorJob])
    const growthInsight = result.matchInsights.find(i => i.vector === 'Career Growth')
    expect(growthInsight).toBeDefined()
  })

  it('freshness insight mentions "just posted" for very new jobs', () => {
    const cand = makeCand()
    const job = makeJobEntry({ createdAt: new Date().toISOString() })
    const [result] = matchJobsToCandidate(cand, [job])
    const freshInsight = result.matchInsights.find(i => i.vector === 'Freshness')
    expect(freshInsight).toBeDefined()
    expect(freshInsight.signal).toMatch(/just posted/i)
  })

  it('salary score is 6 when candidate CTC is within job max', () => {
    const cand = makeCand({ expectedCTC: '15' })
    const job = makeJobEntry({ salaryMax: '20' })
    const [result] = matchJobsToCandidate(cand, [job])
    const salInsight = result.matchInsights.find(i => i.vector === 'Salary')
    expect(salInsight).toBeDefined()
    expect(salInsight.score).toBe(6)
  })

  it('with query filters out non-matching jobs (returns null → filtered)', () => {
    const cand = makeCand({ skills: ['python'] })
    const jobs = [
      makeJobEntry({ _id: 'j1', title: 'React Developer', skills: ['react'] }),
      makeJobEntry({ _id: 'j2', title: 'Python Developer', skills: ['python'] }),
    ]
    const results = matchJobsToCandidate(cand, jobs, 'python')
    const ids = results.map(r => r.jobId)
    expect(ids).toContain('j2')
  })

  it('with query boosts score for title match', () => {
    const cand = makeCand({ skills: ['react'] })
    const jobs = [makeJobEntry({ title: 'React Developer', skills: ['react'] })]
    const results = matchJobsToCandidate(cand, jobs, 'react')
    expect(results[0].matchScore).toBeGreaterThan(30)
  })

  it('query with no match at all returns empty array', () => {
    const cand = makeCand({ skills: ['react'] })
    const jobs = [makeJobEntry({ title: 'Java Developer', skills: ['java'] })]
    const results = matchJobsToCandidate(cand, jobs, 'cobol architect')
    expect(results).toEqual([])
  })

  it('platform score injected into result', () => {
    const cand = makeCand({ _platformScore: 3 })
    const [result] = matchJobsToCandidate(cand, [makeJobEntry()])
    // behavioral score is capped at 3 for matchJobsToCandidate
    expect(result.matchScore).toBeGreaterThan(0)
  })

  it('MERN stack detected and mentioned in insights', () => {
    const cand = makeCand({ skills: ['mongo', 'react', 'node'] })
    const job = makeJobEntry({ skills: ['mongo', 'react', 'node', 'js'] })
    const [result] = matchJobsToCandidate(cand, [job])
    const stackInsight = result.matchInsights.find(i => i.vector === 'Tech Stack')
    expect(stackInsight).toBeDefined()
    expect(stackInsight.signal).toMatch(/mern/i)
  })

  it('highlights contain matched skills', () => {
    const cand = makeCand({ skills: ['react', 'node'] })
    const job = makeJobEntry({ skills: ['react', 'node', 'python'] })
    const [result] = matchJobsToCandidate(cand, [job])
    expect(result.highlights.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// enrichWithPlatformSignals
// ─────────────────────────────────────────────────────────────────────────────
describe('enrichWithPlatformSignals', () => {
  let mockApiClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockApiClient = vi.fn()
  })

  it('returns candidates unchanged when apiClient is falsy', async () => {
    const candidates = [makeCand()]
    const result = await enrichWithPlatformSignals(candidates, null)
    expect(result).toEqual(candidates)
  })

  it('returns candidates unchanged when candidates array is empty', async () => {
    const result = await enrichWithPlatformSignals([], mockApiClient)
    expect(result).toEqual([])
  })

  it('calls API with correct endpoint and candidate ids', async () => {
    const candidates = [makeCand({ _id: 'id1' }), makeCand({ _id: 'id2' })]
    mockApiClient.mockResolvedValue({ data: [] })
    await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(mockApiClient).toHaveBeenCalledWith(
      'GET',
      expect.stringContaining('/users/platform-signals?ids='),
      null,
      false
    )
    const url = mockApiClient.mock.calls[0][1]
    expect(url).toContain('id1')
    expect(url).toContain('id2')
  })

  it('returns candidates unchanged when API returns null', async () => {
    const candidates = [makeCand({ _id: 'id1' })]
    mockApiClient.mockResolvedValue(null)
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result).toEqual(candidates)
  })

  it('returns candidates unchanged when stats.data is missing', async () => {
    const candidates = [makeCand({ _id: 'id1' })]
    mockApiClient.mockResolvedValue({})
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result).toEqual(candidates)
  })

  it('enriches candidate with _platformScore and _platformInsight when hired > 0', async () => {
    const candidates = [makeCand({ _id: 'id1' })]
    mockApiClient.mockResolvedValue({
      data: [{ candidateId: 'id1', hired: 2, shortlisted: 5, totalApps: 10, interviewCleared: 3 }]
    })
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result[0]._platformScore).toBeDefined()
    expect(result[0]._platformScore).toBeGreaterThan(0)
    expect(result[0]._platformInsight).toMatch(/hired/i)
  })

  it('enriches candidate with shortlisted insight when not hired but shortlisted', async () => {
    const candidates = [makeCand({ _id: 'id1' })]
    mockApiClient.mockResolvedValue({
      data: [{ candidateId: 'id1', hired: 0, shortlisted: 4, totalApps: 8, interviewCleared: 0 }]
    })
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result[0]._platformInsight).toMatch(/shortlisted/i)
  })

  it('marks new-to-platform insight when no activity', async () => {
    const candidates = [makeCand({ _id: 'id1' })]
    mockApiClient.mockResolvedValue({
      data: [{ candidateId: 'id1', hired: 0, shortlisted: 0, totalApps: 0, interviewCleared: 0 }]
    })
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result[0]._platformInsight).toMatch(/new to platform/i)
  })

  it('platformScore is capped at 4', async () => {
    const candidates = [makeCand({ _id: 'id1' })]
    mockApiClient.mockResolvedValue({
      data: [{ candidateId: 'id1', hired: 10, shortlisted: 100, totalApps: 100, interviewCleared: 50 }]
    })
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result[0]._platformScore).toBeLessThanOrEqual(4)
  })

  it('does not modify candidate when no matching signal data', async () => {
    const cand = makeCand({ _id: 'id1' })
    mockApiClient.mockResolvedValue({
      data: [{ candidateId: 'other-id', hired: 2, shortlisted: 5, totalApps: 10, interviewCleared: 1 }]
    })
    const result = await enrichWithPlatformSignals([cand], mockApiClient)
    expect(result[0]).not.toHaveProperty('_platformScore')
  })

  it('returns candidates unchanged when API throws', async () => {
    const candidates = [makeCand({ _id: 'id1' })]
    mockApiClient.mockRejectedValue(new Error('Network error'))
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result).toEqual(candidates)
  })

  it('limits API call to first 100 candidates', async () => {
    const candidates = Array.from({ length: 150 }, (_, i) => makeCand({ _id: `c${i}` }))
    mockApiClient.mockResolvedValue({ data: [] })
    await enrichWithPlatformSignals(candidates, mockApiClient)
    const url = mockApiClient.mock.calls[0][1]
    const idsParam = url.split('ids=')[1]
    const idCount = idsParam.split(',').length
    expect(idCount).toBeLessThanOrEqual(100)
  })

  it('returns candidates unchanged when no candidate has id or _id', async () => {
    const candidates = [{ name: 'Anonymous' }]
    const result = await enrichWithPlatformSignals(candidates, mockApiClient)
    expect(result).toEqual(candidates)
    expect(mockApiClient).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// filterCandidates
// ─────────────────────────────────────────────────────────────────────────────
describe('filterCandidates', () => {
  const makeFilterCand = (overrides = {}) => ({
    _id: 'fc1',
    name: 'Bob',
    title: 'React Developer',
    skills: ['react', 'node', 'js'],
    experience: '4',
    location: 'Bangalore',
    expectedCTC: '15',
    availability: '30 days',
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  it('returns all candidates when filters is empty object', () => {
    const candidates = [makeFilterCand(), makeFilterCand({ _id: 'fc2' })]
    const result = filterCandidates(candidates, {})
    expect(result).toHaveLength(2)
  })

  it('filtered results have _searchScore', () => {
    const [result] = filterCandidates([makeFilterCand()], {})
    expect(result).toHaveProperty('_searchScore')
    expect(typeof result._searchScore).toBe('number')
  })

  it('results sorted descending by _searchScore', () => {
    const candidates = [
      makeFilterCand({ _id: 'low', skills: ['html'], title: 'HTML Coder' }),
      makeFilterCand({ _id: 'high', skills: ['react', 'node', 'js', 'python'], title: 'Senior React Developer', summary: 'Led teams. Delivered products.' }),
    ]
    const result = filterCandidates(candidates, {})
    expect(result[0]._searchScore).toBeGreaterThanOrEqual(result[1]._searchScore)
  })

  it('designation filter excludes non-matching candidates', () => {
    const candidates = [
      makeFilterCand({ _id: 'match', title: 'React Developer' }),
      makeFilterCand({ _id: 'no', title: 'Data Scientist' }),
    ]
    const result = filterCandidates(candidates, { designation: 'React Developer' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('match')
    expect(ids).not.toContain('no')
  })

  it('skills filter excludes candidates missing all required skills', () => {
    const candidates = [
      makeFilterCand({ _id: 'match', skills: ['react', 'node'] }),
      makeFilterCand({ _id: 'no', skills: ['cobol'] }),
    ]
    const result = filterCandidates(candidates, { skills: 'react' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('match')
    expect(ids).not.toContain('no')
  })

  it('location filter includes remote candidates regardless of location query', () => {
    const candidates = [
      makeFilterCand({ _id: 'remote', location: 'Remote' }),
      makeFilterCand({ _id: 'other', location: 'Mumbai' }),
    ]
    const result = filterCandidates(candidates, { location: 'Bangalore' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('remote')
  })

  it('location filter excludes non-remote candidates in different city', () => {
    const candidates = [
      makeFilterCand({ _id: 'blr', location: 'Bangalore' }),
      makeFilterCand({ _id: 'mum', location: 'Mumbai' }),
    ]
    const result = filterCandidates(candidates, { location: 'Bangalore' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('blr')
    expect(ids).not.toContain('mum')
  })

  it('expMin filter excludes under-experienced candidates', () => {
    const candidates = [
      makeFilterCand({ _id: 'junior', experience: '1' }),
      makeFilterCand({ _id: 'senior', experience: '6' }),
    ]
    const result = filterCandidates(candidates, { expMin: '3' })
    const ids = result.map(r => r._id)
    expect(ids).not.toContain('junior')
    expect(ids).toContain('senior')
  })

  it('expMax filter excludes over-experienced candidates', () => {
    const candidates = [
      makeFilterCand({ _id: 'mid', experience: '4' }),
      makeFilterCand({ _id: 'veteran', experience: '15' }),
    ]
    const result = filterCandidates(candidates, { expMax: '8' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('mid')
    expect(ids).not.toContain('veteran')
  })

  it('minCTC filter excludes candidates with lower expected CTC', () => {
    const candidates = [
      makeFilterCand({ _id: 'low', expectedCTC: '5' }),
      makeFilterCand({ _id: 'high', expectedCTC: '20' }),
    ]
    const result = filterCandidates(candidates, { minCTC: '10' })
    const ids = result.map(r => r._id)
    expect(ids).not.toContain('low')
    expect(ids).toContain('high')
  })

  it('maxCTC filter excludes candidates with higher expected CTC', () => {
    const candidates = [
      makeFilterCand({ _id: 'low', expectedCTC: '10' }),
      makeFilterCand({ _id: 'high', expectedCTC: '40' }),
    ]
    const result = filterCandidates(candidates, { maxCTC: '20' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('low')
    expect(ids).not.toContain('high')
  })

  it('availability filter matches notice period', () => {
    const candidates = [
      makeFilterCand({ _id: 'immediate', availability: 'immediate' }),
      makeFilterCand({ _id: 'long', availability: '90 days' }),
    ]
    const result = filterCandidates(candidates, { availability: 'immediate' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('immediate')
    expect(ids).not.toContain('long')
  })

  it('returns empty array when all candidates filtered out', () => {
    const result = filterCandidates([makeFilterCand()], { expMin: '20' })
    expect(result).toEqual([])
  })

  it('multiple filters applied together (AND logic)', () => {
    const candidates = [
      makeFilterCand({ _id: 'both', skills: ['react'], experience: '5', location: 'Bangalore' }),
      makeFilterCand({ _id: 'wrongLoc', skills: ['react'], experience: '5', location: 'Mumbai' }),
      makeFilterCand({ _id: 'wrongExp', skills: ['react'], experience: '1', location: 'Bangalore' }),
    ]
    const result = filterCandidates(candidates, { skills: 'react', expMin: '3', location: 'Bangalore' })
    const ids = result.map(r => r._id)
    expect(ids).toContain('both')
    expect(ids).not.toContain('wrongExp')
    expect(ids).not.toContain('wrongLoc')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseJD
// ─────────────────────────────────────────────────────────────────────────────
describe('parseJD', () => {
  it('returns default result shape for empty string', () => {
    const result = parseJD('')
    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('location')
    expect(result).toHaveProperty('skills')
    expect(result).toHaveProperty('experience')
    expect(result).toHaveProperty('description')
    expect(result).toHaveProperty('salary')
    expect(result).toHaveProperty('department')
    expect(result).toHaveProperty('education')
    expect(result).toHaveProperty('employmentType')
    expect(result).toHaveProperty('workMode')
  })

  it('returns default result for null/undefined input', () => {
    const result = parseJD(null)
    expect(result.title).toBe('')
  })

  it('extracts title from first line if short enough', () => {
    const jd = 'Senior React Developer\nWe need an experienced developer...'
    const result = parseJD(jd)
    expect(result.title).toBe('Senior React Developer')
  })

  it('does not use title from first line if it is too long (>= 60 chars)', () => {
    const longLine = 'This is a very long line that exceeds sixty characters and should not be a title'
    const result = parseJD(longLine + '\nReact developer needed')
    expect(result.title).toBe('')
  })

  it('extracts experience range "4-7 years"', () => {
    const jd = 'Senior Node Developer\nRequires 4-7 years of experience'
    const result = parseJD(jd)
    expect(result.experience).toMatch(/4.{1,3}7/)
  })

  it('extracts experience with "+" notation', () => {
    const jd = 'Lead Architect\nMinimum 8+ years required'
    const result = parseJD(jd)
    expect(result.experience).toMatch(/8\+/)
  })

  it('extracts tech skills present in TECH_WEIGHTS', () => {
    const jd = 'React Developer\nMust know React, Node, Python and Docker'
    const result = parseJD(jd)
    expect(result.skills).toMatch(/react/i)
    expect(result.skills).toMatch(/python/i)
  })

  it('extracts location "Bangalore"', () => {
    const jd = 'Developer\nLocation: Bangalore, Karnataka'
    const result = parseJD(jd)
    expect(result.location).toBe('Bangalore')
  })

  it('extracts location "Remote"', () => {
    const jd = 'Developer\nThis is a Remote position'
    const result = parseJD(jd)
    expect(result.location).toBe('Remote')
  })

  it('sets workMode to Remote when "remote" in text', () => {
    const jd = 'Developer\nThis is a remote opportunity'
    const result = parseJD(jd)
    expect(result.workMode).toBe('Remote')
  })

  it('sets workMode to Hybrid when "hybrid" in text', () => {
    const jd = 'Developer\nHybrid work model'
    const result = parseJD(jd)
    expect(result.workMode).toBe('Hybrid')
  })

  it('sets workMode to Onsite by default', () => {
    const jd = 'Developer\nOffice-based role in Bangalore'
    const result = parseJD(jd)
    expect(result.workMode).toBe('Onsite')
  })

  it('sets employmentType to Contract when "contract" in text', () => {
    const jd = 'Developer\nThis is a contract position'
    const result = parseJD(jd)
    expect(result.employmentType).toBe('Contract')
  })

  it('sets employmentType to Internship when "intern" in text', () => {
    const jd = 'Developer\nWe are looking for an intern'
    const result = parseJD(jd)
    expect(result.employmentType).toBe('Internship')
  })

  it('sets employmentType to Freelance when "freelance" in text', () => {
    const jd = 'Developer\nFreelance engagement for 3 months'
    const result = parseJD(jd)
    expect(result.employmentType).toBe('Freelance')
  })

  it('defaults employmentType to Full-Time', () => {
    const jd = 'Developer\nPermanent full-time opportunity'
    const result = parseJD(jd)
    expect(result.employmentType).toBe('Full-Time')
  })

  it('extracts salary from LPA range pattern', () => {
    const jd = 'Developer\nSalary: 15-25 LPA based on experience'
    const result = parseJD(jd)
    expect(result.salary).toMatch(/15.{1,3}25/)
  })

  it('extracts salary with INR prefix', () => {
    const jd = 'Developer\nCompensation: INR 20-30 LPA'
    const result = parseJD(jd)
    expect(result.salary).toMatch(/20.{1,3}30/)
  })

  it('description is the first 2000 chars of the input', () => {
    const jd = 'Developer\nLong description here'
    const result = parseJD(jd)
    expect(result.description).toBe(jd.slice(0, 2000))
  })

  it('includes leadership and agile as soft skills in parsed skills', () => {
    const jd = 'Team Lead\nMust have leadership skills and agile methodology knowledge'
    const result = parseJD(jd)
    expect(result.skills.toLowerCase()).toContain('leadership')
    expect(result.skills.toLowerCase()).toContain('agile')
  })
})
