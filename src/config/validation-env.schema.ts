import z from 'zod';

const Bool = z
  .string()
  .transform((s) => ['true', '1', 'yes', 'on'].includes(s.toLowerCase()))
  .or(z.boolean()) // phòng khi bạn inject boolean trực tiếp (e2e)
  .default('false' as unknown as boolean);

const IntMs = z
  .string()
  .transform((s) => Number.parseInt(s))
  .refine((n) => Number.isFinite(n) && n >= 0, 'Must be non-negative number')
  .or(z.number())
  .default(0);

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_ACCESS_EXPIRES: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES: z.string(),
  COOKIE_DOMAIN: z.string(),
  COOKIE_SECURE: Bool.default(false),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']),
  ACCESS_TOKEN_MAX_AGE_MS: IntMs,
  REFRESH_TOKEN_MAX_AGE_MS: IntMs,
  JWT_ISSUER: z.url(),
  JWT_AUDIENCE: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnvironment = (config: Record<string, unknown>) => {
  return envSchema.parse(config);
};
