export class ErrorWithStatus extends Error {
  /**
   * Crea una instancia de ErrorWithStatus.
   * @param {number} status - El codigo HTTP.
   * @param {string} message - El mensaje del error.
   * @param {ErrorOptions} [options] - Parametros opcionales para guardar mas informacion del error
   */
  constructor(status, message, options) {
    super(message, options);
    this.status = status;
  }
}
