export const mapPatientProfile = (patient) => {
  if (!patient) return null;

  return {
    id: patient.id ?? null,
    fullName: patient.full_name ?? null,
    email: patient.email ?? null,
    phone: patient.phone ?? null,
    documentId: patient.document_id ?? null,
    birthDate:
      patient.birth_date instanceof Date
        ? patient.birth_date.toISOString().slice(0, 10)
        : (patient.birth_date ?? null),
    gender: patient.gender ?? null,
    age: typeof patient.age === 'number' ? patient.age : null,
    preferredChannel: patient.preferred_channel ?? null,
  };
};
