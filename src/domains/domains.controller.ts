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
} from '@nestjs/common';
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
  constructor(private readonly domainsService: DomainsService) {}

  // WHOIS endpoint
  @UseGuards(JwtAuthGuard)
  @Post('whois')
  async getWhois(@Body() whoisDto: WhoisDto): Promise<{ domain: string; whois: string }> {
    const whoisData = await this.domainsService.getWhois(whoisDto.domain);
    return {
      domain: whoisDto.domain,
      whois: whoisData,
    };
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
}

