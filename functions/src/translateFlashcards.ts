import {onRequest} from "firebase-functions/v2/https";
import {getTranslateFlashcardsPrompt} from "./prompts.js";

const OPENAI_MODEL = "gpt-4o-mini";

interface FlashCardInput {
  question: string;
  answer: string;
  highlights?: string[];
  metadata?: Record<string, unknown>;
}

const TRANSLATE_RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "translated_items",
    description: "번역된 Q&A 쌍 목록",
    strict: true,
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
};

/**
 * 플래시카드 Q&A 번역 (배치)
 * POST { cards: FlashCardInput[], targetLang: 'ko' | 'en' }
 * 반환: { cards: FlashCardInput[] } (question, answer만 번역, highlights/metadata 유지)
 */
export const translateFlashcards = onRequest(
  {
    cors: true,
    region: "asia-northeast3",
    invoker: "public",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.status(500).json({error: "OPENAI_API_KEY가 설정되지 않았습니다."});
        return;
      }

      const body = (req.body || {}) as { cards?: FlashCardInput[]; targetLang?: "ko" | "en" };
      const {cards, targetLang} = body;

      if (!Array.isArray(cards) || cards.length === 0 || !targetLang || !["ko", "en"].includes(targetLang)) {
        res.status(400).json({error: "cards (배열, 비어있지 않음)와 targetLang ('ko' | 'en') 필수"});
        return;
      }

      const pairs = cards.map((c) => ({question: c?.question ?? "", answer: c?.answer ?? ""}));
      const userContent = JSON.stringify(pairs);

      const prompt = getTranslateFlashcardsPrompt(targetLang);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {role: "system", content: prompt},
            {role: "user", content: userContent},
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: TRANSLATE_RESPONSE_SCHEMA,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI translate error:", response.status, errorText);
        res.status(500).json({error: `번역 API 호출 실패: ${response.status}`});
        return;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "{}";

      let parsed: { items?: Array<{ question: string; answer: string }> };
      try {
        parsed = JSON.parse(content) as { items?: Array<{ question: string; answer: string }> };
      } catch {
        console.error("Translate response parse error:", content);
        res.status(500).json({error: "번역 응답 파싱 실패"});
        return;
      }

      const translated = parsed?.items ?? [];
      if (translated.length !== cards.length) {
        console.warn("Translate length mismatch:", translated.length, "vs", cards.length);
      }

      const result = cards.map((card, i) => {
        const t = translated[i];
        return {
          ...card,
          question: t?.question ?? card.question,
          answer: t?.answer ?? card.answer,
        };
      });

      res.json({cards: result});
    } catch (error) {
      console.error("translateFlashcards error:", error);
      res.status(500).json({error: "번역 처리 중 오류가 발생했습니다."});
    }
  }
);
