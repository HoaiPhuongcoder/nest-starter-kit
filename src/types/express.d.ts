import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { userId: string };

    cookies?: Record<string, string>;
  }
}
