import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import prisma from '@/lib/prisma' 

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

export async function DELETE(req) {
  try {
    const { modelName } = await req.json()

    if (!modelName) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      )
    }

    // 1. Delete the model from the Prisma database
    const deletedModel = await prisma.model.delete({
      where: { name: modelName },
    })

    // 2. Delete the Pinecone index (if applicable)
    const indexName = deletedModel.indexName // Assuming `indexName` is part of your model schema
    if (indexName) {
      await pinecone.deleteIndex(indexName)
    }

    return NextResponse.json(
      { message: `Model "${modelName}" deleted successfully` },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting model:', error)

    return NextResponse.json(
      { error: 'Failed to delete model', details: error.message },
      { status: 500 }
    )
  }
}
