import {
  makeDatabaseConnection,
  assertEnvVars,
  CORE_ENV_VARS,
  makeOpenAiEmbedFunc,
} from "chat-core";
import { makeDefaultFindContentFunc, FindContentFunc } from "chat-server";

import "dotenv/config";

async function main() {
  const topic = process.argv[3];
  if (topic === undefined) {
    console.error(`Missing argument: topic`);
    return;
  }

  const {
    MONGODB_CONNECTION_URI: connectionUri,
    MONGODB_DATABASE_NAME: databaseName,
    OPENAI_API_KEY: apiKey,
    OPENAI_EMBEDDING_MODEL_VERSION: apiVersion,
    OPENAI_EMBEDDING_DEPLOYMENT: deployment,
    OPENAI_ENDPOINT: baseUrl,
  } = assertEnvVars(CORE_ENV_VARS);

  const store = makeDatabaseConnection({
    connectionUri,
    databaseName,
  });

  const findContent = makeDefaultFindContentFunc({
    embed: makeOpenAiEmbedFunc({
      apiKey,
      apiVersion,
      baseUrl,
      deployment,
    }),
    store,
    findNearestNeighborsOptions: {
      k: 50,
    },
  });

  try {
    await unidraft({ findContent, topic });
  } finally {
    await store.close();
  }
}

main();

const unidraft = async ({
  findContent,
  topic,
}: {
  findContent: FindContentFunc;
  topic: string;
}) => {
  console.log(`Finding content related to ${topic}...`);

  const { content } = await findContent({
    query: `About ${topic}`,
    ipAddress: "::1",
  });

  console.log(`Found content: ${content.length}`);
  content.sort((a, b) => b.score - a.score);
  for (const chunk of content) {
    console.log(`${chunk.score} ${chunk.url}`);
  }
};
