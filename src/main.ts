import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap();
