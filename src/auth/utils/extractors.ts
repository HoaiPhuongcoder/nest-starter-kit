import { Request } from 'express';

export const makeCookieExtractor = (name: string) => {
  return (req: Request) => {
    const cookies = req.cookies as Record<string, string> | undefined;

    return cookies?.[name] || null;
  };
};
