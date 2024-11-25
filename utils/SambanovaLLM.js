import { LLM } from "@langchain/core/language_models/llms"
import axios from 'axios'

export class SambanovaLLM extends LLM {
  constructor(config) {
    super(config)
    this.apiKey = config.apiKey
    this.temperature = config.temperature || 0.7
    this.maxTokens = config.maxTokens || 256
    this.apiUrl = 'https://api.sambanova.ai/v1/completions'
  }

  _llmType() {
    return "sambanova"
  }

  async _call(prompt, options) {
    try {
      console.log('Calling Sambanova API with prompt:', prompt)
      console.log('Request parameters:', {
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      })

      const response = await axios.post(
        this.apiUrl,
        {
          model: "Meta-Llama-3.1-8B-Instruct",
          prompt: prompt,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      )

      console.log('Sambanova API response:', JSON.stringify(response.data, null, 2))

      if (response.data && response.data.choices && Array.isArray(response.data.choices) && response.data.choices.length > 0) {
        return response.data.choices[0].text.trim()
      } else {
        console.error('Invalid response structure from Sambanova API:', response.data)
        throw new Error('Invalid response from Sambanova API')
      }
    } catch (error) {
      console.error('Error calling Sambanova API:', error.message)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
        console.error('Response headers:', error.response.headers)
      } else if (error.request) {
        console.error('No response received:', error.request)
      }
      throw new Error(`Sambanova API error: ${error.message}`)
    }
  }
}

