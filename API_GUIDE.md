# FAQ Hub REST API Guide

## Starting the API Server

```bash
npm run api
```

The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

## API Endpoints

### 1. Health Check
**GET** `/health`

Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

---

### 2. Search FAQs
**POST** `/api/search`

Search for relevant FAQ documents using semantic search.

**Request Body:**
```json
{
  "query": "How do I reset my password?",
  "limit": 3
}
```

**Parameters:**
- `query` (string, required): The search query
- `limit` (number, optional): Number of results to return (default: 3)

**Response:**
```json
{
  "query": "How do I reset my password?",
  "results": [
    {
      "document": "To reset your password...",
      "metadata": { "file": "authentication.txt" },
      "distance": 0.234,
      "id": "authentication.txt-0"
    }
  ],
  "count": 1
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "password reset", "limit": 5}'
```

---

### 3. Ingest FAQ Files
**POST** `/api/ingest`

Process and ingest FAQ files from the `data/faqs` directory into the vector database.

**Request Body:**
```json
{
  "chunkSize": 500,
  "overlap": 50
}
```

**Parameters:**
- `chunkSize` (number, optional): Size of text chunks (default: 500)
- `overlap` (number, optional): Overlap between chunks (default: 50)

**Response:**
```json
{
  "message": "Files ingested successfully",
  "filesProcessed": ["faq1.txt", "faq2.txt"],
  "count": 2
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"chunkSize": 500, "overlap": 50}'
```

---

### 4. Embed Text
**POST** `/api/embed`

Generate embeddings for a given text using the configured embedding model.

**Request Body:**
```json
{
  "text": "This is the text to embed"
}
```

**Parameters:**
- `text` (string, required): The text to embed

**Response:**
```json
{
  "text": "This is the text to embed",
  "embedding": [0.123, -0.456, 0.789, ...],
  "dimensions": 768
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Sample text for embedding"}'
```

---

### 5. Chunk Text
**POST** `/api/chunk`

Split a large text into smaller chunks with optional overlap.

**Request Body:**
```json
{
  "text": "This is a long text that needs to be chunked...",
  "chunkSize": 500,
  "overlap": 50
}
```

**Parameters:**
- `text` (string, required): The text to chunk
- `chunkSize` (number, optional): Size of each chunk (default: 500)
- `overlap` (number, optional): Overlap between chunks (default: 50)

**Response:**
```json
{
  "text": "This is a long text that needs to...",
  "chunks": ["chunk 1...", "chunk 2...", "chunk 3..."],
  "chunkCount": 3,
  "chunkSize": 500,
  "overlap": 50
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/chunk \
  -H "Content-Type: application/json" \
  -d '{"text": "Long text here...", "chunkSize": 200, "overlap": 20}'
```

---

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "error": "Error description",
  "details": "Detailed error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing or invalid parameters)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## Rate Limiting

The API implements rate limiting to prevent abuse and protect resources. Rate limits are applied per IP address.

### Rate Limit Tiers

**General Endpoints** (100 requests per 15 minutes):
- `/api/search`
- `/api/chunk`

**Expensive Endpoints** (20 requests per 15 minutes):
- `/api/ingest` - Processes multiple files and generates embeddings
- `/api/embed` - Calls external embedding service

**Unlimited Endpoints**:
- `/health` - Health check endpoint has no rate limit

### Rate Limit Headers

When rate limits are applied, responses include standard rate limit headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1699876543
```

### Rate Limit Exceeded Response

When you exceed the rate limit, you'll receive a `429` status code:

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

### Configuration

Rate limits can be configured via environment variables:

```bash
# Time window in milliseconds (default: 900000 = 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window for general endpoints (default: 100)
RATE_LIMIT_MAX_REQUESTS=100

# Maximum requests per window for expensive operations (default: 20)
RATE_LIMIT_MAX_EXPENSIVE=20
```

To disable rate limiting, set very high values (not recommended for production):
```bash
RATE_LIMIT_MAX_REQUESTS=999999
RATE_LIMIT_MAX_EXPENSIVE=999999
```

---

## Configuration

The API uses the following configuration (can be modified in `src/utils.ts`):

- **LM Studio URL**: `http://127.0.0.1:1234/v1/embeddings`
- **Embedding Model**: `text-embedding-nomic-embed-text-v1.5`
- **ChromaDB Host**: `localhost`
- **ChromaDB Port**: `8000`
- **Collection Name**: `internal-faq`
- **FAQs Directory**: `./data/faqs`

---

## Other Scripts

### Ingest Files (CLI)
```bash
npm run ingest
```

### Query FAQs (CLI)
```bash
npm run query
```
