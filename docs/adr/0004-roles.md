# ADR 0004 — Catálogo de roles

- **Estado:** aceptada. Cada rol se implementa en la fase indicada.
- **Fecha:** 2026-09-29

## Contexto

La fase 2 creó dueño, socio y médico, y la decisión del servidor local (ADR 0003) sumó
recepción. Bryan pidió cubrir todos los roles que necesita una clínica real, tomando como
referencia sistemas usados en el mundo. La clínica de referencia (Clínica Ana Cecilia, C.A.)
es multiespecialidad, con emergencia, laboratorio, imágenes, hospitalización y maternidad.

### Referencias revisadas

Se revisaron sistemas con documentación pública. Los propietarios, como Epic u Oracle Health, no publican su catálogo de roles.

- **OpenEMR:** grupos por defecto Administradores, Médicos, Clínicos (enfermería y asistentes), Recepción y Contabilidad.
- **OpenMRS**, aplicación de referencia: Médico, Enfermería, Empleado de registro y Administrador del hospital.
- **GNU Health:** sus áreas funcionales son enfermería, laboratorio, imágenes, farmacia, inventario, facturación y recepción.
- **HL7 FHIR R5**, `PractitionerRole`: médico, enfermería, farmacéutico, investigador, docente e informática, con las especialidades en SNOMED CT.

## Decisión

**Principios:**

- Cada rol recibe **lo mínimo necesario** para su trabajo.
- Los roles se **combinan**: una dueña puede ser médica y un director médico atiende pacientes.
- Las especialidades (pediatría, radiología, anestesiología…) **no son roles**: son datos del perfil del médico.
- Todo acceso a contenido clínico queda en la auditoría.

| Rol                                                          | Qué hace                                                                                                                               | Contenido clínico                                                  | Fase                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------- |
| **Dueño**                                                    | Titular de la clínica. Todo lo de Administración, además de nombrar a la administración y a la dirección médica.                       | No                                                                 | 2 (hecho)               |
| **Administración** (socios y gerencia)                       | Opera la clínica: datos de la clínica, personal, reportes. Invita a todos los roles salvo dueño y administración.                      | No                                                                 | 2 (hecho, hoy "socio")  |
| **Director médico**                                          | Gobierno clínico: **aprueba las credenciales de los médicos**, revisa la auditoría y los accesos de emergencia.                        | Solo si además es médico tratante                                  | 4                       |
| **Médico** (incluye especialistas)                           | Consulta, diagnóstico, récipe, órdenes e informes (el radiólogo firma el informe de imágenes).                                         | Sí, con relación de atención                                       | 2 (alta) · 4 (consulta) |
| **Enfermería**                                               | Triaje y signos vitales antes de la consulta; en hospitalización, notas de enfermería y registro de la administración de medicamentos. | Parcial: signos vitales, alergias, indicaciones, sus propias notas | 4                       |
| **Recepción y admisión**                                     | Registra pacientes, maneja la agenda, marca llegadas, admite ingresos.                                                                 | No                                                                 | 3                       |
| **Historias médicas** (archivo)                              | Custodia del expediente: digitaliza historias en papel, entrega copias autorizadas.                                                    | Solo documentos; no edita notas clínicas                           | 5                       |
| **Laboratorio** (bioanalista)                                | Recibe órdenes de laboratorio y carga resultados.                                                                                      | Solo órdenes y resultados de laboratorio                           | módulo de laboratorio   |
| **Imágenes** (técnico)                                       | Realiza los estudios de rayos X, ecografía o mamografía y sube las imágenes.                                                           | Solo órdenes de imágenes                                           | módulo de imágenes      |
| **Farmacia**                                                 | Despacha contra récipe y lleva el inventario.                                                                                          | Solo récipes a despachar                                           | módulo de farmacia      |
| **Caja y seguros**                                           | Cobros, presupuestos, gestión con aseguradoras (cartas aval).                                                                          | No; solo los servicios facturados                                  | módulo de facturación   |
| **Paciente**                                                 | Sus citas, su historia, sus récipes, sus exámenes.                                                                                     | Solo lo suyo                                                       | 2 (cuenta) · 6 (portal) |
| **Representante** (padre, madre, tutor, familiar autorizado) | Maneja la cuenta de un menor o de un paciente dependiente.                                                                             | La del paciente que representa (FHIR `RelatedPerson`)              | 6                       |

- **Paciente y representante** no son miembros de la clínica: su acceso sale de la relación con el paciente, no de un rol del personal.
- **Soporte técnico** del servidor local **no es un rol del programa**: su acceso es al equipo (respaldos, actualizaciones), no a los datos de pacientes.

### Cambios sobre lo ya hecho

- El rol **"socio"** pasa a llamarse **"Administración"** e incluye a la gerencia.
- La **aprobación de las credenciales de los médicos** pasa a la **dirección médica**. Si la clínica no tiene director médico, la hace el dueño. Verificar el MPPS y el Colegio de Médicos es una tarea clínica, no de gestión.

## Fuentes

- OpenEMR, "Basic User ACLs": <https://www.open-emr.org/wiki/index.php/Basic_User_ACLs_In_OpenEMR_And_How_To_Customize_Them>
- OpenMRS, roles de la aplicación de referencia (API de demostración): <https://o2.openmrs.org/openmrs/ws/rest/v1/role>
- GNU Health, funcionalidades: <https://docs.gnuhealth.org/his/features.html>
- HL7 FHIR R5, ValueSet PractitionerRole: <https://hl7.org/fhir/R5/valueset-practitioner-role.html>
