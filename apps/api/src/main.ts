import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: 'http://localhost:3001',
  });

  // Refuse toute donnée non prévue et applique les règles des fichiers .dto.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(4001, '127.0.0.1');

  console.log('API Marly disponible sur http://localhost:4001/api/v1');
}

bootstrap().catch((error: unknown) => {
  console.error("Echec du demarrage de l'API Marly", error);
  process.exitCode = 1;
});