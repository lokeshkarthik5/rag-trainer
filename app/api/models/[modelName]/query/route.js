import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { prisma } from '@/lib/prisma'
import axios from 'axios'
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { SambanovaLLM } from '@/utils/SambanovaLLM';


const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  
})
const RESPONSE_SYSTEM_TEMPLATE = `You are a helpful AI assistant. Your task is to answer questions based on the provided context.
Follow these guidelines:
- If the answer is in the context, provide it clearly and concisely
- If the answer isn't in the context, say so politely
- Use specific references from the documents when possible
- Maintain a professional and helpful tone

Context:
{context}

Question: {question}

Answer: `;

// Create the main retrieval chain function
async function createCustomRetrievalChain(llm, vectorStore) {
  // Create the prompt template for combining documents
  const prompt = PromptTemplate.fromTemplate(RESPONSE_SYSTEM_TEMPLATE);

  // Create a chain for combining documents with the prompt
  const documentChain = await createStuffDocumentsChain({
    llm,
    prompt,
    documentPrompt: PromptTemplate.fromTemplate("{pageContent}"),
  });

  // Create the retrieval chain
  return await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever: vectorStore.asRetriever({
      searchKwargs: { k: 3 },
      callbacks: [{
        handleRetrieval: (documents) => {
          console.log(`Retrieved ${documents.length} documents`);
        }
      }]
    }),
  });
}


export async function POST(request, { params }) {
  try {
    const { message } = await request.json()
    const apiKey = request.headers.get('x-api-key')
    const modelName = params.modelName

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Validate API key
    const model = await prisma.model.findUnique({
      where: { name: modelName },
    })

    if (!model || model.apiKey !== apiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const index = pinecone.Index(model.indexName)

    // Create embedding for the query
    const queryEmbedding = await pinecone.inference.embed(
      'multilingual-e5-large',
      [message],
      { inputType: 'passage', truncate: 'END' }
    )

    const vectorStore = await PineconeStore.fromExistingIndex(queryEmbedding, {
      index,
      // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
      maxConcurrency: 5,
      // You can pass a namespace here too
      // namespace: "foo",
    });

    const llmModel = new SambanovaLLM({
      apiKey: process.env.SAMBA_API,
      temperature: temperature,
      maxTokens: 2000
    });
    // Query the index
    const chain = await createCustomRetrievalChain(model, vectorStore);

    // Get response
    const response = await chain.invoke({
      input: query
    });

    // Extract source documents if available
    const sourceDocuments = response.context?.map(doc => ({
      pageContent: doc.pageContent,
      metadata: doc.metadata
    })) || [];

    return NextResponse.json({
      answer: response.answer,
      sources: sourceDocuments
    });



  } catch (error) {
    console.error('Error querying model:', error)
    return NextResponse.json({ error: 'Failed to query model' }, { status: 500 })
  }
}

