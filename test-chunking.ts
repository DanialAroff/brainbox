/**
 * Test script to demonstrate the difference between naive and smart chunking
 * Run with: npx tsx test-chunking.ts
 */

import { chunkTextSmart, chunkTextNaive } from "./src/utils.js";

// Sample FAQ text with clear sentence boundaries
const sampleFAQ = `Question: What is our PTO policy?

Answer: Full-time employees receive 15 days of paid time off per year. Part-time employees receive prorated PTO based on hours worked. PTO must be requested at least 2 weeks in advance through the HR portal. Unused PTO does not roll over to the next calendar year.

Question: How do I request medical leave?

Answer: Medical leave requires documentation from your healthcare provider. Submit Form ML-100 to HR at least 5 days before your requested leave date. Short-term disability may be available for leaves exceeding 2 weeks.`;

console.log("=" .repeat(80));
console.log("CHUNKING COMPARISON TEST");
console.log("=".repeat(80));
console.log();

// Test 1: Naive Chunking (character-based, may break sentences)
console.log("📄 NAIVE CHUNKING (Character-based)");
console.log("-".repeat(80));
const naiveChunks = chunkTextNaive(sampleFAQ, 200, 30);
naiveChunks.forEach((chunk, i) => {
  console.log(`\nChunk ${i + 1} (${chunk.length} chars):`);
  console.log(`"${chunk}"`);

  // Highlight if chunk starts or ends mid-sentence
  const startsWithLowercase = /^[a-z]/.test(chunk.trim());
  const endsWithoutPunctuation = !/[.!?]$/.test(chunk.trim());

  if (startsWithLowercase) {
    console.log("⚠️  WARNING: Chunk starts mid-sentence!");
  }
  if (endsWithoutPunctuation) {
    console.log("⚠️  WARNING: Chunk ends mid-sentence!");
  }
});

console.log("\n" + "=".repeat(80));
console.log();

// Test 2: Smart Chunking (sentence-boundary)
console.log("🧠 SMART CHUNKING (Sentence-boundary)");
console.log("-".repeat(80));
const smartChunks = chunkTextSmart(sampleFAQ, 200, 1);
smartChunks.forEach((chunk, i) => {
  console.log(`\nChunk ${i + 1} (${chunk.length} chars):`);
  console.log(`"${chunk}"`);

  // Verify chunk integrity
  const startsWithLowercase = /^[a-z]/.test(chunk.trim());
  const endsWithoutPunctuation = !/[.!?]$/.test(chunk.trim());

  if (!startsWithLowercase && !endsWithoutPunctuation) {
    console.log("✅ Clean sentence boundaries");
  }
});

console.log("\n" + "=".repeat(80));
console.log();

// Test 3: Compare statistics
console.log("📊 STATISTICS COMPARISON");
console.log("-".repeat(80));
console.log(`Original text length: ${sampleFAQ.length} characters`);
console.log();
console.log(`Naive chunking:`);
console.log(`  - Total chunks: ${naiveChunks.length}`);
console.log(`  - Avg chunk size: ${Math.round(naiveChunks.reduce((sum, c) => sum + c.length, 0) / naiveChunks.length)} chars`);

// Count broken sentences in naive chunking
let brokenSentences = 0;
naiveChunks.forEach(chunk => {
  const startsWithLowercase = /^[a-z]/.test(chunk.trim());
  const endsWithoutPunctuation = !/[.!?]$/.test(chunk.trim());
  if (startsWithLowercase || endsWithoutPunctuation) brokenSentences++;
});
console.log(`  - Broken chunks: ${brokenSentences} (${Math.round(brokenSentences / naiveChunks.length * 100)}%)`);

console.log();
console.log(`Smart chunking:`);
console.log(`  - Total chunks: ${smartChunks.length}`);
console.log(`  - Avg chunk size: ${Math.round(smartChunks.reduce((sum, c) => sum + c.length, 0) / smartChunks.length)} chars`);

// Count broken sentences in smart chunking (should be 0)
brokenSentences = 0;
smartChunks.forEach(chunk => {
  const startsWithLowercase = /^[a-z]/.test(chunk.trim());
  const endsWithoutPunctuation = !/[.!?]$/.test(chunk.trim());
  if (startsWithLowercase || endsWithoutPunctuation) brokenSentences++;
});
console.log(`  - Broken chunks: ${brokenSentences} (${Math.round(brokenSentences / smartChunks.length * 100)}%)`);

console.log();
console.log("=" .repeat(80));
console.log("✅ Test complete!");
console.log("=".repeat(80));
