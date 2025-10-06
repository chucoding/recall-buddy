import { apiClient } from '../modules/axios';

interface ChatCompletionResponse {
  body: {
    result: {
      message: {
        content: string;
      };
    };
  };
}

/**
 * CLOVA Studio - Firebase Functions를 통해 호출
 */
export async function chatCompletions(text: string): Promise<ChatCompletionResponse> {
    try {
        const response = await apiClient.post('/chatCompletions', {
            prompt: "마크다운 파일을 읽고 질문을 만들어주세요. 질문은 다음과 같은 형식으로 출력해주세요. [\"첫 번째 질문\", \"두 번째 질문\", ...]",
            text: text,
        });

        return response.data;
    } catch (err) {
        console.error("Error during API call:", err);
        throw err;
    }
}

/**
 * Firebase Cloud Messaging 관련 API
 */
export async function registerDeviceToken(userId: string, token: string): Promise<boolean> {
    try {
        const response = await apiClient.post('/registerDeviceToken', {
            userId,
            token
        });
        return response.data.success;
    } catch (error) {
        console.error('Error registering device token:', error);
        return false;
    }
}

export async function removeDeviceToken(userId: string): Promise<void> {
    try {
        await apiClient.post('/removeDeviceToken', {
            userId
        });
    } catch (error) {
        console.error('Error removing device token:', error);
        throw error;
    }
}

export async function registerSchedule(scheduleCode: string): Promise<void> {
    try {
        await apiClient.post('/registerSchedule', {
            scheduleCode
        });
    } catch (error) {
        console.error('Error registering schedule:', error);
        throw error;
    }
}