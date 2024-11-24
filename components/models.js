'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ModelList = () => {

  const { toast } = useToast()
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')

  

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models')
      if (response.ok) {
        const data = await response.json()
        setModels(data.models.map(model => ({
          ...model,
          llmModel: model.llmModel || 'N/A'
        })))
      } else {
        throw new Error('Failed to fetch models')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch models.",
        variant: "destructive",
      })
    }
  }

  const handleModelSelect = (modelName) => {
    setSelectedModel(modelName)
    setQuery('')
    setAnswer('')
  }

  const handleQuery = async () => {
    if (!selectedModel || !query) return

    try {
      const model = models.find(m => m.name === selectedModel)
      if (!model) throw new Error('Model not found')

      const response = await fetch(`/api/models/${model.name}/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': model.apiKey
        },
        body: JSON.stringify({ message: query }),
      })

      if (response.ok) {
        const data = await response.json()
        setAnswer(data.answer)
      } else {
        throw new Error('Failed to query model')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to query model.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model Name</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>LLM Model</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => (
            <TableRow key={model.name}>
              <TableCell>{model.name}</TableCell>
              <TableCell>{model.apiKey}</TableCell>
              <TableCell>{`/api/models/${model.name}/query`}</TableCell>
              <TableCell>{model.llmModel}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="space-y-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query"
        />
        <Button onClick={handleQuery}>Submit Query</Button>
        {answer && (
          <div className="mt-4">
            <h3 className="font-semibold">Answer:</h3>
            <p>{answer}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelList