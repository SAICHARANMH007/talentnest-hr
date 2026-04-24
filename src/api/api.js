/**
 * TalentNest HR - API Gateway (Enterprise Modular Architecture)
 * 
 * This file acts as a 'Barrel Export' that combines specialized services into 
 * a single, easy-to-use 'api' object. This pattern ensures high-level 
 * industry standards while maintaining zero-breakage for existing components.
 */

import { set401Handler as _set401, initAuth as _initAuth, downloadBlob as _downloadBlob, getToken as _getToken, setToken as _setToken } from './client.js';
import { authService } from './services/auth.service.js';
import { userService } from './services/user.service.js';
import { jobService } from './services/job.service.js';
import { applicationService } from './services/application.service.js';
import { dashboardService } from './services/dashboard.service.js';
import { platformService } from './services/platform.service.js';
import { blogService }     from './services/blog.service.js';

// Re-export the 401 handler and auth initializer for global app subscription
export const set401Handler = _set401;
export const initAuth = _initAuth;
export const downloadBlob = _downloadBlob;
export const setToken = _setToken;

// The unified API object
export const api = {
  getToken: _getToken,
  ...authService,
  ...userService,
  ...jobService,
  ...applicationService,
  ...dashboardService,
  ...platformService,
  ...blogService,
};

// Default export for convenience
export default api;
