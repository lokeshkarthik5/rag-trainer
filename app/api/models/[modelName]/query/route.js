import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { ChatAnthropic } from 'langchain/chat_models/anthropic'
import { prisma } from '@/lib/prisma'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
})

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
    const queryEmbedding = await index.embed(message)

    // Query the index
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    })

    // Extract the relevant documents
    const sourceDocuments = queryResponse.matches.map(match => ({
      pageContent: match.metadata.text,
      metadata: match.metadata,
    }))

    // Create Anthropic chat model
    const chatModel = new ChatAnthropic({
      modelName: model.llmModel === 'llama-3.1' ? 'claude-2' : 'claude-2.1', // Map Llama models to Claude models
      temperature: 0,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Generate response using Anthropic
    const response = await chatModel.call([
      { role: 'system', content: 'You are a helpful AI assistant. Use the provided context to answer the user\'s question.' },
      { role: 'human', content: `Context: ${sourceDocuments.map(doc => doc.pageContent).join('\n\n')}\n\nHuman: ${message}` },
    ])

    return NextResponse.json({ answer: response.content })
  } catch (error) {
    console.error('Error querying model:', error)
    return NextResponse.json({ error: 'Failed to query model' }, { status: 500 })
  }
}

