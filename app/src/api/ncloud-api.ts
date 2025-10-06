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
 * CLOVA Studio
 */
export async function chatCompletions(text: string): Promise<ChatCompletionResponse> {
    try {
        const option = {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: "마크다운 파일을 읽고 질문을 만들어주세요. 질문은 다음과 같은 형식으로 출력해주세요. [\"첫 번째 질문\", \"두 번째 질문\", ...]",
            text: text,
          }),
        };
  
        const response = await fetch("/question-generator/v1/json", option);

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
  
        return await response.json();
    } catch (err) {
        console.error("Error during fetch:", err);
        throw err;
    }
}

/**
 * Firebase Cloud Messaging 관련 API
 * TODO: 실제 API 엔드포인트로 교체 필요
 */
export async function registerDeviceToken(userId: string, token: string): Promise<boolean> {
    try {
        // 실제 API 호출로 교체 필요
        console.log('Registering device token:', { userId, token });
        return true;
    } catch (error) {
        console.error('Error registering device token:', error);
        return false;
    }
}

export async function removeDeviceToken(userId: string): Promise<void> {
    try {
        // 실제 API 호출로 교체 필요
        console.log('Removing device token for user:', userId);
    } catch (error) {
        console.error('Error removing device token:', error);
    }
}

export async function registerSchedule(scheduleCode: string): Promise<void> {
    try {
        // 실제 API 호출로 교체 필요
        console.log('Registering schedule:', scheduleCode);
    } catch (error) {
        console.error('Error registering schedule:', error);
    }
}