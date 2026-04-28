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
   * Suggest 3 distinct replies based on chat history
   * @param {Array} messages - Array of { role, content } messages
   * @param {string} profileContext - Context about the persona/profile
   * @param {Array} styleExamples - Real examples of how the model writes
   */
  async suggestReply(messages, profileContext = "", styleExamples = []) {
    try {
      logger.info(`AI: Generování 3 návrhů odpovědí pro chat (${messages.length} zpráv)`);
      
      let styleSection = "";
      if (styleExamples.length > 0) {
        styleSection = `
          TADY JSOU REÁLNÉ UKÁZKY STYLU MODELKY (POUŽIJ JE JAKO VZOR):
          ${styleExamples.map(s => `- ${s}`).join('\n')}
          
          ZAMĚŘ SE NA: Stejnou délku zpráv, stejnou frekvenci smajlíků, stejnou míru flirtování.
        `;
      }

      const system = `
        Jsi Nexus AI, špičkový expert na komunikaci a prodej na OnlyFans/Fansly. 
        Zastupuješ tuto modelku: ${profileContext}
        ${styleSection}
        
        TVŮJ ÚKOL:
        Navrhni 3 RŮZNÉ varianty odpovědi na poslední zprávu uživatele.
        1. VARIANTA: Krátká, úderná, flirtující.
        2. VARIANTA: Delší, budující vztah, pokládající otázku.
        3. VARIANTA: Zaměřená na prodej obsahu nebo "zamknutých" zpráv.

        PODMÍNKY:
        - Odpovídáš v jazyce, kterým mluví uživatel (pokud on píše česky, ty taky).
        - Piš PŘIROZENĚ, jako člověk, ne jako robot. Používej moderní slang a emoji.
        - TVOJE ODPOVĚĎ MUSÍ BÝT ČISTÝ JSON POLE STRINGŮ (např. ["návrh 1", "návrh 2", "návrh 3"]).
        - NEPIŠ ŽÁDNÝ JINÝ TEXT, POUZE JSON.
      `;

      const response = await axios.post(`${this.baseUrl}/generate`, {
        model: this.model,
        prompt: `Chat history:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nSystem instructions: ${system}\n\nGenerate the 3 suggestions as a JSON array:`,
        stream: false,
        options: {
          temperature: 0.85,
          num_predict: 512
        }
      }, { timeout: 35000 });

      const rawContent = response.data.response.trim();
      try {
        // Try to parse as JSON
        const match = rawContent.match(/\[.*\]/s);
        if (match) {
          const suggestions = JSON.parse(match[0]);
          if (Array.isArray(suggestions)) return suggestions;
        }
        // Fallback if not JSON
        return rawContent.split('\n').filter(l => l.trim().length > 5).slice(0, 3);
      } catch (e) {
        return [rawContent];
      }
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
