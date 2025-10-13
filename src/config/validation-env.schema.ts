import z from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_ACCESS_EXPIRES: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES: z.string(),
  REDIS_URL: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnvironment = (config: Record<string, unknown>) => {
  return envSchema.parse(config);
};
