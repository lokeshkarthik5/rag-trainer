import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { prisma } from '@/lib/prisma'
import { SambanovaLLM } from '@/utils/SambanovaLLM'
import { PromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { StringOutputParser } from "@langchain/core/output_parsers"

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

Answer: `

export async function POST(request, { params: { modelName } }) {
  try {
    const { message } = await request.json()
    const apiKey = request.headers.get('x-api-key')

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

    console.log('Query:', message)

    // Generate embeddings using Pinecone's inference API
    let embeddings
    try {
      embeddings = await pinecone.inference.embed(
        'multilingual-e5-large',
        [message],
        { inputType: 'passage', truncate: 'END' }
      )
      console.log('Raw embeddings response:', JSON.stringify(embeddings, null, 2))
    } catch (error) {
      console.error('Error generating embeddings:', error)
      return NextResponse.json({ error: 'Failed to generate embeddings', details: error.message }, { status: 500 })
    }

    // Validate and extract embeddings
    if (!embeddings || !embeddings.data || !Array.isArray(embeddings.data) || embeddings.data.length === 0) {
      console.error('Invalid embeddings format:', embeddings)
      return NextResponse.json({ error: 'Invalid embeddings format', details: JSON.stringify(embeddings) }, { status: 500 })
    }

    const embeddingVector = embeddings.data[0].values
    if (!Array.isArray(embeddingVector) || embeddingVector.length === 0) {
      console.error('Invalid embedding vector:', embeddingVector)
      return NextResponse.json({ error: 'Invalid embedding vector', details: JSON.stringify(embeddingVector) }, { status: 500 })
    }

    console.log('Valid embedding vector generated')

    // Query the index with the generated embedding
    let queryResponse
    try {
      queryResponse = await index.query({
        vector: embeddingVector,
        topK: 3,
        includeMetadata: true,
      })
      console.log('Pinecone query response:', JSON.stringify(queryResponse, null, 2))
    } catch (error) {
      console.error('Error querying Pinecone:', error)
      return NextResponse.json({ error: 'Failed to query Pinecone index', details: error.message }, { status: 500 })
    }

    if (!queryResponse.matches || !Array.isArray(queryResponse.matches) || queryResponse.matches.length === 0) {
      return NextResponse.json({ error: 'No matching documents found' }, { status: 404 })
    }

    // Extract the relevant documents
    const sourceDocuments = queryResponse.matches.map(match => ({
      pageContent: match.metadata.text || '',
      metadata: match.metadata || {},
    }))

    const llmModel = new SambanovaLLM({
      apiKey: process.env.SAMBA_API,
      temperature: 0.1,
      maxTokens: 2000
    })

    const prompt = PromptTemplate.fromTemplate(RESPONSE_SYSTEM_TEMPLATE)

    const chain = RunnableSequence.from([
      {
        context: (input) => input.context.map(doc => doc.pageContent).join('\n\n'),
        question: (input) => input.question,
      },
      prompt,
      llmModel,
      new StringOutputParser(),
    ])

    let response
    try {
      response = await chain.invoke({
        context: sourceDocuments,
        question: message,
      })
    } catch (error) {
      console.error('Error invoking LLM chain:', error)
      return NextResponse.json({ error: 'Failed to generate response', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      answer: response,
      sourceDocuments: sourceDocuments
    })

  } catch (error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({ 
      error: 'Failed to query model',
      details: error.message 
    }, { status: 500 })
  }
}

