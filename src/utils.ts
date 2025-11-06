import axios from "axios";
import { ChromaClient } from "chromadb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment variables with defaults
export const LMSTUDIO_URL = process.env.LMSTUDIO_URL || "http://127.0.0.1:1234/v1/embeddings";
export const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-nomic-embed-text-v1.5";
export const CHROMA_HOST = process.env.CHROMA_HOST || "localhost";
export const CHROMA_PORT = parseInt(process.env.CHROMA_PORT || "8000", 10);
export const CHROMA_SSL = process.env.CHROMA_SSL === "true";
export const COLLECTION_NAME = process.env.COLLECTION_NAME || "internal-faq";
export const FAQS_PATH = process.env.FAQS_PATH
  ? path.isAbsolute(process.env.FAQS_PATH)
    ? process.env.FAQS_PATH
    : path.join(__dirname, "..", process.env.FAQS_PATH)
  : path.join(__dirname, "..", "data", "faqs");

export function getChromaClient() {
  return new ChromaClient({ ssl: CHROMA_SSL, host: CHROMA_HOST, port: CHROMA_PORT });
}

export async function embedText(text: string): Promise<number[]> {
  const res = await axios.post(LMSTUDIO_URL, {
    model: EMBED_MODEL,
    input: text,
  });
  return res.data.data[0].embedding;
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
