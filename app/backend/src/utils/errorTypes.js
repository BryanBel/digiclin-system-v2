export class ErrorWithStatus extends Error {
  /**
   * Crea una instancia de ErrorWithStatus.
   * @param {number} status - El codigo HTTP.
   * @param {string} message - El mensaje del error.
   * @param {{ cause?: unknown, details?: unknown }} [options] - Parametros opcionales para guardar mas informacion del error
   */
  constructor(status, message, options = {}) {
    const { cause, details } = options;
    super(message, { cause });
    this.status = status;
    if (details !== undefined) {
      this.details = details;
    }
  }
}
