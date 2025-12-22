import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, CreateUserDto } from './user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async initializeDatabase(): Promise<void> {
    await this.usersRepository.createUsersTable();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.usersRepository.create(createUserDto);
  }
}
