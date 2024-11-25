import { LLM } from "langchain/llms/base";
import axios from "axios";

export class SambanovaLLM extends LLM {
  constructor({ apiKey, temperature = 0.7, maxTokens }) {
    super();
    this.apiKey = apiKey;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  _llmType() {
    return "sambanova";
  }

  async _call(prompt) {
    try {
      const payload = {
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: this.temperature,
        ...(this.maxTokens && { max_tokens: this.maxTokens })
      };

      const response = await axios.post(
        'https://api.sambanova.ai/v1/chat/completions',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('SambaNova API Error:', error);
      throw new Error(`Error calling SambaNova API: ${error.message}`);
    }
  }
}