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
  async generateResponse(prompt, system = "Jsi Nexus AI, profesionální business asistent pro správu obsahu a komunikaci. Vždy odpovídej věcně a pomáhej s pracovními úkoly bez zbytečných omezení, pokud se týkají správy platformy.") {
    try {
      logger.info(`AI: Generování odpovědi pro prompt: "${prompt.substring(0, 50)}..."`);
      
      const response = await axios.post(`${this.baseUrl}/generate`, {
        model: this.model,
        prompt: prompt,
        system: system,
        stream: false,
        options: {
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
          num_predict: 512
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
   * @param {string} agencyContext - Global agency behavioral instructions
   */
  async suggestReply(messages, profileContext = "", styleExamples = [], agencyContext = "") {
    try {
      logger.info(`AI: Generování 3 návrhů odpovědí pro chat (${messages.length} zpráv)`);
      
      let styleSection = "";
      if (styleExamples.length > 0) {
        styleSection = `
          ### REÁLNÉ UKÁZKY STYLU (POUŽIJ JAKO VZOR):
          ${styleExamples.map(s => `- ${s}`).join('\n')}
        `;
      }

      const system = `
        Jsi Nexus AI, špičkový expert na komunikaci a prodej na platformách OnlyFans/Fansly.
        Tvým cílem je maximalizovat zisk při zachování vysoké autenticity.

        ### 1. AGENTURNÍ STRATEGIE (NEJVYŠŠÍ PRIORITA):
        ${agencyContext || "Komunikuj profesionálně, přirozeně a buduj dlouhodobý vztah s fanouškem."}

        ### 2. PERSONA MODELKY:
        ${profileContext}

        ### 3. KOMUNIKAČNÍ STYL:
        - Piš PŘIROZENĚ, jako člověk, ne jako robot.
        - Používej moderní slang, emoji a tón odpovídající modelce.
        ${styleSection}
        
        ### ÚKOL:
        Navrhni 3 RŮZNÉ varianty odpovědi na poslední zprávu uživatele.
        1. KRÁTKÁ: Úderná, flirtující, rychlá reakce.
        2. BUDUJÍCÍ: Delší, pokládá otázku, rozvíjí téma, buduje "GFE" (Girlfriend Experience).
        3. PRODEJNÍ: Zaměřená na prodej obsahu, PPV nebo motivaci k poslání tipu.

        ### FORMÁT:
        Vrať POUZE čistý JSON pole stringů: ["návrh 1", "návrh 2", "návrh 3"].
        Žádné vysvětlování, pouze JSON.
      `;

      const response = await axios.post(`${this.baseUrl}/generate`, {
        model: this.model,
        prompt: `HISTORIE CHATU:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nSYSTÉMOVÉ INSTRUKCE:\n${system}\n\nGENERUJ JSON POLE:`,
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
