/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Quien esta conectado (GET /api/me). Solo en paginas que exigen sesion. */
    me?: import('@digiclin/shared').MeResponse;
  }
}
