export interface User {
  id: string; // UUID
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
}
