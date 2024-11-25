import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import PDFParser from 'pdf2json'
import * as cheerio from 'cheerio';
import axios from 'axios'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const url = formData.get('url')
    const modelName = formData.get('modelName')
    const llmModel = formData.get('llmModel')
    const ingestionType = formData.get('ingestionType') // 'pdf' or 'url'

    // Validate input
    if ((!file && !url) || !modelName) {
      return NextResponse.json({ 
        error: 'File or URL, and model name are required' 
      }, { status: 400 })
    }

    // Create a new index for the model
    const indexName = `rag-model-${modelName.toLowerCase().replace(/\s+/g, '-')}`
    const indexList = await pinecone.listIndexes()
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

    // Extract text based on ingestion type
    let docs = [];
    if (ingestionType === 'pdf') {
      // PDF processing
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ 
          error: 'Only PDF files are currently supported' 
        }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

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

      docs = [{
        pageContent: text,
        metadata: {
          source: file.name || `upload-${Date.now()}`
        }
      }]
    } else if (ingestionType === 'url') {
      // URL processing
      if (!url) {
        return NextResponse.json({ 
          error: 'URL is required for URL ingestion' 
        }, { status: 400 });
      }
    
      try {
        // Validate URL format
        new URL(url);
    
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    
        // Ensure content is HTML
        if (!response.headers['content-type'].includes('text/html')) {
          return NextResponse.json({ 
            error: 'URL does not return valid HTML content' 
          }, { status: 400 });
        }
    
        const $ = cheerio.load(response.data);
    
        // Remove script, style, and other non-content tags
        $('script, style, nav, footer, header').remove();
    
        // Extract main text content
        const text = $('body').text()
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s.,!?-]/g, '')
          .trim();
    
        if (!text || text.length === 0) {
          return NextResponse.json({ 
            error: 'No content extracted from the URL' 
          }, { status: 400 });
        }
    
        docs = [{
          pageContent: text,
          metadata: { source: url }
        }];
      } catch (error) {
        console.error('Error fetching or parsing URL:', error.message);
        return NextResponse.json({ 
          error: 'Failed to fetch or parse URL', 
          details: error.message 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid ingestion type. Must be "pdf" or "url"' 
      }, { status: 400 });
    }
    

    // Embedding and indexing
    const index = pinecone.Index(indexName)
    
    for (const doc of docs) {
      const embeddings = await pinecone.inference.embed(
        'multilingual-e5-large',
        [doc.pageContent],
        { inputType: 'passage', truncate: 'END' }
      )
      
      const embedding = embeddings.data?.[0]?.values || embeddings[0]?.values
      
      if (!Array.isArray(embedding)) {
        throw new Error(`Invalid embedding format: ${JSON.stringify(embeddings)}`)
      }
      
      // Truncate text to stay within metadata size limit
      const truncatedText = doc.pageContent.slice(0, 15000)
      
      const upsertPayload = {
        id: doc.metadata.source || `doc-${Date.now()}`,
        values: embedding,
        metadata: { 
          ...doc.metadata, 
          text: truncatedText,
          isTextTruncated: truncatedText.length < doc.pageContent.length
        }
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
      message: 'Document uploaded and model created successfully',
      modelName: model.name,
      apiKey: model.apiKey
    })
          
  } catch (error) {
    console.error('Error processing document:', error)
    return NextResponse.json({ 
      error: 'Failed to process document', 
      details: error.message 
    }, { status: 500 })
  }
}