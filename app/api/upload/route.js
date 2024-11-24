import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

import PDFParser from 'pdf2json'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

  

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const modelName = formData.get('modelName')
  
  
    const llmModel = formData.get('llmModel')

    if (!file || !modelName) {
      return NextResponse.json({ error: 'File and model name are required' }, { status: 400 })
    }

    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are currently supported' }, { status: 400 })
    }

    
    
    // Create a new index for the model if it doesn't exist
    const indexName = `rag-model-${modelName.toLowerCase().replace(/\s+/g, '-')}`
    const indexList = await pinecone.listIndexes()

    // Ensure indexList is an array
    const indexListArray = Array.isArray(indexList) ? indexList : []

    if (!indexListArray.includes(indexName)) {
      await pinecone.createIndex({
        name: indexName,
        dimension: 1024,
        metric: 'cosine',
        spec: { 
            serverless: { 
              cloud: 'aws', 
              region: 'us-east-1' 
            }
          }
      })
    }

    
    
    // For PDF files, we need to use pdf-parse
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Use pdf-parse to extract text

    const pdfParser = new PDFParser()
    
    const text = await new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        const text = decodeURIComponent(pdfData.Pages.map(page => 
          page.Texts.map(text => text.R.map(r => r.T).join('')).join(' ')
        ).join('\n'))
          .replace(/[^\w\s.,!?-]/g, '') 
          .replace(/\s+/g, ' ')         
          .trim()                       
        resolve(text)
      })
      
      pdfParser.on('pdfParser_dataError', reject)
      pdfParser.parseBuffer(buffer)
    })

    
    
    
    // Create docs array with extracted text
    const docs = [{
      pageContent: text,
      metadata: {
        source: file.name || `upload-${Date.now()}`
      }
    }]

    const index = pinecone.Index(indexName)
    
    for (const doc of docs) {
      const embeddings = await pinecone.inference.embed(
        'multilingual-e5-large',
        [doc.pageContent],
        { inputType: 'passage', truncate: 'END' }
      )
      
      console.log('Raw embeddings response:', embeddings)
      
      // Extract the values array from the embedding response
      const embedding = embeddings.data?.[0]?.values || embeddings[0]?.values
      
      if (!Array.isArray(embedding)) {
        throw new Error(`Invalid embedding format: ${JSON.stringify(embeddings)}`)
      }
      
      // Truncate the text content to stay within metadata size limit (approximately 40KB)
      const truncatedText = doc.pageContent.slice(0, 15000) // Reduced to 15000 chars to be extra safe
      
      const upsertPayload = {
        id: doc.metadata.source || `doc-${Date.now()}`,
        values: embedding,
        metadata: { 
          ...doc.metadata, 
          text: truncatedText,
          isTextTruncated: truncatedText.length < doc.pageContent.length
        }
      }
      
      console.log('Upsert payload:', upsertPayload)
      
      if (!upsertPayload || !Array.isArray(upsertPayload.values)) {
        throw new Error(`Invalid upsert payload: ${JSON.stringify(upsertPayload)}`)
      }
      
      await index.upsert([upsertPayload])
    }

    // Generate API key for the model
    const apiKey = crypto.randomBytes(32).toString('hex')

    // Store model information in the database
    const model = await prisma.model.create({
      data: {
        name: modelName,
        indexName: indexName,
        apiKey: apiKey,
        llmModel: llmModel,
      },
    })

    return NextResponse.json({ 
      message: 'File uploaded and model created successfully',
      modelName: model.name,
      apiKey: model.apiKey
    })

          
    
  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}

