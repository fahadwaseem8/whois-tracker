export interface Domain {
  id: number;
  user_id: number;
  domain: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDomainDto {
  domain: string;
}

export interface UpdateDomainDto {
  domain?: string;
}
