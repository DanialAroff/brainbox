# MCP Server Setup Guide

This guide explains how to set up and use the Internal FAQ Hub as an MCP (Model Context Protocol) server.

## What is MCP?

The Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to LLMs. This allows AI assistants like Claude to access your FAQ database directly through standardized tools and resources.

## Features

The Internal FAQ Hub MCP server provides:

### Tools
- **search_faqs** - Search the FAQ database using semantic search
- **ingest_faqs** - Process and ingest FAQ files into the vector database
- **embed_text** - Generate embeddings for text
- **chunk_text** - Split text into chunks for processing
- **list_faq_files** - List all available FAQ files

### Resources
- Access to individual FAQ files via `faq:///filename.txt` URIs
- Browse and read FAQ documents directly

## Setup

### 1. Prerequisites

Make sure you have:
- Node.js 18+ installed
- ChromaDB running (see gettingstarted.md)
- LM Studio with embedding model loaded
- FAQ files in the configured directory

### 2. Build the MCP Server

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist` folder.

### 3. Configure Environment

Create or update `.env` file:

```env
LMSTUDIO_URL=http://127.0.0.1:1234/v1/embeddings
EMBED_MODEL=text-embedding-nomic-embed-text-v1.5
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_SSL=false
COLLECTION_NAME=internal-faq
FAQS_PATH=./data/faqs
```

For shared storage setup:
```env
CHROMA_HOST=localhost
CHROMA_PORT=8000
FAQS_PATH=\\\\shared-server\\faq-files
```

### 4. Test the MCP Server

Run the server directly to test:

```bash
npm run mcp
```

You should see: "Internal FAQ Hub MCP server running on stdio"

Press `Ctrl+C` to stop.

## Integration with Claude Desktop

### Option 1: Using the Configuration File

1. Open your Claude Desktop configuration file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the internal-faq-hub server:

```json
{
  "mcpServers": {
    "internal-faq-hub": {
      "command": "node",
      "args": ["D:/Programming/internal-faq-hub/dist/mcp-server.js"],
      "env": {
        "LMSTUDIO_URL": "http://127.0.0.1:1234/v1/embeddings",
        "EMBED_MODEL": "text-embedding-nomic-embed-text-v1.5",
        "CHROMA_HOST": "localhost",
        "CHROMA_PORT": "8000",
        "CHROMA_SSL": "false",
        "COLLECTION_NAME": "internal-faq",
        "FAQS_PATH": "D:/Programming/internal-faq-hub/data/faqs"
      }
    }
  }
}
```

**Important**:
- Use absolute paths for `args` and `FAQS_PATH`
- Use forward slashes (/) even on Windows
- Restart Claude Desktop after making changes

### Option 2: Using NPX (Simpler)

```json
{
  "mcpServers": {
    "internal-faq-hub": {
      "command": "npx",
      "args": ["-y", "tsx", "D:/Programming/internal-faq-hub/src/mcp-server.ts"]
    }
  }
}
```

This method doesn't require building first.

## Usage in Claude Desktop

Once configured and Claude Desktop is restarted:

### Using Tools

1. **Search FAQs**:
   ```
   Use the search_faqs tool to find information about [your question]
   ```

2. **List FAQ Files**:
   ```
   Use the list_faq_files tool to see what FAQ documents are available
   ```

3. **Ingest New FAQs**:
   ```
   Use the ingest_faqs tool to process and add new FAQ files to the database
   ```

### Using Resources

1. **View FAQ File**:
   ```
   Read the resource faq:///authentication.txt
   ```

2. **Browse Available Resources**:
   Claude will automatically see all available FAQ files as resources.

## Distribution to Team

### Method 1: Shared Network Path

If your team has access to the same network share:

1. Place the project on shared storage:
   ```
   \\shared-server\tools\internal-faq-hub\
   ```

2. Share this configuration with your team:
   ```json
   {
     "mcpServers": {
       "internal-faq-hub": {
         "command": "node",
         "args": ["//shared-server/tools/internal-faq-hub/dist/mcp-server.js"],
         "env": {
           "CHROMA_HOST": "chromadb-server",
           "CHROMA_PORT": "8000",
           "FAQS_PATH": "//shared-server/faq-files"
         }
       }
     }
   }
   ```

### Method 2: Local Installation

Each team member installs locally:

1. Clone/copy the project to their machine
2. Run `npm install`
3. Run `npm run build`
4. Configure their Claude Desktop with the local path

### Method 3: Package as Executable

Create a standalone executable:

```bash
npm install -g @yao-pkg/pkg
npm run build
pkg dist/mcp-server.js --target node20-win-x64 --output faq-hub-mcp.exe
```

Then share `faq-hub-mcp.exe` with your team.

Configuration becomes:
```json
{
  "mcpServers": {
    "internal-faq-hub": {
      "command": "C:/tools/faq-hub-mcp.exe"
    }
  }
}
```

## Troubleshooting

### Server Not Appearing in Claude

1. Check Claude Desktop logs:
   - Windows: `%APPDATA%\Claude\logs`
   - macOS: `~/Library/Logs/Claude`
   - Linux: `~/.config/Claude/logs`

2. Verify paths are absolute and correct
3. Ensure Node.js is in PATH
4. Test server manually: `npm run mcp`

### "Cannot find module" Errors

1. Ensure you've built the project: `npm run build`
2. Check that `dist/mcp-server.js` exists
3. Verify all dependencies are installed: `npm install`

### ChromaDB Connection Failed

1. Verify ChromaDB is running:
   ```bash
   curl http://localhost:8000/api/v1/heartbeat
   ```

2. Check environment variables in config
3. Ensure no firewall blocking port 8000

### Embedding Service Errors

1. Verify LM Studio is running
2. Check embedding model is loaded
3. Test endpoint:
   ```bash
   curl http://127.0.0.1:1234/v1/models
   ```

### FAQ Files Not Found

1. Verify `FAQS_PATH` is correct
2. Use absolute paths in production
3. Check file permissions
4. Ensure network share is accessible

## Advanced Configuration

### Multiple Collections

You can run multiple instances for different FAQ collections:

```json
{
  "mcpServers": {
    "company-faqs": {
      "command": "node",
      "args": ["D:/path/to/mcp-server.js"],
      "env": {
        "COLLECTION_NAME": "company-faqs",
        "FAQS_PATH": "D:/faqs/company"
      }
    },
    "product-faqs": {
      "command": "node",
      "args": ["D:/path/to/mcp-server.js"],
      "env": {
        "COLLECTION_NAME": "product-faqs",
        "FAQS_PATH": "D:/faqs/products"
      }
    }
  }
}
```

### Remote ChromaDB

For team-wide access to a shared ChromaDB instance:

```json
{
  "env": {
    "CHROMA_HOST": "chromadb.company.local",
    "CHROMA_PORT": "8000",
    "CHROMA_SSL": "true"
  }
}
```

### Authentication

If you've secured ChromaDB with authentication:

```json
{
  "env": {
    "CHROMA_AUTH_TOKEN": "your-auth-token-here"
  }
}
```

Note: You'll need to update `utils.ts` to support ChromaDB authentication.

## Example Workflows

### Initial Setup for Team

1. Set up ChromaDB on shared server
2. Place FAQ files on shared storage
3. One person runs ingest to populate database
4. Share MCP configuration with team
5. Team members add configuration to Claude Desktop

### Daily Usage

Team members can:
- Ask Claude questions about FAQs
- Claude automatically searches the FAQ database
- Get accurate, sourced answers from company documentation
- No need to manually search through files

### Updating FAQs

When FAQ files are updated:
1. Save new files to shared storage
2. Ask Claude: "Use ingest_faqs to update the database"
3. All team members automatically get updated information

## Security Considerations

1. **Network Security**: If using shared ChromaDB, ensure it's only accessible on internal network
2. **File Permissions**: Set appropriate read permissions on shared FAQ files
3. **API Access**: Consider adding authentication if exposing ChromaDB externally
4. **Data Privacy**: Ensure FAQ content is appropriate for AI model access

## Performance Tips

1. **Chunk Size**: Adjust `chunkSize` and `overlap` based on your FAQ content length
2. **Search Limit**: Use appropriate `limit` parameter (default: 3)
3. **Caching**: ChromaDB handles caching internally
4. **Batch Ingestion**: Ingest all files at once rather than one by one

## Next Steps

- Set up automatic FAQ sync from your documentation system
- Create a web interface for team members without Claude Desktop
- Monitor usage and search patterns
- Expand to other document types beyond FAQs

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review MCP protocol documentation at [modelcontextprotocol.io](https://modelcontextprotocol.io)
3. Contact your internal IT team for network/server issues
