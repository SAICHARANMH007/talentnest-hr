import { req } from '../client.js';

export const faceService = {
  getFaceStatus: ()             => req('GET',  '/face/status'),
  enrollFace:    (body)         => req('POST', '/face/enroll',  body),
  uploadPhoto:   (body)         => req('POST', '/face/photo',   body),
  verifyFace:    (body)         => req('POST', '/face/verify',  body),
  removePhoto:   ()             => req('DELETE','/face/photo'),
  deleteFace:    ()             => req('DELETE','/face/enroll'),
  proctorCheck:  (body)         => req('POST', '/face/proctor-check', body),

  // Public — no auth token needed (user is not logged in yet)
  identifyFace:     (body)  => req('POST', '/face/identify',       body, false),
  faceLogin:        (body)  => req('POST', '/face/login',          body, false),
  checkEnrollment:  (body)  => req('POST', '/face/check-enrolled', body, false),
  sendFaceOtp:      (body)  => req('POST', '/face/send-otp',       body, false),
  verifyFaceOtp:    (body)  => req('POST', '/face/verify-otp',     body, false),

  // Admin
  getDuplicateAlerts:   (status) => req('GET',   `/face/admin/duplicates${status ? `?status=${status}` : ''}`),
  getDuplicateCount:    ()       => req('GET',   '/face/admin/duplicates/count'),
  getDuplicateStats:    ()       => req('GET',   '/face/admin/duplicates/stats'),
  reviewDuplicateAlert: (id, body) => req('PATCH', `/face/admin/duplicates/${id}`, body),

  // Public — no auth
  getEdgeCaseHint: (issue) => req('POST', '/face/edge-case-hint', { issue }, false),
};
