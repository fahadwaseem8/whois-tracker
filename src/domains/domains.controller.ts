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
    id: number;
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
  ): Promise<{ message: string }> {
    await this.domainsService.create(req.user.id, createDomainDto);
    return { message: 'Domain added successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: UserRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{
    data: { domain: string; created_at: Date; updated_at: Date }[];
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
    whois?: string;
    message?: string;
    created_at?: Date;
    updated_at?: Date;
  }> {
    return this.domainsService.getWhoisFromDb(req.user.id, domain);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':domain')
  async update(
    @Request() req: UserRequest,
    @Param('domain') domain: string,
    @Body() updateDomainDto: UpdateDomainDto,
  ): Promise<{
    message: string;
    domain: string;
    created_at: Date;
    updated_at: Date;
  }> {
    const updated = await this.domainsService.updateByDomain(
      domain,
      req.user.id,
      updateDomainDto,
    );
    return {
      message: 'Domain updated successfully',
      domain: updated.domain,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':domain')
  async remove(
    @Request() req: UserRequest,
    @Param('domain') domain: string,
  ): Promise<{ message: string }> {
    await this.domainsService.removeByDomain(domain, req.user.id);
    return { message: 'Domain deleted successfully' };
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
      message: `WHOIS fetch completed. Success: ${result.success}, Failed: ${result.failed}`,
      ...result,
    };
  }
}
