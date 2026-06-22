# TalentNest HR — Load Test Guide

## Results (Express Layer — run 2026-06-22)

These numbers measure **pure Node.js + Express + JWT decode** throughput with
50 jobs, 500 candidates, and 2 000 applications in memory (no MongoDB). Real
production numbers will be **20–60 ms higher** per endpoint due to MongoDB
round-trips. Error rate was **0.0% at every level**.

| Concurrent users | Endpoint | req/s | avg latency | p95 latency |
|-----------------|----------|-------|-------------|-------------|
| 10 | /api/health | 10,108 | <1 ms | 2 ms |
| 10 | /api/jobs | 3,960 | 2 ms | 4 ms |
| 10 | /api/candidates | 4,019 | 2 ms | 4 ms |
| 10 | /api/applications | 4,065 | 2 ms | 4 ms |
| 10 | /api/dashboard | 3,357 | 2 ms | 4 ms |
| 50 | /api/health | 9,354 | 5 ms | 8 ms |
| 50 | /api/jobs | 4,016 | 12 ms | 16 ms |
| 50 | /api/candidates | 4,176 | 11 ms | 15 ms |
| 50 | /api/applications | 4,226 | 11 ms | 16 ms |
| 50 | /api/dashboard | 3,323 | 15 ms | 19 ms |
| 100 | /api/health | 9,416 | 10 ms | 16 ms |
| 100 | /api/jobs | 4,226 | 23 ms | 29 ms |
| 100 | /api/candidates | 3,841 | 26 ms | 34 ms |
| 100 | /api/applications | 4,046 | 24 ms | 32 ms |
| 100 | /api/dashboard | 3,466 | 29 ms | 36 ms |
| 250 | /api/health | 9,538 | 26 ms | 33 ms |
| 250 | /api/jobs | 3,838 | 66 ms | 92 ms |
| 250 | /api/candidates | 3,725 | 67 ms | 76 ms |
| 250 | /api/applications | 3,950 | 63 ms | 77 ms |
| 250 | /api/dashboard | 3,313 | 76 ms | 93 ms |

### What this means for launch

- At **10–100 concurrent users** (realistic for a pilot): p95 latency stays under
  35 ms for routing. With MongoDB adding ~20–60 ms, real p95 is ~50–90 ms.
  That is comfortably fast.
- At **250 concurrent users**: p95 hits ~90 ms (routing only). With a well-indexed
  MongoDB Atlas M10+ cluster this should stay under 200 ms — still acceptable.
- Node.js is **not the bottleneck**. The limiting factor in production will be
  MongoDB query performance and the number of connections.
- **Zero errors at all levels.** The Express app does not drop requests or crash
  under sustained concurrent load.

---

## Running the Full Load Test (with MongoDB)

The full test (`load-test.js`) seeds a real database and uses the production
Mongoose queries. Run it from your own machine or a VM with MongoDB access.

### Prerequisites

```bash
# 1. Clone the repo and cd into backend
cd talentnest-hr/backend
npm install

# 2. Set env vars pointing to a test MongoDB
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/loadtest"
export JWT_SECRET="any_secret_32_chars_minimum_here"
export COOKIE_SECRET="any_secret_32_chars_minimum_here"

# 3. Run
node load-test.js
```

Results are saved to `backend/load-test-results.json`.

### Adjusting duration

```bash
DURATION=20 node load-test.js   # 20 seconds per level instead of 10
```

### What it seeds

- 1 test organisation (`LoadTest Corp`)
- 1 admin user (`admin@loadtest.example` / `Admin@12345`)
- 50 active jobs across 5 cities
- 500 candidates with varied roles and skills
- 2 000 applications spread across all jobs and candidates

### Endpoints tested

| Endpoint | Auth |
|----------|------|
| `GET /api/health` | None |
| `GET /api/jobs` | Bearer JWT |
| `GET /api/candidates` | Bearer JWT |
| `GET /api/applications` | Bearer JWT |
| `GET /api/dashboard` | Bearer JWT |

---

## Running the Express-Only Test (no MongoDB needed)

```bash
node load-test-express.js
```

Use this to quickly verify the Node.js layer has not regressed after code changes.

---

## Key MongoDB Indexes to Check Before Load Testing

Run this in your MongoDB shell to confirm indexes exist:

```js
db.jobs.getIndexes()        // should include: { tenantId: 1, status: 1 }
db.candidates.getIndexes()  // should include: { tenantId: 1 }
db.applications.getIndexes()// should include: { tenantId: 1, stage: 1 }
                             //                { jobId: 1, candidateId: 1 } (unique)
```

If any are missing, add them:

```js
db.jobs.createIndex({ tenantId: 1, status: 1, deletedAt: 1 })
db.candidates.createIndex({ tenantId: 1, deletedAt: 1 })
db.applications.createIndex({ tenantId: 1, stage: 1, deletedAt: 1 })
```

Missing indexes on a large collection will cause full collection scans and are
the most common cause of slow list endpoints.

---

## Recommendations Before 100+ Concurrent Users

1. **Atlas M10 or higher** — M0/M2/M5 free clusters have 100 concurrent connection
   limits and no SLA. Paid clusters start at M10 ($57/month) with 1 500 connections.
2. **Connection pooling** — Mongoose default pool size is 5. Set
   `mongoose.connect(uri, { maxPoolSize: 50 })` before scaling.
3. **Response compression** — already enabled (`compression` middleware).
4. **Redis cache** — for dashboard and aggregation endpoints that are read-heavy and
   change slowly, a 30-second Redis cache can reduce DB load by 80%.
5. **Rate limiting** — already in place on auth endpoints. Consider adding a global
   rate limiter per tenant for list endpoints if API abuse becomes a concern.
