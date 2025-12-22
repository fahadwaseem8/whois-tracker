export interface WhoisRecord {
  id: number;
  domain_id: number;
  registrar: string | null;
  expiry_date: Date | null;
  creation_date: Date | null;
  raw_text: string;
  updated_at: Date;
}
