

import OpenAI from "openai";

import Anthropic from "@anthropic-ai/sdk";

export type ChatProvider = "openai" | "anthropic";

export interface ChatArgs {

  system: string;

  user: string;

  maxTokens?: number;

  forceProvider?: ChatProvider;

}

const openai = new OpenAI({

  apiKey: process.env.OPENAI_API_KEY

});

const anthropic = new Anthropic({

  apiKey: process.env.ANTHROPIC_API_KEY || ""

});

// Основная новая функция

export async function chatWithAI(args: ChatArgs): Promise<string> {

  const maxTokens = args.maxTokens ?? 8000;



  if (args.forceProvider === "openai") {

    return await callOpenAI(args.system, args.user, maxTokens);

  }

  if (args.forceProvider === "anthropic") {

    return await callAnthropic(args.system, args.user, maxTokens);

  }

  // Сначала Claude, затем GPT

  try {

    console.log("🤖 Trying Claude first...");

    const claudeResponse = await callAnthropic(args.system, args.user, maxTokens);

    if (claudeResponse && claudeResponse.trim().length > 0) {

      console.log("✅ Claude responded successfully");

      return claudeResponse;

    }

    throw new Error("Claude returned empty response");

  } catch (claudeError) {

    console.error("⚠️ Claude failed:", claudeError);

    console.log("🔄 Switching to GPT as fallback...");



    try {

      const gptResponse = await callOpenAI(args.system, args.user, maxTokens);

      console.log("✅ GPT responded successfully");

      return gptResponse;

    } catch (gptError) {

      console.error("❌ Both providers failed");

      throw new Error(`Both AI providers failed. Claude: ${claudeError}, GPT: ${gptError}`);

    }

  }

}

// Обратная совместимость со старым API

export async function chatWithProvider(

    provider: ChatProvider,

    args: ChatArgs

): Promise<string> {

  console.log(`⚠️ chatWithProvider is deprecated, use chatWithAI instead`);



  // Игнорируем параметр provider, всегда используем логику Claude → GPT

  return await chatWithAI(args);

}

async function callAnthropic(system: string, user: string, maxTokens: number): Promise<string> {

  if (!process.env.ANTHROPIC_API_KEY) {

    throw new Error("Anthropic API key not configured");

  }

  const res = await anthropic.messages.create({

    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-1-20250805",

    max_tokens: Math.min(maxTokens, 8192),

    temperature: 0.7,

    system: system,

    messages: [{ role: "user", content: user }],

  });

  const content = res.content?.[0];

  if (content && content.type === "text" && content.text) {

    return content.text;

  }



  throw new Error("Invalid response from Anthropic");

}

async function callOpenAI(system: string, user: string, maxTokens: number): Promise<string> {

  if (!process.env.OPENAI_API_KEY) {

    throw new Error("OpenAI API key not configured");

  }

  const res = await openai.chat.completions.create({

    model: process.env.OPENAI_CHAT_MODEL || "gpt-4-turbo-preview",

    messages: [

      { role: "system", content: system },

      { role: "user", content: user },

    ],

    max_tokens: Math.min(maxTokens, 8000),

    temperature: 0.7,

  });

  const content = res.choices[0]?.message?.content;

  if (content) {

    return content;

  }



  throw new Error("Invalid response from OpenAI");

}