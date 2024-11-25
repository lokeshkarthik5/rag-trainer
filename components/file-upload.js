'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

const FileUpload = () => {
  const { toast } = useToast()
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [modelName, setModelName] = useState('')
  const [selectedLlm, setSelectedLlm] = useState('llama-3.1')
  const [ingestionType, setIngestionType] = useState('pdf')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!modelName) {
      toast({
        title: "Error",
        description: "Please enter a model name.",
        variant: "destructive",
      })
      return
    }

    // Validate input based on ingestion type
    if (ingestionType === 'pdf' && !file) {
      toast({
        title: "Error",
        description: "Please select a PDF file.",
        variant: "destructive",
      })
      return
    }

    if (ingestionType === 'url' && !url) {
      toast({
        title: "Error",
        description: "Please enter a URL.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append('modelName', modelName)
    formData.append('llmModel', selectedLlm)
    formData.append('ingestionType', ingestionType)

    // Append either file or URL based on ingestion type
    if (ingestionType === 'pdf' && file) {
      formData.append('file', file)
    } else if (ingestionType === 'url') {
      formData.append('url', url)
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document uploaded and model created successfully.",
        })
        router.refresh()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Document upload failed')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document and create model.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Ingestion Type</Label>
        <Select 
          value={ingestionType} 
          onValueChange={setIngestionType}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select ingestion type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF File</SelectItem>
            <SelectItem value="url">Web URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="modelName">Model Name</Label>
        <Input
          id="modelName"
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="Enter model name"
          required
        />
      </div>

      {ingestionType === 'pdf' ? (
        <div>
          <Label htmlFor="file">Upload PDF</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>
      ) : (
        <div>
          <Label htmlFor="url">Web URL</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to extract content"
            required
          />
        </div>
      )}

      <Button type="submit">Upload and Create Model</Button>
    </form>
  )
}

export default FileUpload