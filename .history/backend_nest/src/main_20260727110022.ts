import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  //Cors Policy
  const configService = app.get(ConfigService);

  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001',

    methods: ['GET', 'OPTIONS'],

    allowedHeaders: ['Content-Type'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
