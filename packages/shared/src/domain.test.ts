import { describe, expect, it } from 'vitest';
import { administrativeSex, appointmentStatus } from './domain.js';

describe('enums del dominio', () => {
  it('sexo administrativo acepta solo los codigos FHIR', () => {
    expect(administrativeSex.options).toEqual(['male', 'female', 'other', 'unknown']);
    expect(administrativeSex.safeParse('M').success).toBe(false);
  });

  it('estado de cita rechaza valores fuera del subconjunto FHIR', () => {
    expect(appointmentStatus.safeParse('booked').success).toBe(true);
    expect(appointmentStatus.safeParse('confirmed').success).toBe(false);
  });
});
