export interface JwtTokenPayload {
  sub: string;
  deviceId: string;
  jti: string;
  iss: string;
  aud: string;
  iat: string;
  exp: string;
}
