import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainsService } from './domains.service';
import { WhoisDto } from './dto/whois.dto';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Domain } from './domain.interface';

interface UserRequest {
  user: {
    id: string; // UUID
    email: string;
  };
}

@Controller('domains')
export class DomainsController {
  constructor(
    private readonly domainsService: DomainsService,
    private readonly configService: ConfigService,
  ) {}

  // CRUD endpoints
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req: UserRequest,
    @Body() createDomainDto: CreateDomainDto,
  ): Promise<{ message: string; domain: Domain }> {
    const result = await this.domainsService.create(
      req.user.id,
      createDomainDto,
    );
    return { message: result.message, domain: result.domain };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: UserRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
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
    return this.domainsService.findAllPaginated(
      req.user.id,
      page || 1,
      limit || 5,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':domain')
  async findOne(
    @Request() req: UserRequest,
    @Param('domain') domain: string,
  ): Promise<{
    domain: string;
    whois?: any;
    message?: string;
    last_checked_at?: Date | null;
  }> {
    return this.domainsService.getWhoisFromDb(req.user.id, domain);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':domain')
  async remove(
    @Request() req: UserRequest,
    @Param('domain') domain: string,
  ): Promise<{ message: string }> {
    await this.domainsService.remove(domain, req.user.id);
    return { message: 'Domain removed from your watch list' };
  }

  // Cron endpoint - protected by Vercel cron header or secret token
  @Get('cron/fetch-whois')
  async cronFetchWhois(
    @Headers('x-vercel-cron') vercelCronHeader: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    message: string;
    success: number;
    failed: number;
    errors: string[];
    emailsSent: number;
    emailsFailed: number;
  }> {
    // Vercel cron automatically sends x-vercel-cron header
    // Also allow manual calls with CRON_SECRET
    const cronSecret = this.configService.get<string>('CRON_SECRET');
    const isVercelCron = vercelCronHeader === '1';
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !hasValidSecret) {
      throw new UnauthorizedException('Unauthorized: Invalid cron request');
    }

    const result = await this.domainsService.fetchWhoisForAllDomains();
    return {
      message: `WHOIS fetch completed. Success: ${result.success}, Failed: ${result.failed}, Emails sent: ${result.emailsSent}, Emails failed: ${result.emailsFailed}`,
      ...result,
    };
  }
}
