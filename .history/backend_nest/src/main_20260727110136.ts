import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Cors Policy Frontend
  const configService = app.get(ConfigService);

  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001',

    methods: ['GET', 'OPTIONS'],

    allowedHeaders: ['Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
