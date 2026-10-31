import type { MultiStepFormSchema } from "./types";

export const openaiSchema: MultiStepFormSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  title: "OpenAI",
  "x-category": "ai",
  properties: {
    api_key: {
      type: "string",
      title: "API Key",
      description: "API key for connecting to OpenAI",
      "x-placeholder": "sk-...",
      "x-secret": true,
    },
    model: {
      type: "string",
      title: "Model",
      description: "The OpenAI model to use",
      "x-placeholder": "gpt-4o",
    },
    base_url: {
      type: "string",
      title: "Base URL",
      description: "Use an OpenAI-compatible API on another domain",
      "x-placeholder": "https://api.openai.com/v1",
      "x-hint":
        "Leave empty for OpenAI. Works with OpenRouter, vLLM, LiteLLM and other OpenAI-compatible gateways.",
    },
  },
  required: ["api_key"],
};
