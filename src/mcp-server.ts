#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs-extra";
import path from "path";
import {
  getChromaClient,
  embedText,
  chunkText,
  COLLECTION_NAME,
  FAQS_PATH,
} from "./utils.js";

// Initialize ChromaDB client
const client = getChromaClient();

// Create MCP server
const server = new Server(
  {
    name: "internal-faq-hub",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_faqs",
        description:
          "Search the internal FAQ database using semantic search. Returns the most relevant FAQ entries based on the query.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query or question to find relevant FAQs for",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 3)",
              default: 3,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "ingest_faqs",
        description:
          "Process and ingest FAQ files from the configured directory into the vector database. This will read all FAQ files, chunk them, create embeddings, and store them.",
        inputSchema: {
          type: "object",
          properties: {
            chunkSize: {
              type: "number",
              description: "Size of text chunks in characters (default: 500)",
              default: 500,
            },
            overlap: {
              type: "number",
              description: "Overlap between chunks in characters (default: 50)",
              default: 50,
            },
          },
        },
      },
      {
        name: "embed_text",
        description:
          "Generate vector embeddings for a given text using the configured embedding model. Returns the embedding vector.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text to generate embeddings for",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "chunk_text",
        description:
          "Split a large text into smaller chunks with optional overlap. Useful for processing long documents before embedding.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text to split into chunks",
            },
            chunkSize: {
              type: "number",
              description: "Size of each chunk in characters (default: 500)",
              default: 500,
            },
            overlap: {
              type: "number",
              description: "Overlap between chunks in characters (default: 50)",
              default: 50,
            },
          },
          required: ["text"],
        },
      },
      {
        name: "list_faq_files",
        description: "List all available FAQ files in the configured directory",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_faqs": {
        const query = args?.query as string;
        const limit = (args?.limit as number) || 3;

        if (!query) {
          throw new Error("Query parameter is required");
        }

        const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });
        const embedding = await embedText(query);
        const results = await collection.query({
          queryEmbeddings: [embedding],
          nResults: limit,
        });

        const formattedResults = results.documents[0]?.map((doc, i) => ({
          document: doc,
          metadata: results.metadatas?.[0]?.[i],
          distance: results.distances?.[0]?.[i],
          id: results.ids?.[0]?.[i],
        })) || [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  results: formattedResults,
                  count: formattedResults.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "ingest_faqs": {
        const chunkSize = (args?.chunkSize as number) || 500;
        const overlap = (args?.overlap as number) || 50;

        const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });
        const files = await fs.readdir(FAQS_PATH);
        const processedFiles: string[] = [];

        for (const file of files) {
          const filePath = path.join(FAQS_PATH, file);
          const stats = await fs.stat(filePath);

          // Skip directories
          if (!stats.isFile()) continue;

          const content = await fs.readFile(filePath, "utf8");
          const chunks = chunkText(content, chunkSize, overlap);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (chunk) {
              const emb = await embedText(chunk);
              await collection.add({
                ids: [`${file}-${i}`],
                embeddings: [emb],
                documents: [chunk],
                metadatas: [{ file }],
              });
            }
          }
          processedFiles.push(file);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Files ingested successfully",
                  filesProcessed: processedFiles,
                  count: processedFiles.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "embed_text": {
        const text = args?.text as string;

        if (!text) {
          throw new Error("Text parameter is required");
        }

        const embedding = await embedText(text);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
                  embedding,
                  dimensions: embedding.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "chunk_text": {
        const text = args?.text as string;
        const chunkSize = (args?.chunkSize as number) || 500;
        const overlap = (args?.overlap as number) || 50;

        if (!text) {
          throw new Error("Text parameter is required");
        }

        const chunks = chunkText(text, chunkSize, overlap);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  originalLength: text.length,
                  chunks,
                  chunkCount: chunks.length,
                  chunkSize,
                  overlap,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_faq_files": {
        const files = await fs.readdir(FAQS_PATH);
        const fileDetails = [];

        for (const file of files) {
          const filePath = path.join(FAQS_PATH, file);
          const stats = await fs.stat(filePath);

          if (stats.isFile()) {
            fileDetails.push({
              name: file,
              size: stats.size,
              modified: stats.mtime,
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  files: fileDetails,
                  count: fileDetails.length,
                  path: FAQS_PATH,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "Tool execution failed",
              details: (error as Error).message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// List available resources (FAQ files)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const files = await fs.readdir(FAQS_PATH);
    const resources = [];

    for (const file of files) {
      const filePath = path.join(FAQS_PATH, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        resources.push({
          uri: `faq:///${file}`,
          mimeType: "text/plain",
          name: file,
          description: `FAQ document: ${file}`,
        });
      }
    }

    return { resources };
  } catch (error) {
    console.error("Error listing resources:", error);
    return { resources: [] };
  }
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (!uri.startsWith("faq:///")) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const fileName = uri.replace("faq:///", "");
  const filePath = path.join(FAQS_PATH, fileName);

  try {
    const content = await fs.readFile(filePath, "utf8");

    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: content,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to read resource: ${(error as Error).message}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Internal FAQ Hub MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
