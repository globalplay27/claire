import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-5.6-luna"),
  META_APP_SECRET: z.string().min(1).optional(),
  META_VERIFY_TOKEN: z.string().min(8),
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1),
  INSTAGRAM_ACCOUNT_ID: z.string().min(1),
  META_API_VERSION: z.string().default("v26.0"),
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  DATABASE_SSL: z.string().default("false").transform((v) => v === "true"),
  HUMAN_HANDOFF_URL: z.string().url().optional().or(z.literal("")),
  LEAD_KEYWORDS: z.string().default("quero,preço,preco,valor,teste,saiba mais")
});

export const env = envSchema.parse(process.env);
export const leadKeywords = env.LEAD_KEYWORDS.split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
