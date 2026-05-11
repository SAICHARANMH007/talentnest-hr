'use strict';
import { get, post, del } from '../client.js';

export const importedCandidateService = {
  /**
   * Get paginated imported candidates
   * @param {Object} params { page, limit, status, search }
   */
  getImportedCandidates: (params) => get('/imported-candidates', params),

  /**
   * Bulk import raw rows from Excel/CSV
   * @param {Array} rows Array of objects
   */
  bulkImportRaw: (rows) => post('/imported-candidates/bulk', { rows }),

  /**
   * Trigger "Deep Scan" invites for selected IDs
   * @param {Array} ids Array of ImportedCandidate document IDs
   */
  sendImportedInvites: (ids) => post('/imported-candidates/invite', { ids }),

  /**
   * Clear the entire imported database for the tenant
   */
  clearImportedDatabase: () => del('/imported-candidates'),
};
