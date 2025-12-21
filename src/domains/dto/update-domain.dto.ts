import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateDomainDto {
  @IsString()
  @IsOptional()
  @Matches(
    /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i,
    {
      message: 'Invalid domain format. Please provide a valid domain name (e.g., example.com)',
    },
  )
  domain?: string;
}

