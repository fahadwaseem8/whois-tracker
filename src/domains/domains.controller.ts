import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
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

  // WHOIS endpoint
  @UseGuards(JwtAuthGuard)
  @Post('whois')
  async getWhois(
    @Request() req: UserRequest,
    @Body() whoisDto: WhoisDto,
  ): Promise<{
    domain: string;
    whois?: string;
    message?: string;
    created_at?: Date;
    updated_at?: Date;
  }> {
    return this.domainsService.getWhoisFromDb(req.user.id, whoisDto.domain);
  }

  // CRUD endpoints
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req: UserRequest,
    @Body() createDomainDto: CreateDomainDto,
  ): Promise<Domain> {
    return this.domainsService.create(req.user.id, createDomainDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req: UserRequest): Promise<Domain[]> {
    return this.domainsService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(
    @Request() req: UserRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Domain> {
    return this.domainsService.findOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Request() req: UserRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDomainDto: UpdateDomainDto,
  ): Promise<Domain> {
    return this.domainsService.update(id, req.user.id, updateDomainDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Request() req: UserRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.domainsService.remove(id, req.user.id);
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
