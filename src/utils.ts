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
export const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://127.0.0.1:1234/v1/embeddings";
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
  const res = await axios.post(EMBEDDING_SERVICE_URL, {
    model: EMBED_MODEL,
    input: text,
  });
  return res.data.data[0].embedding;
}

/**
 * Smart text chunking that respects sentence boundaries for better semantic coherence.
 *
 * This function splits text into chunks while preserving complete sentences, ensuring that:
 * 1. No sentence is broken mid-way (better context for embeddings)
 * 2. Chunks overlap by sharing sentences (continuity across chunks)
 * 3. Chunk sizes stay near the target size (balanced distribution)
 *
 * @param text - The text to split into chunks
 * @param targetSize - Target size for each chunk in characters (default: 500)
 * @param overlapSentences - Number of sentences to overlap between chunks (default: 1)
 * @returns Array of text chunks, each containing complete sentences
 *
 * @example
 * const text = "First sentence. Second sentence. Third sentence.";
 * const chunks = chunkTextSmart(text, 30, 1);
 * // Result: ["First sentence. Second sentence.", "Second sentence. Third sentence."]
 * // Note: Second sentence appears in both chunks (overlap)
 */
export function chunkTextSmart(
  text: string,
  targetSize = 500,
  overlapSentences = 1
): string[] {
  // Step 1: Split text into sentences using regex pattern
  // Pattern explanation:
  // - [^.!?]+ : Match one or more characters that are NOT sentence terminators
  // - [.!?]+ : Match one or more sentence terminators (., !, ?)
  // - (?:\s|$) : Match whitespace or end of string (non-capturing group)
  // This handles cases like "Dr. Smith" by requiring space or end after punctuation
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);

  // Handle edge case: if no sentences are found (e.g., text with no punctuation),
  // treat the entire text as a single sentence
  if (!sentences || sentences.length === 0) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk: string[] = []; // Array of sentences that form current chunk
  let currentSize = 0; // Character count of current chunk

  // Step 2: Iterate through each sentence and group them into chunks
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]?.trim();

    // Skip empty sentences (can happen with edge cases in regex matching)
    if (!sentence) continue;

    // Step 3: Check if adding this sentence would exceed target size
    // If yes, and we already have sentences in current chunk, save it
    if (currentSize + sentence.length > targetSize && currentChunk.length > 0) {
      // Save the current chunk by joining sentences with spaces
      chunks.push(currentChunk.join(' '));

      // Step 4: Implement overlap by keeping the last N sentences
      // This ensures context continuity between chunks
      // Example: if overlapSentences=1, the last sentence of chunk N
      // becomes the first sentence of chunk N+1
      currentChunk = currentChunk.slice(-overlapSentences);

      // Recalculate size based on retained sentences
      currentSize = currentChunk.join(' ').length + 1; // +1 for space separator
    }

    // Step 5: Add current sentence to the chunk
    currentChunk.push(sentence);
    currentSize += sentence.length + 1; // +1 for space that will be added when joining
  }

  // Step 6: Add any remaining sentences as the final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

/**
 * Legacy chunking function that splits text at fixed character positions.
 *
 * WARNING: This function may break sentences mid-way, which can reduce
 * the quality of embeddings and search precision. Consider using chunkTextSmart() instead.
 *
 * This function is kept for backward compatibility and simple use cases.
 *
 * @param text - The text to split into chunks
 * @param chunkSize - Size of each chunk in characters (default: 500)
 * @param overlap - Number of characters to overlap between chunks (default: 50)
 * @returns Array of text chunks
 */
export function chunkTextNaive(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Main chunking function that delegates to the appropriate strategy.
 *
 * By default, uses smart sentence-boundary chunking for better precision.
 * Set CHUNKING_STRATEGY=naive in environment to use legacy character-based chunking.
 *
 * @param text - The text to split into chunks
 * @param chunkSize - Target size for chunks in characters (default: 500)
 * @param overlap - For naive: character overlap. For smart: sentence overlap (default: 50 for naive, 1 for smart)
 * @returns Array of text chunks
 */
export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const strategy = process.env.CHUNKING_STRATEGY || 'smart';

  if (strategy === 'naive') {
    return chunkTextNaive(text, chunkSize, overlap);
  }

  // For smart chunking, interpret overlap as number of sentences (default: 1)
  // If user passes a large overlap value expecting character-based, cap it at 3 sentences
  const sentenceOverlap = overlap > 10 ? 1 : overlap;
  return chunkTextSmart(text, chunkSize, sentenceOverlap);
}
