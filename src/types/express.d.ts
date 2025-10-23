import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { userId: string; deviceId: string; jti: string };

    cookies?: Record<string, string>;
  }
}
