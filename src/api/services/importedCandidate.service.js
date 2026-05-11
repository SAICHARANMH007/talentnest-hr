'use strict';
import { req } from '../client.js';

export const importedCandidateService = {
  /**
   * Get paginated imported candidates
   * @param {Object} params { page, limit, status, search }
   */
  getImportedCandidates: (params) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    });
    return req('GET', `/imported-candidates?${q.toString()}`);
  },

  /**
   * Bulk import raw rows from Excel/CSV
   * @param {Array} rows Array of objects
   */
  bulkImportRaw: (rows) => req('POST', '/imported-candidates/bulk', { rows }),

  /**
   * Trigger "Deep Scan" invites for selected IDs
   * @param {Array} ids Array of ImportedCandidate document IDs
   */
  sendImportedInvites: (ids) => req('POST', '/imported-candidates/invite', { ids }),

  /**
   * Clear the entire imported database for the tenant
   */
  clearImportedDatabase: () => req('DELETE', '/imported-candidates'),
};
