'use strict';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 500;
const EXPORT_LIMIT  = 10_000; // hard cap for admin export endpoints

/**
 * Parse page/limit from Express query params.
 * Returns { page, limit, skip } safe for Mongoose .skip/.limit.
 */
function parsePage(query = {}, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) {
  const limit = Math.min(Math.max(1, parseInt(query.limit, 10) || defaultLimit), maxLimit);
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Run a paginated find on a Mongoose model.
 * @param {Model}  Model    - Mongoose model
 * @param {object} filter   - MongoDB filter
 * @param {object} opts     - { page, limit, sort, select, lean }
 * @returns {{ data, pagination }}
 */
async function paginatedQuery(Model, filter, opts = {}) {
  const {
    page    = 1,
    limit   = DEFAULT_LIMIT,
    sort    = { createdAt: -1 },
    select  = null,
    lean    = true,
  } = opts;

  const cappedLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const skip        = (Math.max(1, page) - 1) * cappedLimit;

  let q = Model.find(filter).sort(sort).skip(skip).limit(cappedLimit);
  if (select) q = q.select(select);
  if (lean)   q = q.lean();

  const [data, total] = await Promise.all([q, Model.countDocuments(filter)]);

  return {
    data,
    pagination: {
      page:  Math.max(1, page),
      limit: cappedLimit,
      total,
      pages: Math.ceil(total / cappedLimit) || 1,
      hasNext: skip + cappedLimit < total,
    },
  };
}

/**
 * Process a large collection in batches without loading it all into memory.
 * Calls processBatch(docs) for each batch.
 * @returns {number} total documents processed
 */
async function batchProcess(Model, filter, processBatch, { batchSize = 1_000, sort = { _id: 1 } } = {}) {
  let lastId = null;
  let processed = 0;

  for (;;) {
    const batchFilter = lastId ? { ...filter, _id: { $gt: lastId } } : filter;
    const docs = await Model.find(batchFilter).sort(sort).limit(batchSize).lean();
    if (!docs.length) break;

    await processBatch(docs);
    processed += docs.length;
    lastId = docs[docs.length - 1]._id;

    if (docs.length < batchSize) break;
  }

  return processed;
}

module.exports = { parsePage, paginatedQuery, batchProcess, DEFAULT_LIMIT, MAX_LIMIT, EXPORT_LIMIT };
