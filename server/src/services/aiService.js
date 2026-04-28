const axios = require('axios');
const logger = require('./logger');

/**
 * AI Service for Nexus Hub
 * Communicates with local Ollama instance via SSH tunnel
 */
class AIService {
  constructor() {
    this.baseUrl = 'http://localhost:11434/api';
    this.model = 'llama3.1:8b-instruct-q4_0';
  }

  /**
   * Simple chat completion
   * @param {string} prompt - The user prompt
   * @param {string} system - System instructions
   */
  async generateResponse(prompt, system = "Jsi Nexus AI, inteligentní asistent pro správu agentur.") {
    try {
      logger.info(`AI: Generování odpovědi pro prompt: "${prompt.substring(0, 50)}..."`);
      
      const response = await axios.post(`${this.baseUrl}/generate`, {
        model: this.model,
        prompt: prompt,
        system: system,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 1024
        }
      }, { timeout: 60000 });

      return response.data.response;
    } catch (error) {
      logger.error('AI Service Error:', error.message);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('AI Engine (Ollama) is not reachable. Check SSH tunnel.');
      }
      throw error;
    }
  }

  /**
   * Analyze agency performance data (Placeholder for actual feature)
   */
  async analyzeData(dataJson) {
    const prompt = `Analyzuj následující data a navrhni 3 vylepšení pro ziskovost: ${JSON.stringify(dataJson)}`;
    return this.generateResponse(prompt, "Jsi expert na business analytics.");
  }
}

module.exports = new AIService();
