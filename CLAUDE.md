# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrainBox is a semantic search API for internal FAQs using vector embeddings and ChromaDB. It provides three distribution options:
1. **REST API** - Web service with HTTP endpoints
2. **MCP Server** - Integration with Claude Desktop via Model Context Protocol
3. **CLI Tools** - Command-line utilities for local FAQ management

## Development Commands

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
# REST API server (with auto-reload)
npx tsx watch src/api.ts

# MCP server
npm run mcp

# Ingest FAQ files
npm run ingest

# Query FAQs interactively
npm run query
```

### Build Commands
```bash
# Compile TypeScript to dist/
npm run build

# Build and run MCP server
npm run build:mcp
```

### TypeScript Compilation
```bash
npx tsc
```

## Architecture

### Core Components

**src/utils.ts** - Shared utilities and configuration
- Exports environment variable configuration (EMBEDDING_SERVICE_URL, EMBED_MODEL, CHROMA_HOST, etc.)
- `getChromaClient()` - Creates ChromaDB client instance
- `embedText(text)` - Generates vector embeddings via LM Studio/llama.cpp API
- `chunkText(text, chunkSize, overlap)` - Splits text into overlapping chunks

**src/api.ts** - Express REST API server
- Endpoints: `/health`, `/api/search`, `/api/ingest`, `/api/embed`, `/api/chunk`
- Uses CORS middleware with configurable origins
- Interacts with ChromaDB collection for storage/retrieval

**src/mcp-server.ts** - Model Context Protocol server
- Implements MCP SDK with stdio transport
- Tools: `search_faqs`, `ingest_faqs`, `embed_text`, `chunk_text`, `list_faq_files`
- Resources: FAQ files accessible via `faq:///filename.txt` URIs
- Handles tool execution and resource reading

**src/ingest.ts** - CLI script to process and embed FAQ files
**src/query.ts** - CLI script for interactive FAQ search

### Data Flow

1. **Ingestion**: FAQ files → chunkText() → embedText() → ChromaDB collection
2. **Search**: User query → embedText() → ChromaDB.query() → ranked results
3. FAQ files are stored in `data/faqs/` (configurable via FAQS_PATH)
4. Each chunk stored with metadata: `{file: filename}` and ID: `filename-chunkIndex`

### Dependencies

**External Services Required:**
- **ChromaDB** - Vector database (default: localhost:8000)
  ```bash
  docker run -p 8000:8000 chromadb/chroma
  ```
- **Embedding Service** - LM Studio or llama.cpp server with embedding model
  ```bash
  # llama.cpp example
  ./server -m nomic-embed-text-v1.5.Q8_0.gguf --port 1234 --embedding
  ```

**Key NPM Packages:**
- `chromadb` - Vector database client
- `@modelcontextprotocol/sdk` - MCP server implementation
- `express` + `cors` - REST API framework
- `axios` - HTTP client for embedding service
- `fs-extra` - Enhanced file system operations

### Configuration

All configuration via environment variables (`.env` file):
- `PORT` - API server port (default: 3000)
- `EMBEDDING_SERVICE_URL` - Embedding service URL (default: http://127.0.0.1:1234/v1/embeddings)
- `EMBED_MODEL` - Model name (default: text-embedding-nomic-embed-text-v1.5)
- `CHROMA_HOST` / `CHROMA_PORT` / `CHROMA_SSL` - ChromaDB connection
- `COLLECTION_NAME` - ChromaDB collection (default: internal-faq)
- `FAQS_PATH` - FAQ directory path (default: ./data/faqs)
- `CORS_ORIGIN` - CORS allowed origins (default: *)

**Path Resolution**: FAQS_PATH supports both relative (resolved from project root) and absolute paths.

### TypeScript Configuration

- Target: ES2022, Module: NodeNext (ES modules)
- Strict mode enabled with additional checks (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Outputs to `dist/` with source maps and declarations
- Uses `.js` extensions in imports for ESM compatibility

## Deployment Model

**BrainBox is designed for per-team deployment, not centralized multi-tenancy.**

### Architecture Philosophy

Each team/department should deploy their own instance rather than sharing a single centralized service:

```
Team A VM → ChromaDB → /team-a-network-drive/
Team B VM → ChromaDB → /team-b-network-drive/
Team C VM → ChromaDB → /team-c-network-drive/
```

### Benefits of This Approach

**Natural Access Control:**
- Team separation through VM/network permissions (no authentication layer needed)
- FAQ files and ChromaDB data on team-specific network drives
- Existing infrastructure ACLs provide security

**Operational Isolation:**
- Teams can upgrade/restart independently
- No shared resource contention
- Performance isolation between teams

**Simplicity:**
- No multi-tenancy code complexity
- No authentication/authorization logic required
- Each deployment is self-contained and easy to troubleshoot

### Multi-Team Adoption Path

When another team wants to use BrainBox:

1. Deploy on their VM/environment
2. Configure `.env` to point to their network drive location
3. Run their own ChromaDB instance
4. Distribute MCP configs to team members pointing to their ChromaDB endpoint

**No code changes needed** - the same codebase works for all teams through configuration.

### Access Control Model

Access control is enforced through:
- **VM access permissions** - Users must have access to the team's VM
- **Network drive ACLs** - FAQ files and ChromaDB data on protected drives
- **MCP local execution** - MCP server runs locally on each user's machine, inheriting their permissions

This eliminates the need for application-level authentication while maintaining security through existing infrastructure.

## MCP Integration

The MCP server exposes two capabilities:

**Tools** - Callable functions for FAQ operations:
- Search, ingest, embed, chunk, and list operations

**Resources** - Direct file access:
- FAQ files exposed via custom `faq:///` URI scheme
- Resources support listing (ListResourcesRequestSchema) and reading (ReadResourceRequestSchema)

Configure in Claude Desktop's MCP settings (see MCP_GUIDE.md for details).

## Notes

- This is a TypeScript ES modules project (`"type": "module"` in package.json)
- All imports must use `.js` extensions even for `.ts` files
- Embedding service must support OpenAI-compatible `/v1/embeddings` endpoint
- FAQ files are plain text (any format ChromaDB can embed)
- Chunking prevents context window overflow for large documents
