# ADR 0002 — Identidad y acceso

- **Estado:** aceptada
- **Fecha:** 2026-09-29

## Contexto

DigiClin maneja datos de salud. Las decisiones de identidad tienen consecuencias clínicas y
legales:

- quién puede ver una historia;
- qué se revela al registrarse;
- cuánto dura una sesión en una computadora compartida.

Este ADR fija las reglas de la fase 2. Todas están cubiertas por tests en
`apps/api/test/identity.e2e-spec.ts` y `apps/api/test/staff-2fa.e2e-spec.ts`.

## Decisiones

**Una sola cuenta por persona**, con Better Auth dentro de la API:

- Toda cuenta verificada puede usar el portal de paciente.
- El acceso de personal sale de la pertenencia a una clínica. Así una misma persona puede ser dueña y médica.

**Clínica = organización de Better Auth**, con tres roles (`apps/api/src/auth/access-control.ts`):

| Rol                       | Gestión de la clínica                                 |
| ------------------------- | ----------------------------------------------------- |
| `owner` (dueño)           | Todo. Es el único que cambia roles o retira miembros. |
| `admin` (socio directivo) | Edita datos de la clínica e invita **solo médicos**.  |
| `doctor` (médico)         | Ninguna.                                              |

- Nadie entra como dueño por invitación.
- Solo el dueño invita socios.

Estas reglas se aplican con hooks del plugin; un rol que no tiene permisos no alcanza para garantizarlas.

**Alta de médicos por dos caminos:**

- **Autorregistro:** el médico crea su cuenta, verifica su correo y envía su solicitud desde su sesión. La solicitud lleva especialidades y registros profesionales, modelados como FHIR `Practitioner.qualification`. La clínica la aprueba o la rechaza con un motivo, que le llega por correo.
- **Invitación:** el médico invitado por la clínica queda aprobado al aceptar.

No hay un endpoint público que cree perfiles médicos, así que nadie puede adjudicar un perfil a una cuenta ajena.

**Sin revelar quién tiene cuenta.** Ser paciente de una clínica ya es un dato sensible:

- Registrarse con un correo existente responde igual que un registro nuevo (comportamiento de Better Auth con verificación obligatoria). El dueño real del correo recibe un aviso.
- "Olvidé mi contraseña" responde igual exista o no la cuenta.

**Contraseñas:**

- Mínimo 12 caracteres, sin reglas de composición.
- Se rechazan las que aparecen en filtraciones conocidas (HaveIBeenPwned por k-anonimato: la contraseña no sale del servidor).
- El criterio sigue NIST SP 800-63B.
- Restablecer la contraseña cierra todas las sesiones.

**Sesiones:**

- Duran 12 horas y se extienden con la actividad.
- Cookie `httpOnly`, `SameSite=Lax`, en el mismo origen.
- "Confiar en este dispositivo" para la 2FA dura 30 días, fijado explícitamente en la configuración.

**Verificación en dos pasos (TOTP) para el personal:**

- Está disponible para todos.
- Con `REQUIRE_STAFF_2FA=true` es obligatoria para dueños, socios y médicos. Sin ella, la API responde 403 a los endpoints de gestión y la web redirige a la configuración.

**Denegar por defecto:**

- Todo endpoint de la API exige sesión salvo los marcados `@Public`.
- El middleware de la web es comodidad: la API vuelve a comprobar en cada petición.

**Redirecciones:** `?next=` solo acepta rutas internas (`apps/web/src/lib/safe-next.ts`). La v2 tenía un redirect abierto.

## Pendientes conocidos

- **IP del cliente:** sin `CLIENT_IP_HEADER`, los límites de intentos de ingreso no distinguen clientes (un balde compartido). Hay que verificar qué cabecera pone Render antes del lanzamiento.
- **Códigos HTTP de Better Auth:** Better Auth responde 401 (no 403) cuando un socio intenta retirar a un miembro. El rechazo funciona y el test lo verifica por su efecto.
- **Aviso legal:** el registro todavía no muestra términos ni política de privacidad. Deben redactarse con asesoría legal antes de cargar datos reales; no se publican textos inventados.
