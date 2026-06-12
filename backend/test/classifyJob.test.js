import { describe, it, expect } from 'vitest';
import { classifyJob } from '../src/utils/classifyJob.js';

describe('classifyJob', () => {
  it('classifies a backend engineering role', () => {
    const { department } = classifyJob('Senior Backend Developer (Node.js)', 'Build and maintain REST APIs using Node.js and Express.');
    expect(department).toBeTruthy();
  });

  it('classifies a DevOps/SRE role', () => {
    const { department } = classifyJob('DevOps Engineer', 'Manage CI/CD pipelines and cloud infrastructure.');
    expect(department).toBe('DevOps & Site Reliability');
  });

  it('classifies a security role', () => {
    const { department } = classifyJob('Security Engineer', 'Perform penetration testing and vulnerability assessments.');
    expect(department).toBe('Security');
  });

  it('classifies a data/ML role', () => {
    const { department } = classifyJob('Machine Learning Engineer', 'Build ML models and MLOps pipelines.');
    expect(department).toBe('Data & Analytics');
  });

  it('returns empty strings for unrecognizable input rather than throwing', () => {
    const result = classifyJob('', '');
    expect(result).toHaveProperty('industry');
    expect(result).toHaveProperty('department');
    expect(typeof result.industry).toBe('string');
    expect(typeof result.department).toBe('string');
  });

  it('does not throw on missing arguments', () => {
    expect(() => classifyJob()).not.toThrow();
  });
});
