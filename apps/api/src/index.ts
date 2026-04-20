import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { z } from "zod";

import { fitness } from "@aivo/compute";
import { db } from "@aivo/db";
import * as types from "@aivo/shared-types";

const app = new Hono<types.ApiBindings>();

// Enable CORS for all routes
app.use("*", cors());

// Use pretty JSON in dev
if (process.env.NODE_ENV !== "production") {
  app.use("*", prettyJSON());
}

// Health check
app.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Users endpoints
const usersRouter = new Hono<types.ApiBindings>();

usersRouter.get("/", async (c) => {
  const users = await db.query.users.findMany();
  return c.json(users);
});

usersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, id),
  });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json(user);
});

usersRouter.post("/", async (c) => {
  const body = await c.req.json();
  const validated = z.object({
    email: z.string().email(),
    name: z.string(),
  }).parse(body);

  const [user] = await db.insert(db.users).values(validated).returning();
  return c.json(user, 201);
});

app.route("/users", usersRouter);

// Workouts endpoints
const workoutsRouter = new Hono<types.ApiBindings>();

workoutsRouter.get("/", async (c) => {
  const userId = c.req.query("userId");
  const where = userId ? { userId } : undefined;
  const workouts = await db.query.workouts.findMany({
    where,
    orderBy: (workouts, { desc }) => desc(workouts.createdAt),
  });
  return c.json(workouts);
});

workoutsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const validated = z.object({
    userId: z.string(),
    type: z.enum(["strength", "cardio", "hiit", "yoga", "running", "cycling"]),
    duration: z.number().positive(),
    caloriesBurned: z.number().nonnegative().optional(),
    metrics: z.record(z.number()).optional(),
  }).parse(body);

  const [workout] = await db
    .insert(db.workouts)
    .values(validated)
    .returning();

  // Also create workout exercises if provided
  if (body.exercises) {
    await db.insert(db.workoutExercises).values(
      body.exercises.map((ex: any) => ({
        workoutId: workout.id,
        ...ex,
      }))
    );
  }

  return c.json(workout, 201);
});

app.route("/workouts", workoutsRouter);

// Fitness calculations using WASM
const calcRouter = new Hono<types.ApiBindings>();

calcRouter.post("/bmi", async (c) => {
  const body = await c.req.json();
  const { weight, height } = z.object({
    weight: z.number().positive(),
    height: z.number().positive(),
  }).parse(body);

  const bmi = fitness.calculateBMI(weight, height);
  const category = fitness.getBMICategory(bmi);

  return c.json({ bmi, category });
});

calcRouter.post("/calories", async (c) => {
  const body = await c.req.json();
  const { weight, height, age, gender, activityLevel, goal } = z.object({
    weight: z.number().positive(),
    height: z.number().positive(),
    age: z.number().positive(),
    gender: z.enum(["male", "female"]),
    activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
    goal: z.enum(["lose", "maintain", "gain"]),
  }).parse(body);

  const bmr = fitness.calculateBMR(weight, height, age, gender);
  const tdee = fitness.calculateTDEE(bmr, activityLevel);
  const target = fitness.calculateTargetCalories(tdee, goal);

  return c.json({ bmr, tdee, targetCalories: target });
});

calcRouter.post("/one-rep-max", async (c) => {
  const body = await c.req.json();
  const { weight, reps } = z.object({
    weight: z.number().positive(),
    reps: z.number().positive().max(20),
  }).parse(body);

  const oneRepMax = fitness.calculateOneRepMax(weight, reps);

  return c.json({ oneRepMax });
});

app.route("/calc", calcRouter);

// AI Coach endpoints
const aiRouter = new Hono<types.ApiBindings>();

aiRouter.post("/chat", async (c) => {
  const body = await c.req.json();
  const validated = z.object({
    userId: z.string(),
    message: z.string().min(1).max(1000),
    context: z.array(z.string()).optional(),
  }).parse(body);

  // TODO: Integrate with Claude API for AI responses
  // For now, return a placeholder
  const response = {
    message: `I received your message: "${body.message}". AI integration coming soon!`,
    timestamp: new Date().toISOString(),
  };

  // Save conversation to database
  await db.insert(db.conversations).values({
    userId: validated.userId,
    message: validated.message,
    response: response.message,
    createdAt: new Date(),
  });

  return c.json(response);
});

aiRouter.get("/history/:userId", async (c) => {
  const userId = c.req.param("userId");
  const limit = parseInt(c.req.query("limit") || "50");

  const conversations = await db.query.conversations.findMany({
    where: (conv, { eq }) => eq(conv.userId, userId),
    orderBy: (conv, { desc }) => desc(conv.createdAt),
    limit,
  });

  return c.json(conversations);
});

app.route("/ai", aiRouter);

export default app;
