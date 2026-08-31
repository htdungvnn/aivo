/**
 * Auth Service Idempotent Seeds
 * 
 * These seeds use INSERT OR IGNORE to ensure idempotency.
 * Safe to run multiple times.
 */

-- Seed system roles
INSERT OR IGNORE INTO roles (id, code, name, description, is_system) VALUES
    ('role_user', 'user', 'User', 'Standard user role', 1),
    ('role_admin', 'admin', 'Administrator', 'System administrator role', 1);
