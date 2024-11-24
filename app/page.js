import  FileUpload  from '@/components/file-upload'
import  ModelList  from '@/components/models'

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">RAG Model Creator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Create New Model</h2>
          <p className="text-sm text-gray-600 mb-2">
            Select an LLM model when creating a new RAG model. The selected model will be used for generating responses.
          </p>
          <FileUpload />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Existing Models</h2>
          <ModelList />
        </div>
      </div>
      
    </div>
  )
}

