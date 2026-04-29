import { Hono } from "hono";
import { z } from "zod";
import { FitnessCalculator } from "@aivo/compute/aivo_compute_bg.js";

export type Env = Record<string, unknown>;

export const CalcRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  // Calculate BMI
  /**
   * @swagger
   * /calc/bmi:
   *   post:
   *     summary: Calculate BMI
   *     description: Calculate Body Mass Index from weight and height
   *     tags: [calc]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - weight
   *               - height
   *             properties:
   *               weight:
   *                 type: number
   *                 description: Weight in kg
   *               height:
   *                 type: number
   *                 description: Height in meters
   *     responses:
   *       200:
   *         description: BMI calculated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 bmi:
   *                   type: number
   *                 category:
   *                   type: string
   *                   enum: [underweight, normal, overweight, obese]
   */
  router.post("/bmi", async (c) => {
    const body = await c.req.json();
    const { weight, height } = z
      .object({
        weight: z.number().positive(),
        height: z.number().positive(),
      })
      .parse(body);

    const bmi = FitnessCalculator.calculateBMI(weight, height);
    const category = FitnessCalculator.getBMICategory(bmi);

    return c.json({ bmi, category });
  });

  // Calculate Calories
  /**
   * @swagger
   * /calc/calories:
   *   post:
   *     summary: Calculate daily calories
   *     description: Calculate BMR, TDEE, and target calories based on goals
   *     tags: [calc]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - weight
   *               - height
   *               - age
   *               - gender
   *               - activityLevel
   *               - goal
   *             properties:
   *               weight:
   *                 type: number
   *               height:
   *                 type: number
   *               age:
   *                 type: number
   *               gender:
   *                 type: string
   *                 enum: [male, female]
   *               activityLevel:
   *                 type: string
   *                 enum: [sedentary, light, moderate, active, very_active]
   *               goal:
   *                 type: string
   *                 enum: [lose, maintain, gain]
   *     responses:
   *       200:
   *         description: Calories calculated
   */
  router.post("/calories", async (c) => {
    const body = await c.req.json();
    const { weight, height, age, gender, activityLevel, goal } = z
      .object({
        weight: z.number().positive(),
        height: z.number().positive(),
        age: z.number().positive(),
        gender: z.enum(["male", "female"]),
        activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
        goal: z.enum(["lose", "maintain", "gain"]),
      })
      .parse(body);

    const bmr = FitnessCalculator.calculateBMR(weight, height, age, gender === "male");
    const tdee = FitnessCalculator.calculateTDEE(bmr, activityLevel);
    const target = FitnessCalculator.calculateTargetCalories(tdee, goal);

    return c.json({ bmr, tdee, targetCalories: target });
  });

  // Calculate One-Rep Max
  /**
   * @swagger
   * /calc/one-rep-max:
   *   post:
   *     summary: Calculate one-rep max
   *     description: Estimate 1RM using Epley formula
   *     tags: [calc]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - weight
   *               - reps
   *             properties:
   *               weight:
   *                 type: number
   *               reps:
   *                 type: number
   *                 maximum: 20
   *     responses:
   *       200:
   *         description: 1RM calculated
   */
  router.post("/one-rep-max", async (c) => {
    const body = await c.req.json();
    const { weight, reps } = z
      .object({
        weight: z.number().positive(),
        reps: z.number().positive().max(20),
      })
      .parse(body);

    const oneRepMax = FitnessCalculator.calculateOneRepMax(weight, reps);

    return c.json({ oneRepMax });
  });

  return router;
};
