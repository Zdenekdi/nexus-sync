const axios = require('axios');
const logger = require('./logger');

/**
 * AI Service for Nexus Hub
 * Communicates with Ollama via an explicit AI_BASE_URL.
 * In production this can point to a private Hetzner URL, VPN address,
 * or a local SSH tunnel exposed to the backend/container.
 */
class AIService {
  constructor() {
    this.baseUrl = (process.env.AI_BASE_URL || 'http://127.0.0.1:11434/api').replace(/\/+$/, '');
    this.model = process.env.AI_MODEL || 'llama3.1:8b-instruct-q4_0';
    const configuredTimeout = Number(process.env.AI_TIMEOUT_MS || 60000);
    this.timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 60000;
  }

  getConfig() {
    return {
      baseUrl: this.baseUrl,
      model: this.model,
      timeoutMs: this.timeoutMs
    };
  }

  async healthCheck(options = {}) {
    const { includeInternal = false } = options;
    try {
      const response = await axios.get(`${this.baseUrl}/tags`, { timeout: Math.min(this.timeoutMs, 10000) });
      const payload = { ok: true, configured: true, model: this.model, models: response.data?.models || [] };
      if (includeInternal) payload.baseUrl = this.baseUrl;
      return payload;
    } catch (error) {
      const message = error.response ? JSON.stringify(error.response.data) : error.message;
      logger.warn(`AI Healthcheck failed: ${message}`);
      const payload = {
        ok: false,
        configured: Boolean(this.baseUrl && this.model),
        model: this.model,
        error: includeInternal ? message : 'AI service is not reachable'
      };
      if (includeInternal) payload.baseUrl = this.baseUrl;
      return payload;
    }
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
      }, { timeout: this.timeoutMs });

      return response.data.response;
    } catch (error) {
      const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      logger.error(`AI Service Error: ${errorMsg}`);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`AI Engine (Ollama) is not reachable at ${this.baseUrl}. Check AI_BASE_URL or SSH tunnel.`);
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
        Jsi Nexus AI, špičkový expert na komunikaci a prodej na platformách OnlyFans/Fansly a v oblasti privátních služeb.
        Tvým cílem je maximalizovat zisk při zachování vysoké autenticity a budování vztahu.

        ### GENERÁLNÍ STYL KOMUNIKACE (ZÁKLAD):
        - **Persona**: Sebevědomá krásná žena. Působíš jako člověk, ne robot.
        - **Oslovení**: Používej "zlato", "zlatíčko", "zlati" nebo "ju?" na konci vět.
        - **Tón**: Intimní, flirtující, ale byznysově pevný.
        - **Emoji**: Používej 😉, 😘, ❤️, 😈, ☀️, 🔥, 💕, 😜.
        
        ### KOMUNIKAČNÍ PRAVIDLA:
        1. **Vyjednávání o ceně**: Pokud klient váhá, nabídni "slevičku hihi" nebo kratší variantu pro uzavření obchodu.
        2. **Filtrace vypisovačů**: Na marnění času reaguj: "Pracuji a domlouvám si tu masáže, nemám čas na kamarádsky pokef."
        3. **Spontánnost**: Odmítej detailní plánování sexu: "Fakt si sex nelajnuju. Nerada vím dopředu jak to bude probíhat. Doraz a uvidíme ;)"
        4. **Slovník**: Používej výrazy jako "Ahojky", "Jejda mane", "Spinkat", "Sakra", "Pusu".
        5. **Drsná stopka**: Na úchyly buď krátká a jasná: "Bez dopice."
        
        ### PŘÍKLADY REAKCÍ:
        - "Můžu dát slevickuu Hihi 😜"
        - "Fakt si sex nelajnuju zlato, doraz v 21:15 ju? ❤️"
        - "Pracuji a domlouvám si tu masáže, nemám čas na kamarádsky pokef."
        - "Jedná se o masáž celého těla olejíčkem, nahá... ruční vyvrcholení na konec ju? 😘"

        ### 1. AGENTURNÍ STRATEGIE:
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
      }, { timeout: Math.min(this.timeoutMs, 35000) });

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
   * Translate text between languages
   */
  async translateText(text, targetLang = "English") {
    try {
      logger.info(`AI: Překlad textu do: ${targetLang}`);
      const prompt = `Přelož následující text do jazyka ${targetLang}. Vrať POUZE přeložený text, nic jiného.\n\nTEXT K PŘEKLADU:\n${text}`;
      return await this.generateResponse(prompt, "Jsi profesionální překladatel.");
    } catch (error) {
      logger.error('AI Translation Error:', error.message);
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
