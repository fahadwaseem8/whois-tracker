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
  async getWhoisFromDb(
    userId: number,
    domain: string,
  ): Promise<{
    domain: string;
    whois?: string;
    message?: string;
    created_at?: Date;
    updated_at?: Date;
  }> {
    // Clean the domain
    const cleanDomain = this.cleanDomain(domain);

    // Validate domain format
    if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(cleanDomain)) {
      throw new BadRequestException('Invalid domain format');
    }

    // Try to get whois record from database
    const whoisRecord =
      await this.domainsRepository.findWhoisRecordByDomain(cleanDomain);

    if (whoisRecord) {
      // Return the whois data from database
      return {
        domain: cleanDomain,
        whois: whoisRecord.whois_data,
        created_at: whoisRecord.created_at,
        updated_at: whoisRecord.updated_at,
      };
    }

    // If no whois record exists, check if user has this domain in their list
    const userDomains = await this.domainsRepository.findAllByUserId(userId);
    const userHasDomain = userDomains.some((d) => d.domain === cleanDomain);

    if (userHasDomain) {
      return {
        domain: cleanDomain,
        message: 'Domain has not been tracked yet',
      };
    }

    return {
      domain: cleanDomain,
      message: "This domain isn't being tracked yet",
    };
  }

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
          whoisText += `\n=== ${server} ===\n${data as string}\n`;
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to retrieve WHOIS data: ${errorMessage}`,
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

  async findAllPaginated(
    userId: number,
    page: number = 1,
    limit: number = 5,
  ): Promise<{
    data: { domain: string; created_at: Date; updated_at: Date }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const offset = (page - 1) * limit;
    const [domains, total] = await Promise.all([
      this.domainsRepository.findAllByUserIdPaginated(userId, limit, offset),
      this.domainsRepository.countByUserId(userId),
    ]);

    return {
      data: domains.map((d) => ({
        domain: d.domain,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, userId: number): Promise<Domain> {
    const domain = await this.domainsRepository.findOne(id, userId);
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return domain;
  }

  async findOneByDomain(domain: string, userId: number): Promise<Domain> {
    const cleanedDomain = this.cleanDomain(domain);
    const domainRecord = await this.domainsRepository.findByDomainAndUserId(
      cleanedDomain,
      userId,
    );
    if (!domainRecord) {
      throw new NotFoundException('Domain not found');
    }
    return domainRecord;
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

  async updateByDomain(
    domain: string,
    userId: number,
    updateDomainDto: UpdateDomainDto,
  ): Promise<Domain> {
    const cleanedDomain = this.cleanDomain(domain);
    const domainRecord = await this.findOneByDomain(cleanedDomain, userId);

    const updateData: Partial<Domain> = {};
    if (updateDomainDto.domain) {
      updateData.domain = this.cleanDomain(updateDomainDto.domain);

      // Check if the new domain already exists for this user (excluding current domain)
      const existingDomains =
        await this.domainsRepository.findAllByUserId(userId);
      if (
        existingDomains.some(
          (d) => d.domain === updateData.domain && d.id !== domainRecord.id,
        )
      ) {
        throw new ConflictException('Domain already exists in your account');
      }
    }

    const updated = await this.domainsRepository.updateByDomain(
      cleanedDomain,
      userId,
      updateData,
    );
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

  async removeByDomain(domain: string, userId: number): Promise<void> {
    const cleanedDomain = this.cleanDomain(domain);
    const deleted = await this.domainsRepository.deleteByDomain(
      cleanedDomain,
      userId,
    );
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
