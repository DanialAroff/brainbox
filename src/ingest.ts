import fs from "fs-extra";
import path from "path";
import {
  getChromaClient,
  embedText,
  chunkText,
  COLLECTION_NAME,
  FAQS_PATH,
} from "./utils.js";

const client = getChromaClient();
// await client.deleteCollection({ name: COLLECTION_NAME });
const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

async function processFiles() {
  const files = await fs.readdir(FAQS_PATH);
  for (const file of files) {
    const content = await fs.readFile(path.join(FAQS_PATH, file), "utf8");
    const chunks = chunkText(content);

    console.log(`📄 Processing ${file} (${chunks.length} chunks)...`);

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
        console.log(`✅ Embedded ${file} chunk ${i + 1}/${chunks.length}`);
      } else {
      }
    }
  }

  console.log("\n🎉 All FAQ documents embedded and stored successfully!");
}

processFiles();
