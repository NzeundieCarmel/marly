import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.WEB_ORIGINE ?? 'http://localhost:3001',
  });

  // Refuse toute donnée non prévue et applique les règles des fichiers .dto.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // En local : 127.0.0.1. Dans Docker : HOTE=0.0.0.0 pour etre joignable par le site
  await app.listen(
    Number(process.env.PORT ?? 4001),
    process.env.HOTE ?? '127.0.0.1',
  );

  console.log('API Marly disponible sur http://localhost:4001/api/v1');
}

bootstrap().catch((error: unknown) => {
  console.error("Echec du demarrage de l'API Marly", error);
  process.exitCode = 1;
});
