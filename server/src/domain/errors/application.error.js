export class ApplicationError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = "ApplicationError";
    this.statusCode = statusCode;
    this.details = details;
  }
}
