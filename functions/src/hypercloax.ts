import { onRequest } from 'firebase-functions/v2/https';

// Hypercloax 관련 API Functions
export const hypercloaxApi = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { method, path } = req.query;
      
      if (!method || !path) {
        res.status(400).json({ error: 'method and path parameters are required' });
        return;
      }

      // TODO: Hypercloax API 호출 로직 구현
      // 현재는 플레이스홀더 응답
      res.json({ 
        message: 'Hypercloax API endpoint',
        method,
        path,
        status: 'not_implemented'
      });
    } catch (error) {
      console.error('Error calling Hypercloax API:', error);
      res.status(500).json({ error: 'Failed to call Hypercloax API' });
    }
  }
);

// CLOVA Studio API (기존 NCloud API)
export const chatCompletions = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { prompt, text } = req.body;
      
      if (!prompt || !text) {
        res.status(400).json({ error: 'prompt and text are required' });
        return;
      }

      // CLOVA Studio API 호출
      const response = await fetch('https://clovastudio.apigw.ntruss.com/testapp/v1/chat-completions/HMX-001', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NCP-CLOVASTUDIO-API-KEY': process.env.CLOVA_API_KEY || '',
          'X-NCP-APIGW-API-KEY': process.env.NCLOUD_API_KEY || ''
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${text}`
            }
          ],
          maxTokens: 1000,
          temperature: 0.7,
          topK: 0,
          topP: 0.8,
          repeatPenalty: 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`CLOVA API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error calling CLOVA API:', error);
      res.status(500).json({ error: 'Failed to call CLOVA API' });
    }
  }
);

// Firebase Cloud Messaging 관련 API
export const registerDeviceToken = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { userId, token } = req.body;
      
      if (!userId || !token) {
        res.status(400).json({ error: 'userId and token are required' });
        return;
      }

      // TODO: Firestore에 토큰 저장 로직 구현
      console.log('Registering device token:', { userId, token });
      res.json({ success: true });
    } catch (error) {
      console.error('Error registering device token:', error);
      res.status(500).json({ error: 'Failed to register device token' });
    }
  }
);

export const removeDeviceToken = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      // TODO: Firestore에서 토큰 삭제 로직 구현
      console.log('Removing device token for user:', userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing device token:', error);
      res.status(500).json({ error: 'Failed to remove device token' });
    }
  }
);

export const registerSchedule = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { scheduleCode } = req.body;
      
      if (!scheduleCode) {
        res.status(400).json({ error: 'scheduleCode is required' });
        return;
      }

      // TODO: 스케줄 등록 로직 구현
      console.log('Registering schedule:', scheduleCode);
      res.json({ success: true });
    } catch (error) {
      console.error('Error registering schedule:', error);
      res.status(500).json({ error: 'Failed to register schedule' });
    }
  }
);
