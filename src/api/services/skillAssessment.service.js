import { req } from '../client.js';

export const skillAssessmentService = {
  // Skills list
  async getAvailableSkills()                    { return req('GET', '/skill-assessments/skills'); },

  // Candidate attempt flow
  async startSkillAttempt(skill)                { return req('POST', '/skill-assessments/attempt/start', { skill }); },
  async submitSkillAttempt(attemptId, answers)  { return req('POST', `/skill-assessments/attempt/${attemptId}/submit`, { answers }); },
  async getActiveSkillAttempt(skill)            { return req('GET', `/skill-assessments/attempt/active/${encodeURIComponent(skill)}`); },
  async getMySkillResults()                     { return req('GET', '/skill-assessments/my-results'); },

  // Admin — question bank
  async getSkillQuestions(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return req('GET', `/skill-assessments/admin/questions${qs ? `?${qs}` : ''}`);
  },
  async createSkillQuestion(data)               { return req('POST',   '/skill-assessments/admin/questions', data); },
  async updateSkillQuestion(id, data)           { return req('PATCH',  `/skill-assessments/admin/questions/${id}`, data); },
  async deleteSkillQuestion(id)                 { return req('DELETE', `/skill-assessments/admin/questions/${id}`); },
  async bulkImportSkillQuestions(questions)     { return req('POST',   '/skill-assessments/admin/questions/bulk', { questions }); },

  // Admin — attempts
  async getSkillAttempts(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return req('GET', `/skill-assessments/admin/attempts${qs ? `?${qs}` : ''}`);
  },
};
