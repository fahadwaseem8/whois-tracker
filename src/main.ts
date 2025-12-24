import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { DomainsService } from './domains/domains.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static assets (favicon, etc.)
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS with explicit headers
  app.enableCors({
    origin: true, // Allow all origins (or specify your frontend URL)
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Initialize database tables
  const usersService = app.get(UsersService);
  await usersService.initializeDatabase();

  const domainsService = app.get(DomainsService);
  await domainsService.initializeDatabase();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap();
