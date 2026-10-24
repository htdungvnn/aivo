import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";

const app = new OpenAPIHono<{ Bindings: CloudflareBindings }>();

const MessageSchema = z
  .object({
    message: z.string().openapi({ example: "Hello Hono!" }),
  })
  .openapi("Message");

const messageRoute = createRoute({
  method: "get",
  path: "/message",
  operationId: "getMessage",
  summary: "Get a greeting message",
  tags: ["Message"],
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: MessageSchema,
        },
      },
    },
  },
});

app.openapi(messageRoute, (c) => {
  return c.json({ message: "Hello Hono!" }, 200);
});

app.doc("/openapi", {
  openapi: "3.0.0",
  info: {
    title: "AIVO API",
    version: "0.1.0",
    description: "AIVO API documentation",
  },
  tags: [
    { name: "Message", description: "Greeting endpoints" },
  ],
});

app.get("/docs", swaggerUI({ url: "/openapi" }));

app.get("/", (c) => {
  return c.redirect("/docs");
});

export default app;
