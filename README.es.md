[English](README.md) | **Español**

# DigiClin

Un sistema de gestión clínica: los pacientes agendan citas, el personal médico las
administra, y el historial médico vive detrás de control de acceso por rol en lugar de en
un archivador.

**En vivo en [digiclin-system-v2.onrender.com](https://digiclin-system-v2.onrender.com)**

![La página de inicio de DigiClin](docs/home.webp)

Desarrollado como MVP y entregado al cliente. Es la segunda implementación — la primera
está archivada en [digiclin-system](https://github.com/BryanBel/digiclin-system).

> **Sobre el demo.** Corre en el plan gratuito de Render, así que la instancia se duerme
> cuando no hay tráfico y la primera petición tras un rato tarda cerca de un minuto en
> despertarla. Las siguientes son inmediatas.

## Tres roles, tres superficies

Cada rol tiene su propia área, y la API hace valer el límite en cada ruta en vez de
confiar en que la interfaz esconda las cosas.

| Rol | A qué llega |
| --- | ----------- |
| **Paciente** | Sus propias citas y su propio historial médico, nada más |
| **Doctor** | La agenda completa de citas y los historiales de los pacientes, incluyendo escribir entradas nuevas |
| **Administrador** | Todo lo anterior, más las fichas de pacientes y la cola de solicitudes de cita entrantes |

La autorización es un control por ruta que responde `401` sin sesión y `403` cuando el rol
no corresponde. `/api/medical-history` lista todos los registros para `admin` y `doctor`;
un paciente que llega al mismo módulo usa `/my`, acotado a él. Esconder una opción del
menú no es control de acceso, así que la verificación vive en el servidor.

Dos endpoints son públicos a propósito, y solo dos: `POST /api/appointment-requests`, para
que alguien pueda pedir una cita antes de tener cuenta, y
`GET /api/appointment-requests/link/:token`, donde el token de la URL *es* la credencial —
se envía por correo a quien hizo la solicitud y da acceso a esa solicitud únicamente.

No siempre fue así. El módulo entero de solicitudes y dos rutas de citas corrían sin
ninguna verificación, lo que dejaba la cola de entrada —nombres, correos y motivos de
consulta— legible por cualquiera, y permitía confirmar o reprogramar la cita de otro. La
pista estaba dentro del propio handler de confirmación, que registraba
`res.locals.user?.id ?? null` para un usuario que la ruta nunca exigía, y por eso guardaba
siempre `null`. Un middleware global completa ese usuario cuando hay cookie de sesión pero
nunca rechaza, así que una ruta que no verifica explícitamente queda abierta.

## La API

28 endpoints repartidos en seis módulos.

| Módulo | Montado en | Qué cubre |
| ------ | ---------- | --------- |
| Autenticación | `/api/auth` | Registro, verificación de correo, inicio y cierre de sesión |
| Solicitudes de cita | `/api/appointment-requests` | La cola de entrada: crear, confirmar, reprogramar, y un enlace con token para seguir una solicitud sin tener cuenta |
| Citas | `/api/appointments` | Reserva y listados, tanto "las mías" como la agenda completa |
| Historial médico | `/api/medical-history` | Registros y sus archivos adjuntos |
| Pacientes | `/api/patients` | Fichas de pacientes; `/me` para la propia |
| Búsqueda de paciente | `/api/patients/lookup` | La única lectura pública, usada antes de que exista una cuenta |

Los cuerpos de petición y las cadenas de consulta se validan con esquemas de
[Zod](https://zod.dev), guardados en archivos `*.routes.schemas.js` junto a las rutas de
cada módulo.

## Modelo de datos

Ocho tablas: `users`, `patients`, `appointments`, `appointment_requests`,
`medical_history`, `attachments`, `visits` y `emergency_intake`.

## Autenticación y seguridad

| Asunto | Cómo se resuelve |
| ------ | ---------------- |
| Contraseñas | bcrypt con 10 rondas de sal. Nunca se guardan ni se registran en claro |
| Sesiones | Un token JWT de acceso con un día de vigencia, en una **cookie `httpOnly`** — no en `localStorage`, donde cualquier script de la página podría leerlo |
| Banderas de la cookie | `secure` y `sameSite: none` en producción, `lax` en desarrollo, para que la cookie no viaje por HTTP sin cifrar |
| Verificación de correo | Un JWT aparte con **su propio secreto** y una hora de vigencia, para que un enlace filtrado no pueda reutilizarse como sesión |
| Origen cruzado | CORS restringido a una lista blanca leída de `CORS_ORIGIN`, con credenciales habilitadas |
| Subida de archivos | Solo PDF, PNG y JPG, comprobados por tipo MIME; máximo 5 archivos de 10 MB cada uno. Se guardan con un nombre generado `mh-<timestamp>-<uuid>`, de modo que quien sube no elige la ruta donde cae el archivo |

## Arquitectura

Un workspace de pnpm con dos paquetes. El front-end se construye primero y se copia dentro
del back-end, así un solo servicio web de Render sirve la API y los archivos estáticos —
un despliegue, un dominio, y sin CORS entre las dos mitades en producción.

```
app/
  frontend/   # Astro, islas de React, Tailwind
  backend/    # Express + PostgreSQL; también sirve el front-end construido con NODE_ENV=prod
```

## Ejecutarlo en local

```sh
pnpm install
pnpm run dev     # Astro en 4321, Express en 3000
```

Las variables de entorno se cargan desde `app/backend/.env`.

| Variable | Para qué |
| -------- | -------- |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL — cualquier proveedor; el backend usa `pg`, no un SDK |
| `ACCESS_TOKEN_SECRET` | Firma la cookie de sesión — 48 bytes aleatorios, no una palabra |
| `EMAIL_VERIFICATION_SECRET` | Firma los enlaces de verificación — mantenlo distinto del anterior |
| `CORS_ORIGIN` | Lista blanca de orígenes, separada por comas |
| `BACKEND_URL` / `FRONTEND_URL` | Se usan para construir los enlaces del correo saliente; deben coincidir con los dominios desplegados |
| `RESEND_API_KEY` *o* `EMAIL_USER` + `EMAIL_PASS` | Envío de correo, por [Resend](https://resend.com) o SMTP. Con cualquiera basta — se intenta Resend primero y se cae a SMTP |
| `EMAIL_REDIRECT_TO` | Solo desarrollo: envía todo el correo saliente aquí en vez de al destinatario real, porque el plan gratuito de Resend solo entrega a la dirección verificada de la cuenta. Se ignora con `NODE_ENV=prod` |
| `SEED_PASSWORD` | Contraseña de las cuentas que crea `pnpm run seed:prod`. Mínimo 12 caracteres; el script se niega a correr sin ella |

`app/backend/.env.example` lista todas las variables que el código lee. Cópialo a `.env` y
complétalo — `.env` está ignorado por git, y debe seguir así.

## Desplegar

```sh
pnpm run build:client   # construye el front-end y lo copia a app/backend/dist
pnpm run start          # NODE_ENV=prod, Express sirve la API y ese directorio
```

En Render: un Web Service sobre Node 20+, comando de construcción
`pnpm install --frozen-lockfile && pnpm run build:client`, comando de arranque
`pnpm run start`. Render inyecta `PORT` y el servidor ya lo respeta.

---

Hecho por Bryan Belandria — [github.com/BryanBel](https://github.com/BryanBel)
