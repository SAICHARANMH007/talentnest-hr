import { req } from '../client.js';

export const faceService = {
  getFaceStatus: ()             => req('GET',  '/face/status'),
  enrollFace:    (body)         => req('POST', '/face/enroll',  body),
  uploadPhoto:   (body)         => req('POST', '/face/photo',   body),
  verifyFace:    (body)         => req('POST', '/face/verify',  body),
  deleteFace:    ()             => req('DELETE','/face/enroll'),
  proctorCheck:  (body)         => req('POST', '/face/proctor-check', body),

  // Admin
  getDuplicateAlerts: (status)  => req('GET',  `/face/admin/duplicates${status ? `?status=${status}` : ''}`),
  getDuplicateCount:  ()        => req('GET',  '/face/admin/duplicates/count'),
  reviewDuplicateAlert: (id, body) => req('PATCH', `/face/admin/duplicates/${id}`, body),
};
