/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
  readonly VITE_MESSAGING_SENDER_ID: string
  readonly VITE_APP_ID: string
  readonly VITE_MEASUREMENT_ID: string
  readonly VITE_VAPID_KEY: string
  readonly VITE_USER_ID: string
  readonly VITE_SCHEDULE_CODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
