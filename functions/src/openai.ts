import {onRequest} from "firebase-functions/v2/https";
import {getFlashcardPrompt, type ContentType} from "./prompts.js";

/**
 * Clova와 동일한 형태로 앱에서 사용하는 정규화 응답 타입
 */
interface NormalizedChatCompletionResponse {
  status: {
    code: string;
    message: string;
  };
  result: {
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
    created: number;
    seed: number;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

const OPENAI_MODEL = "gpt-4o-mini";

/**
 * OpenAI Chat Completions - 요청은 { contentType, text }, 프롬프트는 서버에서 조회
 * 응답은 Clova와 동일한 형태로 정규화해 반환
 */
export const openaiChatCompletions = onRequest(
  {
    cors: true,
    region: "asia-northeast3",
    invoker: "public",
  },
  async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.status(500).json({error: "OpenAI API 호출 실패: OPENAI_API_KEY가 설정되지 않았습니다."});
        return;
      }

      const {contentType, text} = req.body;

      if (!text || !contentType) {
        res.status(400).json({error: "contentType and text are required"});
        return;
      }
      if (contentType !== "markdown" && contentType !== "code-diff") {
        res.status(400).json({error: "contentType must be 'markdown' or 'code-diff'"});
        return;
      }

      const prompt = getFlashcardPrompt(contentType as ContentType);

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
            {role: "user", content: text},
          ],
          temperature: 0.5,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", response.status, errorText);
        res.status(500).json({
          error: `OpenAI API 호출 실패: ${response.status} - ${errorText}`,
        });
        return;
      }

      const data = await response.json() as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
        created?: number;
      };

      const content = data.choices?.[0]?.message?.content ?? "";
      const usage = data.usage ?? {};
      const normalized: NormalizedChatCompletionResponse = {
        status: {code: "200", message: "OK"},
        result: {
          message: {role: "assistant", content},
          finishReason: data.choices?.[0]?.finish_reason ?? "stop",
          created: data.created ?? Math.floor(Date.now() / 1000),
          seed: 0,
          usage: {
            promptTokens: usage.prompt_tokens ?? 0,
            completionTokens: usage.completion_tokens ?? 0,
            totalTokens: usage.total_tokens ?? 0,
          },
        },
      };

      res.json(normalized);
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      res.status(500).json({error: "OpenAI API 호출 실패"});
    }
  }
);
