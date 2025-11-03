export interface SessionCreateParams {
  rtJti: string;
  atJti: string;
  userId: string;
  deviceId: string;
}
export type SessionMeta = {
  userId: string;
  deviceId: string;
  jti: {
    at: string; // access token jti
    rt: string; // refresh token jti
  };
  createdAt: number;
  rotatedFrom?: string | null; // jti cũ nếu rotate
  reused: boolean; // true nếu reuse session cũ thay vì tạo mới
  accessTtlSec: number; // TTL của access token (để set expiresIn)
  refreshTtlSec: number; // TTL của refresh token (để set cookie maxAge)
};
