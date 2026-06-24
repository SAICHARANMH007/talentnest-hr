# TalentNest HR — Load Test Guide

## Results (Realistic Synthetic — run 2026-06-24)

**What was measured:** The actual production Express route handlers
(JWT auth, RBAC, pagination, filtering, JSON serialisation) with 20 ms of
simulated DB latency per call — 300 jobs · 3 000 candidates · 15 000 applications.

**What was NOT measured:** Real MongoDB query execution, index scan vs.
collection scan, or DB connection pool pressure. To get those numbers, run
`load-test.js` with a live Atlas URI (requires `fastdl.mongodb.org` in the
network egress allowlist, which is blocked in the current CI environment).

**Zero errors at every level.**

### Raw numbers (20 ms simulated DB latency per call)

| Users | Endpoint | req/s | avg ms | p95 ms | errors |
|-------|----------|-------|--------|--------|--------|
| 10  | GET /api/health          | 9 892 |  0 |   2 | 0.0% |
| 10  | GET /api/jobs            |   460 | 21 |  23 | 0.0% |
| 10  | GET /api/candidates      |   467 | 21 |  23 | 0.0% |
| 10  | GET /api/applications    |   462 | 21 |  23 | 0.0% |
| 10  | GET /api/dashboard/stats | 2 922 |  3 |   5 | 0.0% |
| 50  | GET /api/health          | 9 865 |  5 |   7 | 0.0% |
| 50  | GET /api/jobs            | 1 773 | 28 |  34 | 0.0% |
| 50  | GET /api/candidates      | 2 071 | 24 |  28 | 0.0% |
| 50  | GET /api/applications    | 1 934 | 25 |  29 | 0.0% |
| 50  | GET /api/dashboard/stats | 2 989 | 16 |  20 | 0.0% |
| 100 | GET /api/health          | 9 916 | 10 |  13 | 0.0% |
| 100 | GET /api/jobs            | 2 047 | 49 |  55 | 0.0% |
| 100 | GET /api/candidates      | 2 477 | 40 |  59 | 0.0% |
| 100 | GET /api/applications    | 2 174 | 46 |  54 | 0.0% |
| 100 | GET /api/dashboard/stats | 3 074 | 32 |  43 | 0.0% |
| 250 | GET /api/health          | 9 802 | 25 |  34 | 0.0% |
| 250 | GET /api/jobs            | 2 169 | 119 | 140 | 0.0% |
| 250 | GET /api/candidates      | 2 558 |  99 | 116 | 0.0% |
| 250 | GET /api/applications    | 2 291 | 112 | 139 | 0.0% |
| 250 | GET /api/dashboard/stats | 2 994 |  85 | 106 | 0.0% |

### Production projection (add real MongoDB round-trips)

A typical Atlas M10 in the same region adds 15–40 ms per DB call.
Each list endpoint makes 2 DB calls (find + countDocuments).
Dashboard/stats makes ~12 DB calls (many aggregations).

| Users | /api/jobs (est. real) | /api/dashboard/stats (est. real) |
|-------|-----------------------|----------------------------------|
|  10   | avg ~61 ms · p95 ~103 ms  | avg ~43 ms · p95 ~85 ms  |
|  50   | avg ~68 ms · p95 ~114 ms  | avg ~56 ms · p95 ~100 ms |
| 100   | avg ~89 ms · p95 ~135 ms  | avg ~72 ms · p95 ~123 ms |
| 250   | avg ~159 ms · p95 ~220 ms | avg ~125 ms · p95 ~186 ms|

### First bottleneck

At **250 concurrent users**, `GET /api/jobs` is the slowest list endpoint
(avg 119 ms, p95 140 ms). With real MongoDB overhead the projection is
avg ~159 ms · p95 ~220 ms.

Root causes identified:
- `normalizeJob()` called on 300 objects per request with no caching
- `countDocuments` run on every page (even when total hasn't changed)
- No covering index for combined `{tenantId, urgency, deletedAt}` or
  `{tenantId, branch, deletedAt}` filter paths — added in this PR

`/api/dashboard/stats` is fast because it is already guarded by
`cacheRoute(15)` middleware (15 s in-process cache on the aggregation).

### Index improvements (added 2026-06-24)

**Job model — new indexes:**
```js
{ tenantId: 1, urgency: 1, deletedAt: 1 }        // urgency filter
{ tenantId: 1, branch: 1,  deletedAt: 1 }         // branch filter
{ tenantId: 1, jobType: 1, deletedAt: 1 }          // jobType filter
{ tenantId: 1, status: 1, deletedAt: 1, createdAt: -1 } // status+sort
```

**Candidate model — new indexes:**
```js
{ tenantId: 1, accountRequestSent: 1, deletedAt: 1 } // invite filter
{ tenantId: 1, userId: 1, deletedAt: 1 }              // linked-user filter
{ tenantId: 1, noticePeriodDays: 1, deletedAt: 1 }   // notice period search
```

Note: regex filters on `department`, `industry`, and `location` (mid-string
`$regex`) do not benefit from B-tree indexes. If those filters are heavily used,
consider a MongoDB Atlas Search (Lucene) index or enforcing starts-with anchors.

### Comfortable concurrent-user count

The Node.js layer comfortably handles **50 concurrent users** with p95 < 34 ms
(all list endpoints). At 100 users the list endpoints stay under 60 ms p95. At
250 users p95 climbs to ~140 ms for jobs — acceptable but approaching the
ceiling. With real MongoDB overhead added, **50 simultaneous users is the safe
launch target** on a single Render/Railway starter instance.

---

## One-command re-run

```bash
# From the repo root:
node backend/load-test-realistic.js

# Adjust DB latency simulation (default 20 ms):
DB_LATENCY_MS=40 node backend/load-test-realistic.js

# Run for longer (default 10 s per level):
DURATION=20 node backend/load-test-realistic.js
```

Results are written to `backend/load-test-results.json`.

---

## Running with a real MongoDB (when available)

```bash
# Requires fastdl.mongodb.org in the network egress allowlist
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/loadtest"
export JWT_SECRET="any_secret_32_chars_minimum_here"
export COOKIE_SECRET="any_secret_32_chars_minimum_here"
node backend/load-test.js
```

The `load-test.js` script seeds 300 jobs · 3 000 candidates · 15 000 applications
and tests the same 5 endpoints against a live Mongoose connection.

---

## Key MongoDB Indexes

Confirm these exist before running the full DB-backed test:

```js
db.jobs.getIndexes()
// needs: { tenantId:1, status:1, deletedAt:1 }
//         { tenantId:1, urgency:1, deletedAt:1 }
//         { tenantId:1, branch:1, deletedAt:1 }
//         { tenantId:1, jobType:1, deletedAt:1 }

db.candidates.getIndexes()
// needs: { tenantId:1, deletedAt:1, createdAt:-1 }
//         { tenantId:1, accountRequestSent:1, deletedAt:1 }
//         { tenantId:1, userId:1, deletedAt:1 }

db.applications.getIndexes()
// needs: { tenantId:1, currentStage:1, deletedAt:1 }
//         { jobId:1, candidateId:1, deletedAt:1 }
```

Missing indexes on large collections are the primary cause of slow list endpoints.

---

## Pre-launch recommendations

1. **Atlas M10 or higher** — M0/M5 free clusters cap at 100 connections. M10 ($57/mo) supports 1 500.
2. **Mongoose pool size** — default is 5. Set `maxPoolSize: 50` for 100+ concurrent users.
3. **Jobs list cache** — add 15 s in-process cache on the jobs list (same pattern as dashboard). Single highest-ROI fix before reaching 250+ users.
4. **Dashboard cache** — already in place (`cacheRoute(15)`). No action needed.
5. **Response compression** — verify `compression` middleware is mounted in server.js.
6. **Application populate** — `GET /api/applications` fetches 30+ candidate fields on every list page. Consider a lighter select for the list view and full fields only on the detail view.
