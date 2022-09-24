declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string
    MONGODB_URI: string
    BASE_URL: string
    PAGES_URL: string
    API_URL: string
    API_SHARED_URL: string
    API_TOKEN: string
  }
}
