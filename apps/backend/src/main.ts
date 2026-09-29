// First: entity decorators read DB_TYPE at import time (see load-env.ts).
import './load-env';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { apiReference } from '@scalar/nestjs-api-reference';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { connectionOptions } from './database/connection';
import { assertSchemaVersion } from './database/schema-version';

/**
 * Refuse to start on a database that is not at SCHEMA_VERSION. It runs on its
 * own short-lived connection BEFORE Nest boots, because module init hooks read
 * portal settings — on an unmigrated database they would fail first, with a
 * bare "no such table".
 */
async function checkSchema(): Promise<void> {
  const dataSource = new DataSource({ ...connectionOptions((key) => process.env[key]), entities: [] });
  await dataSource.initialize();
  try {
    await assertSchemaVersion(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

async function bootstrap() {
  try {
    await checkSchema();
  } catch (error) {
    console.error(`\n${(error as Error).message}\n`);
    process.exit(1);
  }

  // rawBody: Stripe signs the exact bytes it sent, so the dues webhook must
  // verify against the unparsed body (see PaymentWebhookController).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Behind a reverse proxy (the frontend image's nginx), every request arrives
  // from the proxy's address. TRUST_PROXY tells Express to take the client IP
  // from X-Forwarded-For instead — without it the contact form's per-IP rate
  // limit counts every visitor as one. Express syntax: a hop count (`1`),
  // `true`, or a subnet list. Unset trusts nothing, the safe default when the
  // API is exposed directly.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true' || trustProxy);
  }

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Helix X API')
    .setDescription('REST API for the Helix X platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  // Expose raw OpenAPI JSON (the input to the client SDK codegen)
  app.getHttpAdapter().get('/docs-json', (_req: any, res: any) => {
    res.json(document);
  });

  // Scalar API reference UI
  app.use(
    '/docs-scalar',
    apiReference({
      theme: 'alternate',
      url: '/docs-json',
    }),
  );

  SwaggerModule.setup('docs', app, document); 

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Server:       http://localhost:${port}/api`);
  console.log(`Scalar UI:    http://localhost:${port}/docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/docs-json`);
}

bootstrap();
