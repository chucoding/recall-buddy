import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getMessaging } from 'firebase-admin/messaging';

// 매일 오전 8시(KST)에 실행되는 스케줄러
export const sendDaily8amPush = onSchedule(
  {
    schedule: '0 23 * * *', // KST 08:00 = UTC 23:00 (전날)
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3'
  },
  async () => {
    try {
      console.log('Daily push notification scheduled task started');
      
      // FCM 토픽/토큰으로 브로드캐스트
      // 실제 구현 시에는 Firestore에서 구독자 토큰들을 가져와야 함
      const messaging = getMessaging();
      
      // 예시: 토픽을 통한 브로드캐스트
      const message = {
        topic: 'daily-reminder',
        notification: { 
          title: '오늘의 리마인더', 
          body: '복습할 카드가 도착했어요!' 
        },
        data: { 
          type: 'daily-reminder',
          url: '/'
        }
      };

      const response = await messaging.send(message);
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
);
