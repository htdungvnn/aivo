"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Heart,
  Moon,
  Flame,
  Droplets,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  sampleHealthScore,
  sampleWeeklyActivity,
  sampleWeightTrend,
  sampleMacros,
  sampleHabits,
  type DailyMetric,
  type WeightTrend,
  type HabitStreak,
} from "@aivo/marketing-config";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

function HealthScoreCard() {
  const score = sampleHealthScore;

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            Health Score
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Your overall wellness index
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[var(--color-primary)]" />
          <span className="text-2xl font-bold text-[var(--color-primary)]">
            {score.overall}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { label: "Nutrition", value: score.nutrition, variant: "success" as const },
          { label: "Activity", value: score.activity, variant: "accent" as const },
          { label: "Sleep", value: score.sleep, variant: "default" as const },
          { label: "Hydration", value: score.hydration, variant: "default" as const },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--color-muted-foreground)]">
                {item.label}
              </span>
              <span className="font-medium text-[var(--color-foreground)]">
                {item.value}%
              </span>
            </div>
            <Progress
              value={item.value}
              variant={item.variant}
              className="h-2"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActivityChartCard() {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            Weekly Activity
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Steps per day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampleWeeklyActivity}>
            <defs>
              <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7872", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7872", fontSize: 12 }}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#151B18",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#F5F7F6",
              }}
              formatter={(value) => [`${Number(value).toLocaleString()} steps`, ""]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22C55E"
              strokeWidth={2}
              fill="url(#colorSteps)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function NutritionCard() {
  const macroColors = ["#22C55E", "#A3E635", "#0EA5E9"];

  const pieData = [
    { name: "Protein", value: sampleMacros.protein.current },
    { name: "Carbs", value: sampleMacros.carbs.current },
    { name: "Fat", value: sampleMacros.fat.current },
  ];

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            Nutrition Summary
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Today&apos;s macros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[var(--color-foreground)]">
            {sampleMacros.calories.current}
          </span>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            / {sampleMacros.calories.goal} kcal
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={macroColors[index % 3]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#151B18",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  color: "#F5F7F6",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center space-y-3">
          {[
            { label: "Protein", current: sampleMacros.protein.current, goal: sampleMacros.protein.goal, color: macroColors[0] },
            { label: "Carbs", current: sampleMacros.carbs.current, goal: sampleMacros.carbs.goal, color: macroColors[1] },
            { label: "Fat", current: sampleMacros.fat.current, goal: sampleMacros.fat.goal, color: macroColors[2] },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {item.current}g
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((item.current / item.goal) * 100, 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function WeightTrendCard() {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            Weight Trend
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
          <span className="text-sm font-medium text-[var(--color-success)]">
            -6.0 lbs
          </span>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampleWeightTrend}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7872", fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7872", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#151B18",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#F5F7F6",
              }}
              formatter={(value) => [`${value} lbs`, ""]}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#22C55E"
              strokeWidth={2}
              dot={{ fill: "#22C55E", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "#22C55E" }}
            />
            <Line
              type="monotone"
              dataKey="goal"
              stroke="#A3E635"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function HabitsCard() {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            Today&apos;s Habits
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Keep your streaks going
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
      </div>

      <div className="space-y-4">
        {sampleHabits.map((habit: HabitStreak) => (
          <div
            key={habit.name}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  habit.completed
                    ? "bg-[var(--color-success)]"
                    : "border-2 border-[var(--color-border)]"
                }`}
              >
                {habit.completed && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p
                  className={`text-sm font-medium ${
                    habit.completed
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {habit.name}
                </p>
                <p className="text-xs text-[var(--color-tertiary)]">
                  Best: {habit.best} days
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {habit.current}
              </span>
              <p className="text-xs text-[var(--color-tertiary)]">day streak</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MetricsRow() {
  const metrics = [
    { icon: Heart, label: "Resting HR", value: "62", unit: "bpm", color: "#EF4444" },
    { icon: Moon, label: "Avg Sleep", value: "7.5", unit: "hours", color: "#3B82F6" },
    { icon: Droplets, label: "Water", value: "6", unit: "/ 8 glasses", color: "#0EA5E9" },
    { icon: Flame, label: "Calories Burned", value: "420", unit: "kcal", color: "#F59E0B" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-4 text-center">
          <metric.icon
            className="w-5 h-5 mx-auto mb-2"
            style={{ color: metric.color }}
          />
          <p className="text-2xl font-bold text-[var(--color-foreground)]">
            {metric.value}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {metric.unit}
          </p>
          <p className="text-xs text-[var(--color-tertiary)] mt-1">
            {metric.label}
          </p>
        </Card>
      ))}
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section className="py-24 lg:py-32 relative">
      <Container>
        <SectionHeader
          eyebrow="Product Preview"
          title="See your health come together"
          description="Real-time dashboards, beautiful charts, and actionable insights — all designed to help you reach your goals."
        />

        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-6"
        >
          {/* Top Row - Large Charts */}
          <motion.div variants={createItemVariants()} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthScoreCard />
            <ActivityChartCard />
          </motion.div>

          {/* Middle Row - Nutrition & Weight */}
          <motion.div variants={createItemVariants()} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NutritionCard />
            <WeightTrendCard />
          </motion.div>

          {/* Bottom Row - Habits & Metrics */}
          <motion.div variants={createItemVariants()} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HabitsCard />
            <div className="space-y-6">
              <MetricsRow />
              <Card className="p-6">
                <h4 className="text-sm font-medium text-[var(--color-muted-foreground)] mb-3">
                  Weekly Insight
                </h4>
                <p className="text-[var(--color-foreground)] mb-2">
                  Best sleep week yet! Your average duration increased by 32 minutes.
                </p>
                <p className="text-sm text-[var(--color-tertiary)]">
                  Keep maintaining a consistent bedtime routine to sustain this improvement.
                </p>
              </Card>
            </div>
          </motion.div>
        </motion.div>

        {/* Disclaimer */}
        <p className="mt-12 text-center text-xs text-[var(--color-tertiary)]">
          Preview data for demonstration purposes only. This is not real health data.
        </p>
      </Container>
    </section>
  );
}
