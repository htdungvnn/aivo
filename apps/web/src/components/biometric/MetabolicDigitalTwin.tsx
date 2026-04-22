"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Zap,
  Target,
} from "lucide-react";
import { useMetabolicTwin, type ScenarioResults } from "./useMetabolicTwin";
import type { Projection } from "@aivo/shared-types";

export function MetabolicDigitalTwin(_props: object) {
  const { simulation, loading, error, generateSimulation, getScenarioDescriptions } = useMetabolicTwin();

  const scenarioDescriptions = useMemo(() => getScenarioDescriptions(), [getScenarioDescriptions]);

  const handleGenerate = async () => {
    await generateSimulation(30);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-teal-900/30 border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-emerald-300">Generating your metabolic twin simulation...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-teal-900/30 border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-1">Simulation Failed</h3>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
            <Button onClick={handleGenerate} className="bg-emerald-600 hover:bg-emerald-500">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!simulation) {
    return (
      <Card className="bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-teal-900/30 border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Metabolic Digital Twin</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Get AI-powered projections of your body composition over the next 30 days with multiple scenarios and personalized recommendations.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
            >
              <Zap className="w-4 h-4 mr-2" />
              Generate Simulation
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metrics summary */}
      <Card className="bg-gradient-to-br from-emerald-900/30 via-slate-900/60 to-teal-900/30 border-emerald-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Metabolic Digital Twin</h2>
                <p className="text-sm text-gray-400">
                  30-day projection based on your historical trends
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Generated
            </Badge>
          </div>

          {/* Current metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Current Weight</p>
              <p className="text-xl font-bold text-white">{simulation.currentMetrics.weightKg.toFixed(1)} kg</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Body Fat</p>
              <p className="text-xl font-bold text-white">{simulation.currentMetrics.bodyFatPct.toFixed(1)}%</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Muscle Mass</p>
              <p className="text-xl font-bold text-white">{simulation.currentMetrics.muscleMassKg.toFixed(1)} kg</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Lean Body Mass</p>
              <p className="text-xl font-bold text-white">{simulation.currentMetrics.leanBodyMassKg.toFixed(1)} kg</p>
            </div>
          </div>

          {/* Trend strength indicator */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Trend Strength:</span>
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${simulation.trendAnalysis.trendStrength * 100}%` }}
                />
              </div>
              <span className="text-emerald-400 font-medium">
                {(simulation.trendAnalysis.trendStrength * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Consistency:</span>
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{ width: `${simulation.trendAnalysis.consistencyScore}%` }}
                />
              </div>
              <span className="text-cyan-400 font-medium">
                {simulation.trendAnalysis.consistencyScore.toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(scenarioDescriptions).map(([key, desc]) => {
          const scenario = getScenario(simulation.scenarios, key as keyof ScenarioResults);
          return (
            <Card
              key={key}
              className={`bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-slate-900/50 border-slate-700/50 ${desc.borderColor}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white mb-1">{desc.name}</h3>
                    <p className="text-xs text-gray-400">{desc.description}</p>
                  </div>
                  <Badge variant="outline" className={`${desc.color} border-current/30`}>
                    {Math.round(scenario.overallConfidence * 100)}% confidence
                  </Badge>
                </div>

                {/* Projection chart placeholder */}
                <div className="h-40 bg-slate-800/30 rounded-lg mb-4 relative overflow-hidden">
                  <ProjectionChart projections={scenario.weightProjections} color={desc.color.includes("green") ? "#34d399" : desc.color.includes("amber") ? "#fbbf24" : desc.color.includes("cyan") ? "#22d3ee" : "#f87171"} />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Day 1:</span>
                    <span className="text-white font-medium">{scenario.weightProjections[0]?.value.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Day 30:</span>
                    <span className="text-white font-medium">{scenario.weightProjections[29]?.value.toFixed(1) || "N/A"} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Change:</span>
                    <span className={`font-medium ${scenario.weightProjections[29]?.value >= simulation.currentMetrics.weightKg ? "text-red-400" : "text-emerald-400"}`}>
                      {calculateChange(simulation.currentMetrics.weightKg, scenario.weightProjections[29]?.value)} kg
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recommendations */}
      <Card className="bg-gradient-to-br from-amber-900/30 via-slate-900/60 to-orange-900/30 border-amber-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white">Personalized Recommendations</h3>
          </div>
          <ul className="space-y-2">
            {simulation.recommendations.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 text-sm text-gray-300"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                {rec}
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function getScenario(scenarios: ScenarioResults, key: keyof ScenarioResults) {
  switch (key) {
    case "consistentPerformance":
      return scenarios.consistentPerformance;
    case "potentialRegression":
      return scenarios.potentialRegression;
    case "bestCase":
      return scenarios.bestCase;
    case "worstCase":
      return scenarios.worstCase;
  }
}

function calculateChange(initial: number, final: number | undefined) {
  if (final === undefined) {return 0;}
  return (final - initial).toFixed(1);
}

function ProjectionChart({
  projections,
  color,
}: {
  projections: Projection[];
  color: string;
}) {
  const points = useMemo(() => {
    if (!projections.length) {return null;}
    const minVal = Math.min(...projections.map((p) => p.lowerBound));
    const maxVal = Math.max(...projections.map((p) => p.upperBound));
    const range = maxVal - minVal || 1;
    const width = 100;
    const height = 100;
    const padding = 10;

    const getY = (val: number) => height - padding - ((val - minVal) / range) * (height - 2 * padding);
    const getX = (i: number) => padding + (i / (projections.length - 1)) * (width - 2 * padding);

    // Upper bound line
    const upperPath = projections
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.upperBound)}`)
      .join(" ");
    // Main line
    const mainPath = projections
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.value)}`)
      .join(" ");
    // Lower bound line
    const lowerPath = projections
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.lowerBound)}`)
      .join(" ");

    return { upperPath, mainPath, lowerPath, getY, getX };
  }, [projections]);

  if (!points) {return null;}

  const lastIndex = projections.length - 1;

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Confidence area */}
      <path
        d={`${points.upperPath} L ${points.getX(lastIndex)} ${points.getY(projections[lastIndex].lowerBound)} ${points.lowerPath} Z`}
        fill={color}
        opacity={0.2}
      />
      {/* Upper bound */}
      <path d={points.upperPath} fill="none" stroke={color} strokeWidth={0.5} opacity={0.5} />
      {/* Main trend */}
      <path d={points.mainPath} fill="none" stroke={color} strokeWidth={1.5} />
      {/* Lower bound */}
      <path d={points.lowerPath} fill="none" stroke={color} strokeWidth={0.5} opacity={0.5} />
    </svg>
  );
}
