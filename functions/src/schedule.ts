import {onSchedule} from "firebase-functions/v2/scheduler";
import {getMessaging} from "firebase-admin/messaging";
import {getFirestore} from "firebase-admin/firestore";

// 매시 정각(KST) 실행: pushEnabled && fcmToken 있는 사용자 중 preferredPushHour(없으면 8)가 현재 시와 같은 경우에만 FCM 발송
// 참고: 8시 KST = 23:00 UTC. 단말 알림 시간이 UTC로 보이면 23시로 표시될 수 있음.
const FCM_BATCH_SIZE = 500;

/** 스케줄 트리거 시각(또는 현재 시각)을 기준으로 KST 시(0–23) 반환. Intl로 Asia/Seoul 적용. */
function getKstHour(date: Date): number {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(formatter.format(date), 10);
}

export const sendDaily8amPush = onSchedule(
  {
    schedule: "0 * * * *", // 매시 정각 (timeZone: Asia/Seoul 기준)
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const db = getFirestore();
      const usersSnapshot = await db.collection("users").where("pushEnabled", "==", true).get();

      // 스케줄러가 예정한 트리거 시각 사용(지연 실행 시에도 의도한 시각 기준). 없으면 현재 시각 사용.
      const now =
        typeof event?.scheduleTime === "string"
          ? new Date(event.scheduleTime)
          : new Date();
      const kstHour = getKstHour(now);
      const utcHour = now.getUTCHours();

      const tokens: string[] = [];
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const token = data.fcmToken;
        const preferredHour = typeof data.preferredPushHour === "number" ? data.preferredPushHour : 8;
        if (token && typeof token === "string" && preferredHour === kstHour) {
          tokens.push(token);
        }
      });

      console.log(
        `Daily push: UTC hour=${utcHour}, KST hour=${kstHour} (preferredPushHour=${kstHour}인 사용자만), sending to ${tokens.length} users`
      );

      if (tokens.length === 0) {
        console.log("No push-enabled users with FCM token. Skipping send.");
        return;
      }

      const messaging = getMessaging();
      const notification = {
        title: "오늘의 리마인더",
        body: "복습할 카드가 도착했어요!",
      };
      const data = { type: "daily-reminder", url: "/" };

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
        const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
        const messages = batch.map((token) => ({
          token,
          notification,
          data,
        }));
        const response = await messaging.sendEach(messages);
        response.responses.forEach((r) => (r.success ? successCount++ : failureCount++));
        if (response.failureCount > 0) {
          response.responses.forEach((r, idx) => {
            if (!r.success) {
              console.warn("FCM send failed for token index", i + idx, r.error?.message);
            }
          });
        }
      }

      console.log(`Successfully sent: ${successCount}, failed: ${failureCount}`);
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }
);

// 매일 정오 12시(KST)에 전날 이전 탈퇴 기록 모두 삭제
// 탈퇴 당일만 재가입 차단, 다음날부터는 재가입 가능하므로
// 오늘 탈퇴한 기록만 유지하고 나머지는 삭제
export const cleanupDeletedUsers = onSchedule(
  {
    schedule: "0 3 * * *", // KST 12:00 = UTC 03:00
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    try {
      console.log("🗑️ deletedUsers 정리 작업 시작 (매일 12시)");

      const db = getFirestore();
      const deletedUsersRef = db.collection("deletedUsers");

      // 오늘 날짜 (KST 기준)
      const now = new Date();
      const kstOffset = 9 * 60; // KST = UTC+9
      const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
      const todayKST = kstNow.toISOString().split("T")[0]; // "2025-10-20"

      console.log(`📅 오늘 날짜 (KST): ${todayKST}`);
      console.log("📅 오늘 탈퇴 기록만 유지, 어제 이전 기록은 모두 삭제");

      // 모든 탈퇴 기록 조회
      const snapshot = await deletedUsersRef.get();

      if (snapshot.empty) {
        console.log("✅ 삭제할 문서 없음");
        return;
      }

      // 배치 삭제
      const batch = db.batch();
      let deletedCount = 0;
      let keptCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const deletedAt = new Date(data.deletedAt);
        const kstDeletedAt = new Date(deletedAt.getTime() + kstOffset * 60 * 1000);
        const deletedDateKST = kstDeletedAt.toISOString().split("T")[0];

        if (deletedDateKST === todayKST) {
          // 오늘 탈퇴한 기록은 유지
          console.log(`  - 유지: ${doc.id} (${data.email}, 탈퇴: ${data.deletedAt})`);
          keptCount++;
        } else {
          // 어제 이전 탈퇴 기록은 삭제
          console.log(`  - 삭제: ${doc.id} (${data.email}, 탈퇴: ${data.deletedAt})`);
          batch.delete(doc.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`✅ ${deletedCount}개 삭제, ${keptCount}개 유지 완료`);
      } else {
        console.log(`✅ 삭제할 문서 없음, ${keptCount}개 유지`);
      }
    } catch (error) {
      console.error("❌ deletedUsers 정리 실패:", error);
    }
  }
);
