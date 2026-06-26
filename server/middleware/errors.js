import { isProd } from '../config.js';

/** An error with an associated HTTP status code, safe to surface to clients. */
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/**
 * Wrap an async route handler so thrown/rejected errors flow to the error
 * middleware instead of crashing the process.
 */
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/** Terminal error middleware. Maps ApiError to its status; hides 500 details. */
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    if (status >= 500) {
        console.error(err);
    }
    res.status(status).json({
        error: status >= 500 && isProd ? 'Internal server error' : err.message,
    });
}
