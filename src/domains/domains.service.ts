import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DomainsRepository } from './domains.repository';
import { Domain, CreateDomainDto, UpdateDomainDto } from './domain.interface';

@Injectable()
export class DomainsService {
  constructor(private readonly domainsRepository: DomainsRepository) {}

  async initializeDatabase(): Promise<void> {
    await this.domainsRepository.createDomainsTable();
    await this.domainsRepository.createWhoisRecordsTable();
  }

  // WHOIS methods
  async getWhois(domain: string): Promise<string> {
    // Clean the domain - remove protocol and path if present
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim();

    // Validate domain format
    if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(cleanDomain)) {
      throw new BadRequestException('Invalid domain format');
    }

    try {
      // Dynamic import for ES module
      const { whoisDomain } = await import('whoiser');

      const result = await whoisDomain(cleanDomain, {
        timeout: 15000, // 15 second timeout for serverless
      });

      // Convert the result to a readable string format
      let whoisText = '';

      for (const [server, data] of Object.entries(result)) {
        if (typeof data === 'string') {
          whoisText += `\n=== ${server} ===\n${data}\n`;
        } else if (data && typeof data === 'object') {
          whoisText += `\n=== ${server} ===\n`;
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              whoisText += `${key}: ${value.join(', ')}\n`;
            } else {
              whoisText += `${key}: ${value}\n`;
            }
          }
        }
      }

      return whoisText || 'No WHOIS data available';
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve WHOIS data: ${error.message}`,
      );
    }
  }

  // CRUD methods
  private cleanDomain(domain: string): string {
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim()
      .toLowerCase();
  }

  async create(
    userId: number,
    createDomainDto: CreateDomainDto,
  ): Promise<Domain> {
    const cleanedDomain = this.cleanDomain(createDomainDto.domain);

    // Check if domain already exists for this user
    const existingDomains =
      await this.domainsRepository.findAllByUserId(userId);
    if (existingDomains.some((d) => d.domain === cleanedDomain)) {
      throw new ConflictException('Domain already exists in your account');
    }

    return this.domainsRepository.create(userId, { domain: cleanedDomain });
  }

  async findAll(userId: number): Promise<Domain[]> {
    return this.domainsRepository.findAllByUserId(userId);
  }

  async findOne(id: number, userId: number): Promise<Domain> {
    const domain = await this.domainsRepository.findOne(id, userId);
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return domain;
  }

  async update(
    id: number,
    userId: number,
    updateDomainDto: UpdateDomainDto,
  ): Promise<Domain> {
    const domain = await this.findOne(id, userId);

    const updateData: Partial<Domain> = {};
    if (updateDomainDto.domain) {
      updateData.domain = this.cleanDomain(updateDomainDto.domain);

      // Check if the new domain already exists for this user (excluding current domain)
      const existingDomains =
        await this.domainsRepository.findAllByUserId(userId);
      if (
        existingDomains.some(
          (d) => d.domain === updateData.domain && d.id !== id,
        )
      ) {
        throw new ConflictException('Domain already exists in your account');
      }
    }

    const updated = await this.domainsRepository.update(id, userId, updateData);
    if (!updated) {
      throw new NotFoundException('Domain not found');
    }
    return updated;
  }

  async remove(id: number, userId: number): Promise<void> {
    const deleted = await this.domainsRepository.delete(id, userId);
    if (!deleted) {
      throw new NotFoundException('Domain not found');
    }
  }

  // Cron job method to fetch WHOIS for all domains
  async fetchWhoisForAllDomains(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const allDomains = await this.domainsRepository.findAll();

    // Get unique domains (deduplicate - same domain might be in multiple user accounts)
    const uniqueDomains = [...new Set(allDomains.map((d) => d.domain))];

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Fetch WHOIS once per unique domain
    for (const domain of uniqueDomains) {
      try {
        const whoisData = await this.getWhois(domain);
        // Upsert: update if exists, create if not
        await this.domainsRepository.upsertWhoisRecord(domain, whoisData);
        success++;
      } catch (error) {
        failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Domain ${domain}: ${errorMessage}`);
      }
    }

    return { success, failed, errors };
  }
}
