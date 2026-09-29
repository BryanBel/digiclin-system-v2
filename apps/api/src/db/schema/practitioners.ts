import type { Qualification } from '@digiclin/shared';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organization, user } from './auth.js';

export const practitionerStatusEnum = pgEnum('practitioner_status', [
  'pending',
  'approved',
  'rejected',
  'suspended',
]);

/**
 * Perfil profesional del medico (FHIR Practitioner) y su estado frente a una clinica.
 * MVP de una clinica: un perfil por usuario con la clinica a la que aplico. Con varias
 * clinicas, el estado pasara a una tabla de afiliaciones (FHIR PractitionerRole).
 */
export const practitionerProfiles = pgTable(
  'practitioner_profiles',
  {
    userId: uuid()
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    clinicId: uuid().references(() => organization.id, { onDelete: 'set null' }),
    status: practitionerStatusEnum().notNull().default('pending'),
    specialties: text().array().notNull().default([]),
    qualifications: jsonb().$type<Qualification[]>().notNull().default([]),
    reviewedBy: uuid().references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: timestamp({ withTimezone: true }),
    reviewNote: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.clinicId, table.status)],
);
