# ADR 0003 — Servidor local en la clínica

- **Estado:** pospuesta por ADR 0005 (SaaS primero). Se retoma para la versión instalable.
- **Fecha:** 2026-09-29

## Contexto

En Venezuela los cortes de luz y de internet son frecuentes. Un sistema que vive solo en la
nube deja a la clínica a ciegas a mitad de una consulta: no se puede ver la historia, ni la
agenda, ni emitir el récipe. La clínica de referencia (Clínica Ana Cecilia, C.A., Caracas)
funciona con emergencia las 24 horas, así que ese riesgo no es aceptable.

Se evaluaron dos caminos:

1. **Nube con caché en el navegador (PWA sin conexión).** Con internet caído solo se puede leer lo guardado (la agenda y las historias de los pacientes agendados) y guardar borradores. Tiene tres problemas:
   - datos de salud cifrados en cada equipo;
   - conflictos al sincronizar;
   - un paciente que llega sin cita queda fuera.
2. **Servidor en la clínica.** DigiClin corre dentro de la red local y no depende de internet para funcionar.

## Decisión

DigiClin se instala en un **servidor dentro de la clínica** (un mini PC) conectado a una
**UPS**, junto con el enrutador de la red interna. Los equipos de recepción, consultorios y
dirección lo usan por la red local.

- **Sin internet sigue funcionando** todo lo interno:
  - agenda y citas;
  - fichas e historias clínicas;
  - consultas;
  - récipes en PDF para imprimir.
- **Con internet se suman:**
  - el acceso remoto y el portal del paciente, mediante un túnel (candidato: Cloudflare Tunnel, gratis);
  - el envío de correos, que quedan en cola mientras no hay conexión;
  - los enlaces de WhatsApp;
  - los respaldos cifrados en la nube.

La arquitectura actual ya lo permite: un solo proceso Node (API + web) y PostgreSQL
(ADR 0001). Render y Neon quedan para demostración y pruebas.

## Consecuencias desde ya (fase 3 en adelante)

- **Ninguna función esencial puede depender de internet:**
  - **Archivos:** detrás de un adaptador, con disco local en el servidor de la clínica y R2 en la nube.
  - **Correo:** a una cola que se vacía cuando hay conexión.
  - **Contraseñas filtradas:** la revisión (HaveIBeenPwned) se **omite** sin conexión, en lugar de bloquear el registro.
  - **Recursos de la web:** sin CDN. Las fuentes ya se sirven localmente.
- **Seguridad por fila (RLS) en Postgres:** no se aplica por ahora. Cada clínica tiene su propia base. Se reconsidera si DigiClin se ofrece como servicio compartido entre clínicas. Todo dato clínico sigue llevando `clinic_id`.
- **El servidor guarda datos de salud:** el disco va **cifrado**, el equipo en un lugar con acceso restringido, y hay respaldos con una prueba de restauración documentada.

## Por resolver en la fase 7 (no se asume nada sin verificar)

- **Hardware mínimo** del mini PC y **autonomía de la UPS** (cuánto dura un corte típico).
- **Hora del servidor:** la verificación en dos pasos (TOTP) depende de que la hora sea correcta. Hay que definir cómo se mantiene sin internet, por ejemplo con el reloj del enrutador o sincronizando al volver la conexión.
- **Actualizaciones:** cómo se instala una versión nueva y cómo se vuelve atrás.
- **Túnel:** si el nombre fijo del túnel exige un dominio gestionado en Cloudflare, y qué pasa con el portal del paciente mientras no hay internet.
- **Mantenimiento:** quién se encarga del equipo en la clínica.
