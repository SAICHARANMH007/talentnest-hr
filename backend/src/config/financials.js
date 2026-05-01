'use strict';

/**
 * Financial Configuration for TalentNest HR.
 * Any change in tax laws (GST) should be updated here.
 */
module.exports = {
  GST_PERCENTAGE: 18,
  CGST_PERCENTAGE: 9,
  SGST_PERCENTAGE: 9,
  IGST_PERCENTAGE: 18,
  BASE_STATE: (process.env.TALENTNEST_STATE || 'telangana').toLowerCase(),
  CURRENCY: 'INR',
  DEFAULT_STORAGE_LIMIT_GB: 5,
};
