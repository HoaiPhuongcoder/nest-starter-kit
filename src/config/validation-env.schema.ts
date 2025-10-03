import z from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnvironment = (config: Record<string, unknown>) => {
  return envSchema.parse(config);
};
