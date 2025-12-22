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
    await this.domainsRepository.createUserDomainsTable();
    await this.domainsRepository.createWhoisRecordsTable();
  }

  // WHOIS methods
  async getWhoisFromDb(
    userId: string,
    domain: string,
  ): Promise<{
    domain: string;
    whois?: any;
    message?: string;
    last_checked_at?: Date | null;
  }> {
    // Clean the domain
    const cleanDomain = this.cleanDomain(domain);

    // Validate domain format
    if (!/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(cleanDomain)) {
      throw new BadRequestException('Invalid domain format');
    }

    // Find the domain
    const domainRecord =
      await this.domainsRepository.findDomainByName(cleanDomain);

    if (!domainRecord) {
      return {
        domain: cleanDomain,
        message: "This domain isn't being tracked yet",
      };
    }

    // Check if user is watching this domain
    const isWatching = await this.domainsRepository.isUserWatchingDomain(
      userId,
      domainRecord.id,
    );

    if (!isWatching) {
      return {
        domain: cleanDomain,
        message: "You aren't watching this domain",
      };
    }

    // Get WHOIS record
    const whoisRecord = await this.domainsRepository.findWhoisRecordByDomainId(
      domainRecord.id,
    );

    if (whoisRecord) {
      return {
        domain: cleanDomain,
        whois: {
          registrar: whoisRecord.registrar,
          expiry_date: whoisRecord.expiry_date,
          creation_date: whoisRecord.creation_date,
          raw_text: whoisRecord.raw_text,
          updated_at: whoisRecord.updated_at,
        },
        last_checked_at: domainRecord.last_checked_at,
      };
    }

    return {
      domain: cleanDomain,
      message: 'Domain has not been tracked yet',
      last_checked_at: domainRecord.last_checked_at,
    };
  }

  async getWhois(domain: string): Promise<{
    registrar: string | null;
    expiryDate: Date | null;
    creationDate: Date | null;
    rawText: string;
  }> {
    // Clean the domain - remove protocol and path if present
    const cleanDomain = this.cleanDomain(domain);

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

      // Convert the result to a readable string format and parse data
      let whoisText = '';
      let registrar: string | null = null;
      let expiryDate: Date | null = null;
      let creationDate: Date | null = null;

      for (const [server, data] of Object.entries(result)) {
        if (typeof data === 'string') {
          whoisText += `\n=== ${server} ===\n${data as string}\n`;
        } else if (data && typeof data === 'object') {
          whoisText += `\n=== ${server} ===\n`;
          for (const [key, value] of Object.entries(data)) {
            // Extract specific fields
            if (
              key.toLowerCase().includes('registrar') &&
              !registrar &&
              typeof value === 'string'
            ) {
              registrar = value;
            }
            if (
              (key.toLowerCase().includes('expiry') ||
                key.toLowerCase().includes('expiration')) &&
              !expiryDate
            ) {
              const dateValue = Array.isArray(value) ? value[0] : value;
              if (dateValue) {
                const parsed = new Date(dateValue as string);
                if (!isNaN(parsed.getTime())) expiryDate = parsed;
              }
            }
            if (
              (key.toLowerCase().includes('creation') ||
                key.toLowerCase().includes('created')) &&
              !creationDate
            ) {
              const dateValue = Array.isArray(value) ? value[0] : value;
              if (dateValue) {
                const parsed = new Date(dateValue as string);
                if (!isNaN(parsed.getTime())) creationDate = parsed;
              }
            }

            if (Array.isArray(value)) {
              whoisText += `${key}: ${value.join(', ')}\n`;
            } else {
              whoisText += `${key}: ${value}\n`;
            }
          }
        }
      }

      return {
        registrar,
        expiryDate,
        creationDate,
        rawText: whoisText || 'No WHOIS data available',
      };
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

  async create(userId: string, createDomainDto: CreateDomainDto): Promise<{
    domain: Domain;
    message: string;
  }> {
    const cleanedDomain = this.cleanDomain(createDomainDto.domain_name);

    // Find or create domain
    let domainRecord = await this.domainsRepository.findDomainByName(
      cleanedDomain,
    );

    if (!domainRecord) {
      domainRecord = await this.domainsRepository.createDomain({
        domain_name: cleanedDomain,
      });
    }

    // Check if user is already watching this domain
    const isWatching = await this.domainsRepository.isUserWatchingDomain(
      userId,
      domainRecord.id,
    );

    if (isWatching) {
      throw new ConflictException('You are already watching this domain');
    }

    // Add domain to user's watch list
    await this.domainsRepository.addDomainToUser(userId, domainRecord.id);

    return {
      domain: domainRecord,
      message: 'Domain added to your watch list',
    };
  }

  async findAll(userId: string): Promise<Domain[]> {
    return this.domainsRepository.findDomainsByUserId(userId);
  }

  async findAllPaginated(
    userId: string,
    page: number = 1,
    limit: number = 5,
  ): Promise<{
    data: {
      domain_name: string;
      last_checked_at: Date | null;
      whois?: any;
    }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const offset = (page - 1) * limit;
    const [domainsWithWhois, total] = await Promise.all([
      this.domainsRepository.findDomainsWithWhoisByUserId(userId),
      this.domainsRepository.countDomainsByUserId(userId),
    ]);

    // Apply pagination to the in-memory result
    const paginatedData = domainsWithWhois
      .slice(offset, offset + limit)
      .map(({ domain, whois }) => ({
        domain_name: domain.domain_name,
        last_checked_at: domain.last_checked_at,
        whois: whois
          ? {
              registrar: whois.registrar,
              expiry_date: whois.expiry_date,
              creation_date: whois.creation_date,
              updated_at: whois.updated_at,
            }
          : undefined,
      }));

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(domainName: string, userId: string): Promise<void> {
    const cleanedDomain = this.cleanDomain(domainName);
    const domainRecord =
      await this.domainsRepository.findDomainByName(cleanedDomain);

    if (!domainRecord) {
      throw new NotFoundException('Domain not found');
    }

    const isWatching = await this.domainsRepository.isUserWatchingDomain(
      userId,
      domainRecord.id,
    );

    if (!isWatching) {
      throw new NotFoundException('You are not watching this domain');
    }

    const deleted = await this.domainsRepository.removeDomainFromUser(
      userId,
      domainRecord.id,
    );

    if (!deleted) {
      throw new NotFoundException('Failed to remove domain');
    }
  }

  // Cron job method to fetch WHOIS for all domains
  async fetchWhoisForAllDomains(): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const allDomains = await this.domainsRepository.findAllDomains();

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Fetch WHOIS for each unique domain
    for (const domain of allDomains) {
      try {
        const whoisData = await this.getWhois(domain.domain_name);

        // Upsert WHOIS record
        await this.domainsRepository.upsertWhoisRecord(
          domain.id,
          whoisData.registrar,
          whoisData.expiryDate,
          whoisData.creationDate,
          whoisData.rawText,
        );

        // Update last_checked_at
        await this.domainsRepository.updateDomainLastChecked(
          domain.id,
          new Date(),
        );

        success++;
      } catch (error) {
        failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Domain ${domain.domain_name}: ${errorMessage}`);
      }
    }

    return { success, failed, errors };
  }
}
