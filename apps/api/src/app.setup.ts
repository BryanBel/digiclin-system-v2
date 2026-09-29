import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { API_VERSION } from './version.js';

export const API_PREFIX = 'api';

/** Configuracion comun a main.ts, los tests e2e y la exportacion de OpenAPI. */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix(API_PREFIX);
  // Cabeceras de seguridad solo en la API; la web (Astro) define las suyas.
  app.use(`/${API_PREFIX}`, helmet());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('DigiClin API')
    .setDescription(
      'API del gestor clinico DigiClin. Modelo de datos alineado con HL7 FHIR R5; ver docs/modelo-de-datos.md.',
    )
    .setVersion(API_VERSION)
    .build();
  return SwaggerModule.createDocument(app, config);
}
