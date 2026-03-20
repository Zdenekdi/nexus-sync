# AI Integration: Local LLM Strategy

This plan focuses on integrating local AI models into Nexus Hub to provide private, uncensored, and cost-effective translation and chatting services.

## Technical Architecture

### 1. Ollama Infrastructure
- **Model**: Llama-3-8B-Instruct or Mistral-7B-Instruct.
- **Port**: 11434 (Standard Ollama API).
- **Communication Protocol**: JSON over HTTP.

### 2. Backend Services (Server)
- **`aiService.js`**: Handle prompt construction, system personas, and token management.
- **`aiRoutes.js`**: Provide secure endpoints for the frontend.

### 3. Frontend Integration (Client)
- **Translation Engine**: Replace mockups in `App.jsx` with real asynchronous API calls.
- **Dynamic Suggestions**: Generate smart replies based on the *actual* context of the conversation.

## Next Steps
- [ ] Implement `aiService.js` skeleton.
- [ ] Configure System Prompts for adult-industry friendliness.
- [ ] Connect the UI to the backend AI endpoints.
