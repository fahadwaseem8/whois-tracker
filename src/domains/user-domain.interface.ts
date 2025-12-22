export interface UserDomain {
  user_id: string; // UUID reference to users.id
  domain_id: number; // Reference to domains.id
}

export interface CreateUserDomainDto {
  user_id: string;
  domain_id: number;
}
