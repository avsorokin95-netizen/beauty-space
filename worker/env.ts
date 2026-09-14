export interface Env {
  DB: D1Database;
  WEB_ANALYTICS_TOKEN?: string;
  ANALYTICS_LIMITER?: RateLimit;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  APP_ORIGIN?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
}
