'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
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

  const deleteModel = async (modelName) => {
    try {
      const response = await fetch(`/api/deletion`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelName }),
      })
  
      if (response.ok) {
        setModels(models.filter((model) => model.name !== modelName))
        toast({
          title: "Success",
          description: `Model "${modelName}" has been deleted.`,
        })
      } else {
        throw new Error('Failed to delete model')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete model "${modelName}".`,
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
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => (
            <TableRow key={model.name}>
              <TableCell>{model.name}</TableCell>
              <TableCell>{model.apiKey}</TableCell>
              <TableCell>{`/api/models/${model.name}/query`}</TableCell>
              <TableCell>{model.llmModel}</TableCell>
              <TableCell>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteModel(model.name)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default ModelList
