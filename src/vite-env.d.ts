/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Same value as Laravel `API_PAYLOAD_ENCRYPTION_KEY` (base64, 32 bytes). */
  readonly VITE_API_PAYLOAD_ENCRYPTION_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
