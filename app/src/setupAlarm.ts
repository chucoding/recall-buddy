import { getMessaging, getToken } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import { registerDeviceToken, registerSchedule, removeDeviceToken } from "./api/ncloud-api"; //TODO remove

const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: "til-alarm.firebaseapp.com",
    projectId: "til-alarm",
    storageBucket: "til-alarm.appspot.com",
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};
  
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export default async function setupAlarm(): Promise<void> {
    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      console.log("알림 권한 허용 안됨");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
    });
  
    if (localStorage.getItem("token") === token) return;

    await removeDeviceToken(import.meta.env.VITE_USER_ID);
    const isOk = await registerDeviceToken(import.meta.env.VITE_USER_ID, token);

    if (isOk) {
      registerSchedule(import.meta.env.VITE_SCHEDULE_CODE);
      localStorage.setItem("token", token);
    }
}
