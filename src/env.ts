import { env } from "bun";
import consola from "consola";
import { z } from "zod";

const envSchema = z.object({
  API_KEY: z.string().optional(),
  ENABLE_WEB_UI: z.enum(['true', 'false']).default('true').transform(val => val === 'true'),
  ENABLE_SENSITIVE_LOGS: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  PORT: z.string().default('3000').transform(Number),
  SSH_HOST: z.string().optional(),
  SSH_USER: z.string().optional(),
  SSH_PASSWORD: z.string().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(env);
  
  if (!result.success) {
    consola.error("❌ Environment validation failed:");
    consola.error(result.error.format());
    process.exit(1);
  }
  
  const validated = result.data;
  
  // Warnings for optional but recommended values
  if (!validated.API_KEY) {
    consola.warn("⚠️  API_KEY not set - API endpoints will be unprotected!");
  }
  
  if (validated.ENABLE_SENSITIVE_LOGS) {
    consola.warn("⚠️  ENABLE_SENSITIVE_LOGS is enabled - SMS content and phone numbers will be logged!");
  }
  
  return validated;
}

export const appEnv = validateEnv();

export type AppEnv = z.infer<typeof envSchema>;
