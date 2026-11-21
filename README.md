# Hotel Offer Orchestrator

Aggregate overlapping hotel offers from two mock suppliers, deduplicate hotels based on the best price, orchestrate the workflow using **Temporal.io**, cache results in **Redis**, and perform price range filtering natively inside Redis using Sorted Sets.

---

## Tech Stack
- **Runtime & Language**: Node.js 22, TypeScript
- **Web Framework**: Express
- **Orchestration**: Temporal.io (`@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow`, `@temporalio/activity`)
- **Caching & Filtering**: Redis (`ioredis` using Sorted Sets `ZADD` and `ZRANGEBYSCORE`)
- **DevOps**: Docker & Docker Compose

---

## Architecture & Data Flow

1. **Client** issues `GET /api/hotels?city=delhi&minPrice=5000&maxPrice=6000`.
2. **API Layer** queries Redis cache (`ZRANGEBYSCORE hotels:city:delhi <min> <max>`).
3. **Cache Miss**: API initiates the **Temporal Workflow** (`hotelOrchestratorWorkflow`).
4. **Temporal Worker**:
   - Calls **Supplier A** and **Supplier B** activities concurrently via `Promise.all`.
   - Executes `deduplicateHotels`: matches hotel names (case-insensitive), selects the lower price, or retains unique offers.
   - Executes `saveToRedisActivity`: stores deduplicated items in Redis Sorted Set with `price` as the score and sets a TTL.
5. **API Layer** returns the sorted, deduplicated, and price-filtered JSON to the client.

---

## Project Structure

```text
hotel-orchestrator/
├── src/
│   ├── api/
│   │   ├── hotelRoutes.ts        # GET /api/hotels (caching + range filter)
│   │   └── healthRoutes.ts       # GET /health (bonus health check)
│   ├── config/
│   │   └── index.ts              # App config & environment variables
│   ├── redis/
│   │   ├── redisClient.ts        # Redis client connection
│   │   └── hotelCache.ts         # Sorted Set caching & ZRANGEBYSCORE queries
│   ├── suppliers/
│   │   ├── mockData.ts           # Overlapping mock hotel data
│   │   └── supplierRoutes.ts     # GET /supplierA/hotels & /supplierB/hotels
│   ├── temporal/
│   │   ├── activities.ts         # Fetch suppliers, deduplicate, save to Redis
│   │   ├── workflows.ts          # Orchestration definition
│   │   ├── client.ts             # Express Temporal client helper
│   │   └── worker.ts             # Temporal Worker runner
│   ├── types.ts                  # Shared TypeScript interfaces
│   └── server.ts                 # Express server entry point
├── Dockerfile                    # Multi-stage production Dockerfile
├── docker-compose.yml            # Complete stack (Temporal, Redis, App, Worker)
├── hotel-orchestrator.postman_collection.json # Ready-to-import Postman tests
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Option 1: Run with Docker Compose (Recommended)
Ensure Docker Desktop is running:

```bash
docker-compose up --build
```

Services exposed:
- **Express API**: `http://localhost:3000`
- **Temporal Web UI**: `http://localhost:8080`
- **Temporal gRPC**: `localhost:7233`
- **Redis**: `localhost:6379`

### Option 2: Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Redis and Temporal locally**:
   - Ensure Redis is running on port 6379.
   - Start Temporal CLI dev server: `temporal server start-dev`

3. **Start the Express API Server**:
   ```bash
   npm run dev
   ```

4. **Start the Temporal Worker**:
   ```bash
   npm run worker
   ```

---

## API Endpoints & Examples

### 1. Search Hotels by City
```bash
curl http://localhost:3000/api/hotels?city=delhi
```
**Sample Response:**
```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  },
  {
    "name": "The Grand",
    "price": 4200,
    "supplier": "Supplier A",
    "commissionPct": 8
  },
  {
    "name": "Hyatt Regency",
    "price": 7100,
    "supplier": "Supplier B",
    "commissionPct": 14
  },
  {
    "name": "Taj Palace",
    "price": 9500,
    "supplier": "Supplier A",
    "commissionPct": 15
  }
]
```

### 2. Search Hotels with Price Range (Filtered natively in Redis)
```bash
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
```

### 3. Supplier Health Check (Bonus)
```bash
curl http://localhost:3000/health
```
**Sample Response:**
```json
{
  "status": "healthy",
  "suppliers": {
    "supplierA": "UP",
    "supplierB": "UP"
  },
  "redis": "UP"
}
```

### 4. Mock Supplier Endpoints
- `GET /supplierA/hotels?city=delhi`
- `GET /supplierB/hotels?city=delhi`
- `GET /supplierA/hotels?simulateDown=true` *(Simulates 503 outage for resilience testing)*

---

## Postman Collection
Import `hotel-orchestrator.postman_collection.json` directly into Postman to execute all test cases.
