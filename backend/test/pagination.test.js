/**
 * Step 1 tests — unbounded query fixes
 *
 * Tests:
 *   1. parsePage — extracts page/limit/skip correctly, enforces maxLimit cap
 *   2. paginatedQuery — seed 50 docs, request limit=10, assert exactly 10 returned
 *      with correct pagination metadata (total=50, pages=5, hasNext=true)
 *   3. paginatedQuery — last page has hasNext=false
 *   4. paginatedQuery — never fetches more than MAX_LIMIT per call
 *   5. batchProcess  — processes all docs across multiple batches without gaps
 *   6. parsePage custom export limit — EXPORT_LIMIT accepted as maxLimit
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import mongoose from 'mongoose';

const _r = createRequire(import.meta.url);
const { parsePage, paginatedQuery, batchProcess, MAX_LIMIT, DEFAULT_LIMIT, EXPORT_LIMIT } =
  _r('../src/utils/pagination.js');

// ── Mongoose query-chain mock ─────────────────────────────────────────────────
// Uses a closure variable (not `q` itself) to avoid the TDZ issue where
// `mockResolvedValue(docs.slice(0, q._limit))` would evaluate before `q` exists.
function makeModelMock(allDocs) {
  const mockQuery = (docs) => {
    let capturedLimit;

    const q = {
      sort:   vi.fn().mockReturnThis(),
      skip:   vi.fn().mockReturnThis(),
      limit:  vi.fn().mockImplementation((n) => { capturedLimit = n; return q; }),
      select: vi.fn().mockReturnThis(),
      lean:   vi.fn().mockImplementation(() =>
        Promise.resolve(docs.slice(0, capturedLimit ?? docs.length)),
      ),
    };
    // Make q awaitable so `await Model.find()` works without .lean()
    q.then = (resolve, reject) =>
      Promise.resolve(docs.slice(0, capturedLimit ?? docs.length)).then(resolve, reject);

    return q;
  };

  return {
    find:           vi.fn().mockImplementation(() => mockQuery(allDocs)),
    countDocuments: vi.fn().mockResolvedValue(allDocs.length),
  };
}

// ── parsePage ─────────────────────────────────────────────────────────────────
describe('parsePage', () => {
  it('returns DEFAULT_LIMIT when query is empty', () => {
    const { page, limit, skip } = parsePage({});
    expect(page).toBe(1);
    expect(limit).toBe(DEFAULT_LIMIT);
    expect(skip).toBe(0);
  });

  it('computes skip = (page-1)*limit', () => {
    const { page, limit, skip } = parsePage({ page: '3', limit: '10' });
    expect(page).toBe(3);
    expect(limit).toBe(10);
    expect(skip).toBe(20);
  });

  it('clamps limit to MAX_LIMIT', () => {
    const { limit } = parsePage({ limit: '99999' });
    expect(limit).toBe(MAX_LIMIT);
  });

  it('clamps page to minimum 1 for invalid values', () => {
    const { page, skip } = parsePage({ page: '-5' });
    expect(page).toBe(1);
    expect(skip).toBe(0);
  });

  it('accepts a custom maxLimit (e.g. EXPORT_LIMIT)', () => {
    const { limit } = parsePage({ limit: '5000' }, DEFAULT_LIMIT, EXPORT_LIMIT);
    expect(limit).toBe(5_000); // 5000 < 10000 → accepted
  });

  it('still caps above the custom maxLimit', () => {
    const { limit } = parsePage({ limit: '99999' }, DEFAULT_LIMIT, EXPORT_LIMIT);
    expect(limit).toBe(EXPORT_LIMIT);
  });
});

// ── paginatedQuery ────────────────────────────────────────────────────────────
describe('paginatedQuery', () => {
  it('seed 50 docs, limit=10 → returns exactly 10 docs', async () => {
    const fiftyDocs = Array.from({ length: 50 }, (_, i) => ({ _id: i, n: i }));
    const Model     = makeModelMock(fiftyDocs);

    const result = await paginatedQuery(Model, {}, { page: 1, limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.pagination.total).toBe(50);
    expect(result.pagination.pages).toBe(5);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.hasNext).toBe(true);
  });

  it('last page → hasNext=false', async () => {
    const tenDocs = Array.from({ length: 10 }, (_, i) => ({ _id: i }));
    const Model   = makeModelMock(tenDocs);

    // page=1, limit=10, total=10 → no next page
    const result = await paginatedQuery(Model, {}, { page: 1, limit: 10 });
    expect(result.pagination.hasNext).toBe(false);
  });

  it('never calls .limit() with more than MAX_LIMIT', async () => {
    const Model = makeModelMock([]);
    await paginatedQuery(Model, {}, { limit: 999_999 });

    const q = Model.find.mock.results[0].value;
    expect(q.limit.mock.calls[0][0]).toBe(MAX_LIMIT);
  });

  it('passes filter to find()', async () => {
    const Model = makeModelMock([]);
    const filter = { tenantId: 'abc', role: 'recruiter' };
    await paginatedQuery(Model, filter, { limit: 10 });
    expect(Model.find).toHaveBeenCalledWith(filter);
  });

  it('passes same filter to countDocuments()', async () => {
    const Model = makeModelMock([]);
    const filter = { status: 'active' };
    await paginatedQuery(Model, filter, { limit: 10 });
    expect(Model.countDocuments).toHaveBeenCalledWith(filter);
  });
});

// ── batchProcess ──────────────────────────────────────────────────────────────
describe('batchProcess', () => {
  it('processes all docs across 3 batches (25 docs, batchSize=10)', async () => {
    // Simulate cursor-style pagination: each call returns the next 10 docs
    const allDocs = Array.from({ length: 25 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      val: i,
    }));

    let batchStart = 0;
    const Model = {
      find: vi.fn().mockImplementation(() => {
        const start = batchStart;
        batchStart += 10;
        const slice = allDocs.slice(start, start + 10);
        return {
          sort:  vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean:  vi.fn().mockResolvedValue(slice),
        };
      }),
    };

    const collected = [];
    const total = await batchProcess(Model, {}, async (docs) => {
      collected.push(...docs);
    }, { batchSize: 10 });

    expect(collected).toHaveLength(25);
    expect(total).toBe(25);
    // 3 DB calls: 10 + 10 + 5; the 4th would be empty but batchProcess stops
    // after a batch smaller than batchSize
    expect(Model.find).toHaveBeenCalledTimes(3);
  });

  it('handles empty collection without calling processBatch', async () => {
    const Model = {
      find: vi.fn().mockImplementation(() => ({
        sort:  vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean:  vi.fn().mockResolvedValue([]),
      })),
    };

    const processBatch = vi.fn();
    const total = await batchProcess(Model, {}, processBatch, { batchSize: 100 });

    expect(total).toBe(0);
    expect(processBatch).not.toHaveBeenCalled();
    expect(Model.find).toHaveBeenCalledTimes(1);
  });
});
