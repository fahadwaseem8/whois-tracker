export interface JwtPayload {
  sub: string; // UUID
  email: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    email: string;
  };
}
