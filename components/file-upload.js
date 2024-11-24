'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function FileUpload() {

    const { toast } = useToast()
  const [file, setFile] = useState(null)
  const [modelName, setModelName] = useState('')
  const [selectedLlm, setSelectedLlm] = useState('llama-3.1')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !modelName) {
      toast({
        title: "Error",
        description: "Please select a file and enter a model name.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('modelName', modelName)
    formData.append('llmModel', selectedLlm)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "File uploaded and model created successfully.",
        })
        router.refresh()
      } else {
        throw new Error('File upload failed')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file and create model.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div>
        <Label htmlFor="file">Upload File</Label>
        <Input
          id="file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
      </div>
      <div>
        <Label htmlFor="llmModel">LLM Model</Label>
        <select
          id="llmModel"
          value={selectedLlm}
          onChange={(e) => setSelectedLlm(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="llama-3.1">Llama 3.1</option>
          <option value="llama-3.2">Llama 3.2</option>
        </select>
      </div>
      <Button type="submit">Upload and Create Model</Button>
    </form>
  )
}

