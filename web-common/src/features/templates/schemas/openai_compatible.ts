import type { MultiStepFormSchema } from "./types";

// Any gateway that speaks the OpenAI chat-completions API can be used through
// the `openai` driver; this schema only adds the endpoint field and keeps it
// required, so the form asks for the gateway instead of assuming OpenAI.
export const openaiCompatibleSchema: MultiStepFormSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  title: "OpenAI-compatible",
  "x-driver": "openai",
  "x-category": "ai",
  properties: {
    base_url: {
      type: "string",
      title: "Endpoint",
      description: "Base URL of the OpenAI-compatible API",
      "x-placeholder": "https://openrouter.ai/api/v1",
      "x-hint":
        "The API root that ends in /v1. Works with OpenRouter, DeepSeek, Groq, Mistral, Together, xAI, Ollama, vLLM and LiteLLM.",
    },
    api_key: {
      type: "string",
      title: "API Key",
      description: "API key issued by the gateway",
      "x-placeholder": "sk-...",
      "x-secret": true,
    },
    model: {
      type: "string",
      title: "Model",
      description: "Model name as the gateway expects it",
      "x-placeholder": "deepseek-chat",
    },
  },
  required: ["base_url", "api_key"],
};
