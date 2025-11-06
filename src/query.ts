import readline from "readline";
import { getChromaClient, embedText, COLLECTION_NAME } from "./utils.js";

const client = getChromaClient();
const collection = await client.getOrCreateCollection({
  name: COLLECTION_NAME,
});

async function searchFAQ(query: string, limit = 3) {
  const embedding = await embedText(query);
  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: limit,
  });
  console.log(results.distances);
  console.log(`\n🔍 Query: ${query}`);
  console.log("Top relevant results:\n");
  
  results.documents[0]?.forEach((doc, i) => {
    const meta = results.metadatas?.[0]?.[i];
    console.log(`${i + 1}. (${meta?.file})\n${doc?.slice(0, 300)}...\n`);
  });
}

// --- Simple CLI prompt ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("❓ Ask a question about your FAQs: ", async (question) => {
  await searchFAQ(question);
  rl.close();
});
