import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import * as whois from 'whois';
import { DomainsRepository } from './domains.repository';
import { Domain, CreateDomainDto, UpdateDomainDto } from './domain.interface';

@Injectable()
export class DomainsService {
  constructor(private readonly domainsRepository: DomainsRepository) {}

  async initializeDatabase(): Promise<void> {
    await this.domainsRepository.createDomainsTable();
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

    return new Promise((resolve, reject) => {
      whois.lookup(cleanDomain, (err: Error | null, data: string | Array<{ server: string; data: string }>) => {
        if (err) {
          reject(
            new BadRequestException(
              `Failed to retrieve WHOIS data: ${err.message}`,
            ),
          );
          return;
        }

        // Handle both string and array responses - return raw text
        if (Array.isArray(data)) {
          resolve(data.map(result => result.data).join('\n\n---\n\n'));
        } else {
          resolve(data);
        }
      });
    });
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

  async create(userId: number, createDomainDto: CreateDomainDto): Promise<Domain> {
    const cleanedDomain = this.cleanDomain(createDomainDto.domain);
    
    // Check if domain already exists for this user
    const existingDomains = await this.domainsRepository.findAllByUserId(userId);
    if (existingDomains.some(d => d.domain === cleanedDomain)) {
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

  async update(id: number, userId: number, updateDomainDto: UpdateDomainDto): Promise<Domain> {
    const domain = await this.findOne(id, userId);
    
    const updateData: Partial<Domain> = {};
    if (updateDomainDto.domain) {
      updateData.domain = this.cleanDomain(updateDomainDto.domain);
      
      // Check if the new domain already exists for this user (excluding current domain)
      const existingDomains = await this.domainsRepository.findAllByUserId(userId);
      if (existingDomains.some(d => d.domain === updateData.domain && d.id !== id)) {
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
}

