/**
 * TalentNest HR - API Gateway (Enterprise Modular Architecture)
 * 
 * This file acts as a 'Barrel Export' that combines specialized services into 
 * a single, easy-to-use 'api' object. This pattern ensures high-level 
 * industry standards while maintaining zero-breakage for existing components.
 */

import { set401Handler as _set401, initAuth as _initAuth, downloadBlob as _downloadBlob, getToken as _getToken, setToken as _setToken, tokenIsValid as _tokenIsValid, clearToken as _clearToken, clearCache as _clearCache } from './client.js';
import { authService } from './services/auth.service.js';
import { userService } from './services/user.service.js';
import { jobService } from './services/job.service.js';
import { applicationService } from './services/application.service.js';
import { dashboardService } from './services/dashboard.service.js';
import { platformService } from './services/platform.service.js';
import { blogService }      from './services/blog.service.js';
import { videoRoomService } from './services/videoRoom.service.js';
import { callService }      from './services/call.service.js';
import { importedCandidateService } from './services/importedCandidate.service.js';

// Re-export the 401 handler and auth initializer for global app subscription
export const set401Handler = _set401;
export const initAuth = _initAuth;
export const downloadBlob = _downloadBlob;
export const setToken = _setToken;
export const clearToken = _clearToken;
export const tokenIsValid = _tokenIsValid;
export const clearCache = _clearCache;

// The unified API object
export const api = {
  getToken: _getToken,
  clearCache: _clearCache,
  ...authService,
  ...userService,
  ...jobService,
  ...applicationService,
  ...dashboardService,
  ...platformService,
  ...blogService,
  ...videoRoomService,
  ...callService,
  ...importedCandidateService,
};

// Default export for convenience
export default api;
