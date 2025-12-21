import { Injectable, BadRequestException } from '@nestjs/common';
import * as whois from 'whois';

@Injectable()
export class DomainsService {
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
}

