import { onRequest } from 'firebase-functions/v2/https';

// HyperCLOVA X API (HCX-007)
export const chatCompletions = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { prompt, text } = req.body;
      
      if (!prompt || !text) {
        res.status(400).json({ error: 'prompt and text are required' });
        return;
      }

      // 고유한 요청 ID 생성
      const requestId = crypto.randomUUID().replace(/-/g, '');

      // HyperCLOVA X API 호출 (HCX-007 모델)
      const response = await fetch('https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-007', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CLOVA_API_KEY || ''}`,
          'X-NCP-CLOVASTUDIO-REQUEST-ID': requestId
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: [
                {
                  type: 'text',
                  text: prompt
                }
              ]
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: text
                }
              ]
            }
          ],
          thinking: {
            effort: 'low'
          },
          topP: 0.8,
          topK: 0,
          maxCompletionTokens: 20480,
          temperature: 0.5,
          repetitionPenalty: 1.1,
          seed: 0,
          includeAiFilters: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HCX API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error calling HCX API:', error);
      res.status(500).json({ error: 'Failed to call HCX API' });
    }
  }
);
