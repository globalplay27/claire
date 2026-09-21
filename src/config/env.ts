import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-5.6-luna"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  META_APP_SECRET: z.string().min(1).optional(),
  INSTAGRAM_APP_SECRET: z.string().min(1).optional(),
  META_VERIFY_TOKEN: z.string().min(8),
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1),
  INSTAGRAM_ACCOUNT_ID: z.string().min(1),
  META_API_VERSION: z.string().default("v26.0"),
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  DATABASE_SSL: z.string().default("false").transform((v) => v === "true"),
  HUMAN_HANDOFF_URL: z.string().url().optional().or(z.literal("")),
  LEAD_KEYWORDS: z.string().default("quero,preço,preco,valor,teste,saiba mais"),

  AUTOMATION_ENABLED: z.string().default("false").transform((v) => v === "true"),
  AUTOMATION_POLL_SECONDS: z.coerce.number().int().min(30).default(60),
  AUTOMATION_ADMIN_TOKEN: z.string().min(8).optional(),
  AUTO_POST_HOURS: z.string().default("18"),
  PUBLIC_BASE_URL: z.string().url().optional(),
  BRAND_NAME: z.string().default("Global Play"),
  BRAND_INSTAGRAM: z.string().default("@globalplay_streaming"),
  BRAND_WHATSAPP_URL: z.string().url().optional().or(z.literal("")),
  BRAND_OBJECTIVE: z.string().default("atrair assinantes e revendedores com conteúdo claro, útil e comercial")
});

export const env = envSchema.parse(process.env);

export const leadKeywords = env.LEAD_KEYWORDS.split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

export const autoPostHours = env.AUTO_POST_HOURS.split(",")
  .map((item) => Number.parseInt(item.trim(), 10))
  .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);

export function getPublicBaseUrl() {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  return railwayDomain ? `https://${railwayDomain}` : undefined;
}
