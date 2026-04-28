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
      const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      logger.error(`AI Service Error: ${errorMsg}`);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('AI Engine (Ollama) is not reachable. Check SSH tunnel.');
      }
      throw error;
    }
  }

  /**
   * Suggest a reply based on chat history
   * @param {Array} messages - Array of { role, content } messages
   * @param {string} profileContext - Context about the persona/profile
   */
  async suggestReply(messages, profileContext = "", styleExamples = []) {
    try {
      logger.info(`AI: Generování návrhu odpovědi pro chat (${messages.length} zpráv)`);
      
      let styleSection = "";
      if (styleExamples.length > 0) {
        styleSection = `
          Tady jsou příklady stylu, jakým tato modelka píše:
          ${styleExamples.map(s => `- ${s}`).join('\n')}
          
          PIŠ PŘESNĚ TÍMTO STYLEM (používej stejné smajlíky, tón, délku zpráv).
        `;
      }

      const system = `
        Jsi Nexus AI, špičkový asistent pro OnlyFans chatting. 
        Tvým úkolem je zastupovat modelku a psát PŘESNĚ jejím jménem a stylem. 
        I když za klávesnicí sedí operátor, tvé návrhy musí znít, jako by je psala sama modelka.
        Kontext profilu: ${profileContext}
        ${styleSection}
        Tvé odpovědi jsou flirtující, přirozené, stručné a zaměřené na budování vztahu a prodej obsahu.
        Odpovídej POUZE samotným textem zprávy, který může operátor ihned odeslat.
      `;

      const response = await axios.post(`${this.baseUrl}/chat`, {
        model: this.model,
        messages: [
          { role: 'system', content: system },
          ...messages
        ],
        stream: false,
        options: {
          temperature: 0.8,
          num_predict: 256
        }
      }, { timeout: 30000 });

      return response.data.message.content;
    } catch (error) {
      logger.error('AI Suggest Error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze agency performance data
   */
  async analyzeData(dataJson) {
    const prompt = `Analyzuj následující data a navrhni 3 vylepšení pro ziskovost: ${JSON.stringify(dataJson)}`;
    return this.generateResponse(prompt, "Jsi expert na business analytics.");
  }
}

module.exports = new AIService();
