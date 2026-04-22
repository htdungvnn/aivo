/**
 * OpenAI API utility
 * Provides configured OpenAI client for Cloudflare Workers
 */

import { OpenAI } from "openai";

// Cloudflare Workers compatible OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Cloudflare Workers compatibility
  dangerouslyAllowBrowser: true,
});

export { openai };
