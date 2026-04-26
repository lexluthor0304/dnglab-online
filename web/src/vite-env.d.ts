/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADSENSE_CLIENT: string;
  readonly VITE_SITE_ORIGIN: string;
  readonly VITE_BRAND_HOME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
