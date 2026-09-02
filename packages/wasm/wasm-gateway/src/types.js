/**
 * WASM Gateway Types
 * Type definitions for WASM module loading and execution
 */
/**
 * Error during WASM execution
 */
export class WASMGatewayError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'WASMGatewayError';
    }
}
