# TalentNest HR — Load Test Guide

## Results (Realistic Synthetic — run 2026-06-22)

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
| 10  | GET /api/health          | 4 264 | 2  | 4   | 0.0% |
| 10  | GET /api/jobs            |   448 | 22 | 24  | 0.0% |
| 10  | GET /api/candidates      |   456 | 21 | 24  | 0.0% |
| 10  | GET /api/applications    |   449 | 22 | 24  | 0.0% |
| 10  | GET /api/dashboard/stats | 1 689 | 5  | 8   | 0.0% |
| 50  | GET /api/health          | 4 048 | 12 | 16  | 0.0% |
| 50  | GET /api/jobs            | 1 116 | 45 | 62  | 0.0% |
| 50  | GET /api/candidates      | 1 302 | 38 | 46  | 0.0% |
| 50  | GET /api/applications    | 1 203 | 41 | 48  | 0.0% |
| 50  | GET /api/dashboard/stats | 1 666 | 30 | 36  | 0.0% |
| 100 | GET /api/health          | 3 986 | 25 | 31  | 0.0% |
| 100 | GET /api/jobs            | 1 098 | 93 | 102 | 0.0% |
| 100 | GET /api/candidates      | 1 288 | 79 | 90  | 0.0% |
| 100 | GET /api/applications    | 1 163 | 87 | 99  | 0.0% |
| 100 | GET /api/dashboard/stats | 1 626 | 62 | 76  | 0.0% |
| 250 | GET /api/health          | 3 763 | 67 | 83  | 0.0% |
| 250 | GET /api/jobs            | 1 126 | 236 | 326 | 0.0% |
| 250 | GET /api/candidates      | 1 240 | 213 | 273 | 0.0% |
| 250 | GET /api/applications    | 1 165 | 225 | 330 | 0.0% |
| 250 | GET /api/dashboard/stats | 1 554 | 167 | 176 | 0.0% |

### Production projection (add real MongoDB round-trips)

A typical Atlas M10 in the same region adds 15–40 ms per DB call.
Each list endpoint makes 2 DB calls (find + countDocuments).
Dashboard/stats makes ~12 DB calls (many aggregations).

| Users | /api/jobs (est. real) | /api/dashboard/stats (est. real) |
|-------|-----------------------|----------------------------------|
|  10   | avg ~62 ms · p95 ~104 ms  | avg ~245 ms · p95 ~368 ms |
|  50   | avg ~85 ms · p95 ~142 ms  | avg ~270 ms · p95 ~396 ms |
| 100   | avg ~133 ms · p95 ~182 ms | avg ~302 ms · p95 ~556 ms |
| 250   | avg ~276 ms · p95 ~406 ms | avg ~407 ms · p95 ~616 ms |

### First bottleneck

At **100 concurrent users**, `GET /api/jobs` latency doubles from 45 ms (50 users)
to 93 ms. The jump is not from MongoDB — it is Node.js event-loop saturation: the
route iterates 300 jobs through `normalizeJob()` on every request with no caching.

**Fix target:** Add a short-lived (15 s) in-process cache on the jobs list query,
or add a Redis layer. This is the single change with the highest ROI before launch.

`/api/dashboard/stats` stays fast (62 ms avg at 100 users) because the route is
already guarded by a `cacheRoute(15)` middleware that caches the aggregation result
for 15 seconds.

### Comfortable concurrent-user count

The Node.js layer comfortably handles **50 concurrent users** with p95 < 50 ms
(all list endpoints). At 100 users the list endpoints stay under 100 ms p95. At
250 users p95 climbs to ~330 ms — acceptable but approaching the ceiling. With
real MongoDB overhead added, 50 simultaneous users is the safe launch target on
a single server instance (Render/Railway starter plan).

---

## One-command re-run

```bash
# From the backend/ directory:
node load-test-realistic.js

# Adjust DB latency simulation (default 20 ms):
DB_LATENCY_MS=40 node load-test-realistic.js

# Run for longer (default 10 s per level):
DURATION=20 node load-test-realistic.js
```

Results are written to `backend/load-test-results.json`.

---

## Running with a real MongoDB (when available)

```bash
# Requires fastdl.mongodb.org in the network egress allowlist
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/loadtest"
export JWT_SECRET="any_secret_32_chars_minimum_here"
export COOKIE_SECRET="any_secret_32_chars_minimum_here"
node load-test.js
```

The `load-test.js` script seeds 300 jobs · 3 000 candidates · 15 000 applications
and tests the same 5 endpoints against a live Mongoose connection.

---

## Key MongoDB Indexes

Confirm these exist before running the full DB-backed test:

```js
db.jobs.getIndexes()          // needs: { tenantId:1, status:1, deletedAt:1 }
db.candidates.getIndexes()    // needs: { tenantId:1, deletedAt:1 }
db.applications.getIndexes()  // needs: { tenantId:1, currentStage:1, deletedAt:1 }
                               //         { jobId:1, candidateId:1 } (unique)
```

Missing indexes on large collections are the primary cause of slow list endpoints.

---

## Pre-launch recommendations

1. **Atlas M10 or higher** — M0/M5 free clusters cap at 100 connections. M10 ($57/mo) supports 1 500.
2. **Mongoose pool size** — default is 5. Set `maxPoolSize: 50` for 100+ concurrent users.
3. **Jobs list cache** — add 15 s in-process cache on the jobs list. Single highest-ROI fix.
4. **Dashboard cache** — already in place (`cacheRoute(15)`). No action needed.
5. **Response compression** — verify `compression` middleware is mounted in server.js.
