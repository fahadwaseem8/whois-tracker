export interface Domain {
  id: number;
  domain_name: string;
  last_checked_at: Date | null;
}

export interface CreateDomainDto {
  domain_name: string;
}

export interface UpdateDomainDto {
  domain_name?: string;
  last_checked_at?: Date;
}
