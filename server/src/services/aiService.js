/**
 * AI Service for Nexus Hub
 * Handles communication with local LLM instances (e.g. Ollama)
 */

class AIService {
    constructor(baseUrl = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generate completion for a given prompt and system persona
     */
    async generate(prompt, systemPrompt = "You are a helpful assistant.") {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3', // Default model
                    prompt: prompt,
                    system: systemPrompt,
                    stream: false
                })
            });

            if (!response.ok) throw new Error('AI Service Unavailable');
            
            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('AI Error:', error);
            return null;
        }
    }

    /**
     * Specialized method for translation
     */
    async translate(text, targetLang = 'cs') {
        const systemPrompt = `You are a professional translator. Translate the following text into ${targetLang}. 
                              Preserve the tone and any slang used. Output ONLY the translated text.`;
        return this.generate(text, systemPrompt);
    }
}

module.exports = new AIService();
