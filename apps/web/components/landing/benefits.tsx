import { Container } from "./container";
import { FeatureCard } from "./feature-card";
import { ChartIcon, SparkleIcon, TargetIcon } from "./icons";
import { SectionHeading } from "./section-heading";

const BENEFITS = [
  {
    icon: <TargetIcon />,
    title: "Personalized For You",
    description:
      "Plans adapt to your goals, fitness level, schedule, and progress — so the plan stays realistic as your life changes.",
    points: ["Goals", "Fitness level", "Schedule", "Progress"],
  },
  {
    icon: <SparkleIcon />,
    title: "AI-Powered Guidance",
    description:
      "Turn fitness and nutrition data into simple, actionable insights instead of charts you have to decode.",
    points: ["Daily insights", "Smart nudges", "Auto-adjusting targets"],
  },
  {
    icon: <ChartIcon />,
    title: "Track Real Progress",
    description:
      "Understand how your workouts, nutrition, weight, and habits change over time — beyond what the scale tells you.",
    points: ["Workouts", "Nutrition", "Weight", "Habits"],
  },
] as const;

export function Benefits() {
  return (
    <section id="features" className="relative py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Core Benefits"
          title="Everything you need to become your best self."
          description="Three things AIVO does better than a stack of disconnected trackers."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <FeatureCard
              key={benefit.title}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
              points={benefit.points}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
