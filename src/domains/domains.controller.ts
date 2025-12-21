import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DomainsService } from './domains.service';
import { WhoisDto } from './dto/whois.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('whois')
  async getWhois(@Body() whoisDto: WhoisDto): Promise<{ domain: string; whois: string }> {
    const whoisData = await this.domainsService.getWhois(whoisDto.domain);
    return {
      domain: whoisDto.domain,
      whois: whoisData,
    };
  }
}

