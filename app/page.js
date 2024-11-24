import { FileUpload } from '@/components/file-upload'
import { ModelList } from '@/components/models'

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
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Setup Instructions</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Install dependencies: <code>npm install</code></li>
          <li>Set up your PostgreSQL database and update the <code>DATABASE_URL</code> in your <code>.env</code> file</li>
          <li>Run Prisma migrations: <code>npx prisma migrate dev</code></li>
          <li>Start the development server: <code>npm run dev</code></li>
        </ol>
      </div>
    </div>
  )
}

