/**
 * Port configuration for AIVO development environment
 * All services should use these constants for consistency
 */

export const PORTS = {
  // Application ports
  WEB: 3000,
  
  // Backend services
  AUTH: 3001,
  HEALTH: 3002,
  COACH: 3003,
  NUTRITION: 3004,
  MAIL: 3005,
  
  // Gateway
  GATEWAY: 4000,
  
  // Mobile/Expo
  METRO: 8080,
  EXPO: 19000,
  EXPO_HERMES: 8081,
  
  // Debug
  DEBUGGER: [9232, 9234],
} as const;

export const BASE_URLS = {
  LOCAL: {
    web: `http://localhost:${PORTS.WEB}`,
    auth: `http://localhost:${PORTS.AUTH}`,
    health: `http://localhost:${PORTS.HEALTH}`,
    coach: `http://localhost:${PORTS.COACH}`,
    nutrition: `http://localhost:${PORTS.NUTRITION}`,
    mail: `http://localhost:${PORTS.MAIL}`,
    gateway: `http://localhost:${PORTS.GATEWAY}`,
  },
  PRODUCTION: {
    web: 'https://app.aivo.app',
    auth: 'https://auth.aivo.app',
    health: 'https://health.aivo.app',
    coach: 'https://coach.aivo.app',
    nutrition: 'https://nutrition.aivo.app',
    mail: 'https://mail.aivo.app',
    gateway: 'https://api.aivo.app',
  },
} as const;

export type Port = (typeof PORTS)[keyof typeof PORTS];
export type ServiceName = keyof typeof BASE_URLS.LOCAL;
