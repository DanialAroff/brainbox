# Internal FAQ Hub

A semantic search API for internal FAQs using vector embeddings and ChromaDB.

## Features

- **Semantic search** over FAQ documents using vector embeddings
- **RESTful API** for easy integration
- **MCP (Model Context Protocol) server** for Claude Desktop integration
- **Configurable** via environment variables
- **Cross-platform** support (Windows, Linux, macOS)
- **Chunking support** for large documents
- **CLI tools** for local testing
- **Resources** - Access FAQ files directly through MCP

## Distribution Options

### Option 1: REST API
Run as a web service accessible via HTTP endpoints (see [API_GUIDE.md](API_GUIDE.md))

### Option 2: MCP Server
Integrate directly with Claude Desktop for AI-powered FAQ search (see [MCP_GUIDE.md](MCP_GUIDE.md))

### Option 3: CLI Tools
Use command-line tools for local FAQ management and queries

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- LM Studio URL for embeddings
- ChromaDB connection details
- FAQ files directory path

### 3. Set Up Services

Make sure you have:
- **LM Studio** running with an embedding model (or compatible API)
- **ChromaDB** running (default: `localhost:8000`)
  ```bash
  docker run -p 8000:8000 chromadb/chroma
  ```

### 4. Add FAQ Files

Place your FAQ text files in the `data/faqs` directory (or the path specified in `.env`).

### 5. Ingest Documents

Process and embed your FAQ files:

```bash
npm run ingest
```

### 6. Start the Server

**For REST API:**
```bash
npm run api
```
The API will be available at `http://localhost:3000`

**For MCP Server (Claude Desktop):**
```bash
npm run build
npm run build:mcp
```
Or configure in Claude Desktop (see [MCP_GUIDE.md](MCP_GUIDE.md))

## API Endpoints

### Health Check
```bash
GET /health
```

### Search FAQs
```bash
POST /api/search
Content-Type: application/json

{
  "query": "How do I reset my password?",
  "limit": 3
}
```

### Ingest Files
```bash
POST /api/ingest
Content-Type: application/json

{
  "chunkSize": 500,
  "overlap": 50
}
```

### Embed Text
```bash
POST /api/embed
Content-Type: application/json

{
  "text": "Sample text to embed"
}
```

### Chunk Text
```bash
POST /api/chunk
Content-Type: application/json

{
  "text": "Long text to split...",
  "chunkSize": 500,
  "overlap": 50
}
```

For detailed API documentation, see [API_GUIDE.md](API_GUIDE.md).

## Usage Modes

### 1. MCP Server (Recommended for Claude Desktop users)

Integrate with Claude Desktop to search FAQs conversationally:

```bash
npm run build
```

Then configure Claude Desktop (see [MCP_GUIDE.md](MCP_GUIDE.md))

**Tools available in Claude:**
- `search_faqs` - Search the FAQ database
- `ingest_faqs` - Update the FAQ database
- `list_faq_files` - List available FAQ files
- `embed_text` - Generate embeddings
- `chunk_text` - Split text into chunks

**Resources available:**
- Access FAQ files via `faq:///filename.txt`

### 2. REST API

Run as a web service:

```bash
npm run api
```

See [API_GUIDE.md](API_GUIDE.md) for endpoint documentation.

### 3. CLI Tools

**Query FAQs (Interactive):**
```bash
npm run query
```

**Ingest FAQ Files:**
```bash
npm run ingest
```

## Configuration

All configuration is done via environment variables (`.env` file):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `LMSTUDIO_URL` | Embedding service URL | `http://127.0.0.1:1234/v1/embeddings` |
| `EMBED_MODEL` | Embedding model name | `text-embedding-nomic-embed-text-v1.5` |
| `CHROMA_HOST` | ChromaDB host | `localhost` |
| `CHROMA_PORT` | ChromaDB port | `8000` |
| `CHROMA_SSL` | Use SSL for ChromaDB | `false` |
| `COLLECTION_NAME` | ChromaDB collection name | `internal-faq` |
| `FAQS_PATH` | FAQ files directory | `./data/faqs` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |

## Deployment

To deploy this API to a server for production use, see the comprehensive [DEPLOYMENT.md](DEPLOYMENT.md) guide.

Key deployment options:
- Traditional VPS (DigitalOcean, AWS, Linode)
- Platform as a Service (Railway, Render, Heroku)
- Docker containers
- Kubernetes clusters

## Project Structure

```
internal-faq-hub/
├── src/
│   ├── api.ts          # REST API server
│   ├── ingest.ts       # CLI tool to ingest FAQ files
│   ├── query.ts        # CLI tool to query FAQs
│   └── utils.ts        # Shared utilities and configuration
├── data/
│   └── faqs/           # FAQ text files
├── .env.example        # Environment variables template
├── API_GUIDE.md        # API documentation
├── DEPLOYMENT.md       # Deployment guide
└── package.json
```

## Requirements

- Node.js 18+ (ES modules support)
- ChromaDB instance (local or remote)
- Embedding service (LM Studio or compatible API)
- FAQ documents in text format

## Development

### Install dependencies
```bash
npm install
```

### Run in development mode with auto-reload
```bash
npx tsx watch src/api.ts
```

### TypeScript compilation
```bash
npx tsc
```

## Security Considerations

For production deployment:
1. Add API key authentication
2. Configure specific CORS origins (not `*`)
3. Implement rate limiting
4. Use HTTPS/SSL
5. Set up proper error logging
6. Regular security updates

See [DEPLOYMENT.md](DEPLOYMENT.md) for security best practices.

## Troubleshooting

### Can't connect to ChromaDB
- Ensure ChromaDB is running: `curl http://localhost:8000/api/v1/heartbeat`
- Check `CHROMA_HOST` and `CHROMA_PORT` in `.env`

### Embedding service errors
- Verify LM Studio is running with an embedding model loaded
- Check `LMSTUDIO_URL` in `.env`
- Test the endpoint: `curl http://127.0.0.1:1234/v1/models`

### File path errors
- Use absolute paths in `FAQS_PATH` for production
- Ensure FAQ files exist in the specified directory
- Check file permissions

## License

MIT

## Contributing

Contributions are welcome! Please submit issues and pull requests.
