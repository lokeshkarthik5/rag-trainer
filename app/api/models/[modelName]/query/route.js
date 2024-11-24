import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
})

const url = 'https://api.sambanova.ai/v1/chat/completions';


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


    const payload = {
        stream: false, // Change to true if you want streaming responses
        model: modelName,
        messages: [
            {
                role: 'system',
                content: 'You are a helpful AI assistant. Use the provided context to answer the user\'s question.'
            },
            {
                role: 'user',
                content: `Context: ${sourceDocuments.map(doc => doc.pageContent).join('\n\n')}\n\nHuman: ${message}`
            }
        ]
    };

    const response = await axios.post('https://api.sambanova.ai/v1/chat/completions', payload, {
      headers: {
          'Authorization': `Bearer ${process.env.SAMBA_API}`,
          'Content-Type': 'application/json'
        }
      })
    return NextResponse.json({ answer: response.content })
  } catch (error) {
    console.error('Error querying model:', error)
    return NextResponse.json({ error: 'Failed to query model' }, { status: 500 })
  }
}

