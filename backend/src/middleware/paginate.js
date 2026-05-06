'use strict';

const getPagination = (req, defaults = {}) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const maxLimit = req.user?.role === 'super_admin' ? 10000 : 2000;
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit) || defaults.limit || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const paginatedResponse = (data, total, limit, page) => {
  const pages = Math.ceil(total / limit);
  return {
    success: true, data,
    pagination: { page, limit, total, pages,
      hasNext: page < pages, hasPrev: page > 1,
      nextPage: page < pages ? page + 1 : null,
      prevPage: page > 1    ? page - 1 : null }
  };
};

module.exports = { getPagination, paginatedResponse };
