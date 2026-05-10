'use strict';
/**
 * getPagination — no artificial caps for a live job board.
 * Callers set their own limit. Roles only govern the hard ceiling.
 * super_admin  → up to 50,000 per request (exports, crawlers, reports)
 * admin/recruiter → up to 10,000 per request
 * candidate/public → up to 5,000 per request
 */
const getPagination = (req, defaults = {}) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const role = req.user?.role;
  
  // Enterprise Hard Ceilings
  let maxLimit = 500; // Default for public/candidates
  if (role === 'super_admin') maxLimit = 50000;
  else if (role === 'admin' || role === 'recruiter') maxLimit = 10000;

  const requestedLimit = parseInt(req.query.limit) || defaults.limit || 50;
  const limit = Math.min(maxLimit, Math.max(1, requestedLimit));
  
  return { page, limit, skip: (page - 1) * limit };
};

const paginatedResponse = (data, total, limit, page) => {
  const pages = Math.ceil(total / limit);
  return {
    success: true, data,
    pagination: {
      page, limit, total, pages,
      hasNext:  page < pages,
      hasPrev:  page > 1,
      nextPage: page < pages ? page + 1 : null,
      prevPage: page > 1    ? page - 1 : null,
    },
  };
};

module.exports = { getPagination, paginatedResponse };
