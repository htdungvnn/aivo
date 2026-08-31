/**
 * Swagger/OpenAPI handler for Cloudflare Workers
 * 
 * Provides endpoints for:
 * - GET /swagger.json - OpenAPI specification
 * - GET /docs - Swagger UI
 * - GET /docs/oauth2-redirect.html - OAuth2 redirect
 */

import type { Hono } from 'hono';
import type { OpenAPISpec } from './types.js';

/**
 * HTML template for Swagger UI
 */
const SWAGGER_UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .swagger-ui .topbar {
      display: none;
    }
    .swagger-ui .info {
      margin: 20px 0;
    }
    .swagger-ui .scheme-container {
      background: #fafafa;
      padding: 15px;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        oauth2RedirectUrl: window.location.origin + "/docs/oauth2-redirect.html"
      });
    };
  </script>
</body>
</html>`;

const OAUTH2_REDIRECT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OAuth2 Redirect</title>
</head>
<body>
  <script>
    // Handle OAuth2 redirect
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('authResult');
    
    if (window.opener) {
      window.opener.postMessage(
        { authResult: authResult },
        window.location.origin
      );
    }
    
    // Close popup and redirect
    setTimeout(function() {
      if (authResult === 'success') {
        window.close();
      }
    }, 100);
  </script>
</body>
</html>`;

/**
 * Create a Swagger handler with the given OpenAPI specification
 */
export function createSwaggerHandler(
  spec: OpenAPISpec,
  options?: {
    title?: string;
    enableUI?: boolean;
    customCSS?: string;
  }
): {
  handleSwaggerJson: (c: { json: (data: unknown, status?: number) => Response }) => Response;
  handleSwaggerUI: () => Response;
  handleOAuthRedirect: () => Response;
} {
  const title = options?.title || spec.info.title || 'API Documentation';
  
  const swaggerUIWithCustomTitle = options?.title 
    ? SWAGGER_UI_HTML.replace('>API Documentation<', `>${title}<`)
    : SWAGGER_UI_HTML;

  return {
    /**
     * Handler for /swagger.json endpoint
     */
    handleSwaggerJson: (c: { json: (data: unknown, status?: number) => Response }) => {
      return c.json(spec, 200);
    },

    /**
     * Handler for /docs endpoint (Swagger UI)
     */
    handleSwaggerUI: () => {
      return new Response(swaggerUIWithCustomTitle, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    },

    /**
     * Handler for /docs/oauth2-redirect.html
     */
    handleOAuthRedirect: () => {
      return new Response(OAUTH2_REDIRECT_HTML, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
  };
}

/**
 * Mount Swagger routes on a Hono app
 */
export function mountSwaggerRoutes<T extends { Bindings: Record<string, unknown>; Variables: Record<string, unknown> }>(
  app: Hono<T>,
  spec: OpenAPISpec,
  options?: {
    path?: string;
    title?: string;
    enableUI?: boolean;
  }
): void {
  const basePath = options?.path || '';
  const { handleSwaggerJson, handleSwaggerUI, handleOAuthRedirect } = createSwaggerHandler(spec, {
    title: options?.title,
    enableUI: options?.enableUI
  });

  // OpenAPI JSON spec endpoint
  app.get(`${basePath}/swagger.json`, (c) => handleSwaggerJson(c));

  // Swagger UI endpoint
  app.get(`${basePath}/docs`, () => handleSwaggerUI());

  // OAuth2 redirect (needed for API key/auth flows in Swagger UI)
  app.get(`${basePath}/docs/oauth2-redirect.html`, () => handleOAuthRedirect());
}

/**
 * Create a default health endpoint response schema
 */
export function healthResponseSchema(serviceName: string) {
  return {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      timestamp: { type: 'integer', example: Date.now() },
      version: { type: 'string', example: '1.0.0' },
      service: { type: 'string', example: serviceName }
    }
  };
}
