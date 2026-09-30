# ADR 0005 — SaaS primero; versión instalable después

- **Estado:** aceptada. Reemplaza el modelo principal de ADR 0003.
- **Fecha:** 2026-09-29

## Contexto

ADR 0003 eligió un servidor local por clínica pensando en una clínica concreta con cortes de
luz. Después quedó claro que:

- DigiClin no tiene todavía una clínica cliente;
- la meta es venderlo a varias clínicas;
- lo desarrolla una sola persona.

Con un servidor local, cada venta sería una instalación en sitio (equipo, UPS, configuración)
y cada clínica un equipo más que mantener.

## Decisión

**DigiClin se ofrece primero como SaaS:** una sola plataforma en la nube, varias clínicas y
suscripción mensual. La **versión instalable en la clínica** (ADR 0003) queda como producto
posterior y se construye con el mismo código.

**Diseño para varias clínicas desde la fase 3:**

- **`clinic_id` en todo dato clínico:** citas, consultas, récipes, documentos, auditoría.
- **Seguridad por fila (RLS) en PostgreSQL:** la propia base impide leer datos de otra clínica, aunque el código tenga un error. La API fija la clínica de cada petición dentro de la transacción. Los detalles se diseñan en la fase 3.
- **La identidad de la persona es global:** una cuenta sirve en varias clínicas (médico que atiende en dos, paciente de dos). Los datos clínicos pertenecen a la clínica que los crea.
- **Historia compartida entre clínicas** con consentimiento del paciente (FHIR `Consent`): posible a futuro, fuera del MVP.
- Un diseño para varias clínicas también se instala para una sola: esa es la versión local.

**Resiliencia sin servidor local:**

- **Nada esencial depende de servicios frágiles:** archivos detrás de un adaptador, correo en cola, HaveIBeenPwned se omite si no responde.
- **Agenda del día exportable** a PDF para imprimir.
- **Recomendación de conectividad** para las clínicas: internet de respaldo (4G) y UPS para el enrutador.
- **Modo sin conexión limitado** (agenda y pacientes del día guardados en el navegador): fase posterior.

**Alojamiento:** Render + Neon + R2, como en el plan original. El piloto usa los planes gratuitos; antes de datos reales, planes pagos, respaldos probados y revisión legal. La revisión legal incluye si los datos de salud pueden alojarse fuera de Venezuela, algo que **no se asume sin verificar**.

## Consecuencias

- ADR 0003 queda **pospuesto**. Su análisis se reutiliza para la versión instalable.
- El orden de fases aprobado se mantiene. La fase 7 pasa a ser el lanzamiento del SaaS: planes pagos, dominio, correo con Brevo, `CLIENT_IP_HEADER`.
- Para varias clínicas faltan, **después del piloto**:
  - el alta de una clínica nueva desde la web (hoy lo hace `bootstrap:clinic`);
  - la facturación de suscripciones;
  - una portada comercial de DigiClin, distinta de la de cada clínica.
