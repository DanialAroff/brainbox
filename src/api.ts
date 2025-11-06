import express from "express";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import {
  getChromaClient,
  embedText,
  chunkText,
  COLLECTION_NAME,
  FAQS_PATH,
} from "./utils.js";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Initialize ChromaDB client
const client = getChromaClient();

app.get("/mcp/handshake", (req, res) => {
  res.json({
    mcpVersion: "1.0",
    serverName: "internal-faq-hub",
    tools: ["faq-search"],
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Search FAQ endpoint
app.post("/api/search", async (req, res) => {
  try {
    const { query, limit = 3 } = req.body;

    if (!query || typeof query !== "string") {
      return res
        .status(400)
        .json({ error: "Query parameter is required and must be a string" });
    }

    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
    });
    const embedding = await embedText(query);
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: limit,
    });

    const formattedResults =
      results.documents[0]?.map((doc, i) => ({
        document: doc,
        metadata: results.metadatas?.[0]?.[i],
        distance: results.distances?.[0]?.[i],
        id: results.ids?.[0]?.[i],
      })) || [];

    res.json({
      query,
      results: formattedResults,
      count: formattedResults.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    res
      .status(500)
      .json({
        error: "Failed to search FAQs",
        details: (error as Error).message,
      });
  }
});

// Ingest files endpoint
app.post("/api/ingest", async (req, res) => {
  try {
    const { chunkSize = 500, overlap = 50 } = req.body;

    const collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
    });
    const files = await fs.readdir(FAQS_PATH);
    const processedFiles: string[] = [];

    for (const file of files) {
      const content = await fs.readFile(path.join(FAQS_PATH, file), "utf8");
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

    res.json({
      message: "Files ingested successfully",
      filesProcessed: processedFiles,
      count: processedFiles.length,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    res
      .status(500)
      .json({
        error: "Failed to ingest files",
        details: (error as Error).message,
      });
  }
});

// Embed text endpoint
app.post("/api/embed", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ error: "Text parameter is required and must be a string" });
    }

    const embedding = await embedText(text);

    res.json({
      text,
      embedding,
      dimensions: embedding.length,
    });
  } catch (error) {
    console.error("Embed error:", error);
    res
      .status(500)
      .json({
        error: "Failed to embed text",
        details: (error as Error).message,
      });
  }
});

// Chunk text endpoint
app.post("/api/chunk", async (req, res) => {
  try {
    const { text, chunkSize = 500, overlap = 50 } = req.body;

    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ error: "Text parameter is required and must be a string" });
    }

    const chunks = chunkText(text, chunkSize, overlap);

    res.json({
      text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      chunks,
      chunkCount: chunks.length,
      chunkSize,
      overlap,
    });
  } catch (error) {
    console.error("Chunk error:", error);
    res
      .status(500)
      .json({
        error: "Failed to chunk text",
        details: (error as Error).message,
      });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 FAQ API Server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   POST /api/search          - Search FAQs`);
  console.log(`   POST /api/ingest          - Ingest FAQ files`);
  console.log(`   POST /api/embed           - Embed text`);
  console.log(`   POST /api/chunk           - Chunk text`);
  console.log();
});
