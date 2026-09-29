import { eq } from 'drizzle-orm';
import type { Auth } from '../auth/auth.factory.js';
import type { Database } from '../db/database.module.js';
import { member, organization, user } from '../db/schema/index.js';

export interface BootstrapClinicInput {
  clinicName: string;
  slug: string;
  owner: { name: string; email: string };
  /** A donde lleva el enlace del correo para que el dueno elija su contrasena. */
  resetPasswordUrl: string;
}

/**
 * Crea una clinica y su dueno. El dueno no recibe una contrasena: le llega un enlace para
 * elegirla (nadie mas la conoce, ni siquiera quien corre el script). Si la cuenta ya existe,
 * se reutiliza y solo se le da la titularidad.
 */
export async function bootstrapClinic(db: Database, auth: Auth, input: BootstrapClinicInput) {
  const email = input.owner.email.trim().toLowerCase();

  const [taken] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, input.slug))
    .limit(1);
  if (taken) throw new Error(`Ya existe una clinica con el identificador "${input.slug}".`);

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  const ctx = await auth.$context;
  const ownerId =
    existing?.id ??
    (
      await ctx.internalAdapter.createUser(
        {
          name: input.owner.name.trim(),
          email,
          // La titularidad la da quien administra el servidor; el correo se prueba al elegir
          // la contrasena desde el enlace que le llega.
          emailVerified: true,
        },
        { method: 'admin' },
      )
    ).id;

  const clinic = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(organization)
      .values({ name: input.clinicName.trim(), slug: input.slug, createdAt: new Date() })
      .returning({ id: organization.id, name: organization.name });
    await tx.insert(member).values({
      organizationId: created!.id,
      userId: ownerId,
      role: 'owner',
      createdAt: new Date(),
    });
    return created!;
  });

  if (!existing) {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: input.resetPasswordUrl } });
  }

  return { clinic, ownerId, ownerCreated: !existing };
}
