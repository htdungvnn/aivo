"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  type MouseHandlerDataParam,
} from "recharts";

// Mock data for landing page preview
export const mockMuscleActivationData = [
  { muscle: "Core", activation: 94, max: 100, color: "#22d3ee" },
  { muscle: "Chest", activation: 87, max: 100, color: "#3b82f6" },
  { muscle: "Back", activation: 82, max: 100, color: "#6366f1" },
  { muscle: "Shoulders", activation: 76, max: 100, color: "#8b5cf6" },
  { muscle: "Biceps", activation: 71, max: 100, color: "#a855f7" },
  { muscle: "Triceps", activation: 68, max: 100, color: "#d946ef" },
  { muscle: "Quads", activation: 78, max: 100, color: "#22d3ee" },
  { muscle: "Hamstrings", activation: 72, max: 100, color: "#3b82f6" },
  { muscle: "Calves", activation: 65, max: 100, color: "#6366f1" },
  { muscle: "Glutes", activation: 80, max: 100, color: "#8b5cf6" },
];

interface MuscleData {
  muscle: string;
  activation: number;
  max: number;
  color: string;
}

// Extended type for recharts click event - extends MouseHandlerDataParam with our payload shape
type ChartClickData = MouseHandlerDataParam & {
  activePayload?: Array<{
    payload: MuscleData;
  }>;
};

export const mockBodyRadarData = [
  { axis: "Core", value: 94, fullMark: 100 },
  { axis: "Chest", value: 87, fullMark: 100 },
  { axis: "Back", value: 82, fullMark: 100 },
  { axis: "Shoulders", value: 76, fullMark: 100 },
  { axis: "Arms", value: 70, fullMark: 100 },
  { axis: "Legs", value: 75, fullMark: 100 },
];

export const mockTimeSeriesData = [
  { time: "6AM", core: 65, legs: 45, cardio: 70 },
  { time: "9AM", core: 75, legs: 58, cardio: 82 },
  { time: "12PM", core: 88, legs: 72, cardio: 90 },
  { time: "3PM", core: 92, legs: 78, cardio: 85 },
  { time: "6PM", core: 94, legs: 80, cardio: 88 },
];

interface MuscleActivationChartProps {
  data?: Array<{ muscle: string; activation: number; max: number; color: string }>;
  height?: number;
  showLegend?: boolean;
  onBarClick?: (data: { muscle: string; activation: number }) => void;
}

export function MuscleActivationChart({
  data = mockMuscleActivationData,
  height = 300,
  showLegend = true,
  onBarClick,
}: MuscleActivationChartProps) {
  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number; payload: { muscle: string; activation: number; color: string } }>;
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800/95 border border-slate-600/50 backdrop-blur-sm rounded-lg p-3 shadow-xl">
          <p className="text-slate-200 text-sm font-semibold capitalize">{data.muscle}</p>
          <p className="text-cyan-400 font-bold text-lg">
            {data.activation}%
          </p>
          <div className="mt-2 w-full bg-slate-700/50 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${data.activation}%`,
                backgroundColor: data.color,
              }}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          layout="vertical"
          onClick={(data: ChartClickData) => {
            if (data && data.activePayload && onBarClick) {
              const payload = data.activePayload[0].payload;
              onBarClick({ muscle: payload.muscle, activation: payload.activation });
            }
          }}
        >
          <defs>
            {data.map((entry, index) => (
              <linearGradient key={`gradient-${entry.muscle}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={entry.color} stopOpacity={0.7} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <YAxis
            type="category"
            dataKey="muscle"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={80}
            tick={{ fill: "#94a3b8" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(100, 100, 100, 0.1)" }} />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-slate-300 text-xs">{value}</span>
              )}
            />
          )}
          <Bar
            dataKey="activation"
            name="Activation"
            radius={[0, 4, 4, 0]}
            barSize={16}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#gradient-${index})`}
                stroke={entry.color}
                strokeWidth={1}
                style={{ cursor: onBarClick ? "pointer" : "default" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Radial gauge chart for overall muscle engagement score
interface MuscleRadialGaugeProps {
  score: number;
  size?: number;
}

export function MuscleRadialGauge({ score, size = 120 }: MuscleRadialGaugeProps) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 12;
  const normalizedScore = score / 100;
  const strokeDashoffset = circumference * (1 - normalizedScore);

  // Background arc
  const segments = [
    { limit: 30, color: "#ef4444" }, // red
    { limit: 60, color: "#f97316" }, // orange
    { limit: 80, color: "#eab308" }, // yellow
    { limit: 100, color: "#22c55e" }, // green
  ];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circles for each zone */}
        {segments.map((segment, index) => {
          const startAngle = index === 0 ? 0 : (segments[index - 1].limit / 100) * circumference;
          const endAngle = (segment.limit / 100) * circumference;
          const arcLength = endAngle - startAngle;
          const radius = size / 2 - strokeWidth / 2;

          return (
            <circle
              key={segment.color}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color + "40"}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={-startAngle}
              strokeLinecap="round"
            />
          );
        })}
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={score >= 70 ? "#22c55e" : score >= 40 ? "#f97316" : "#ef4444"}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-xs text-slate-400 uppercase tracking-wider">Engaged</span>
      </div>
    </div>
  );
}

// Time series chart for muscle activation over time
interface ActivationTimeSeriesProps {
  data?: typeof mockTimeSeriesData;
  height?: number;
}

export function ActivationTimeSeries({
  data = mockTimeSeriesData,
  height = 200,
}: ActivationTimeSeriesProps) {
  const colors = {
    core: "#22d3ee",
    legs: "#3b82f6",
    cardio: "#8b5cf6",
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value, name) => [`${value}%`, name]}
          />
          <Legend />
          <Bar dataKey="core" name="Core" fill={colors.core} radius={[4, 4, 0, 0]} />
          <Bar dataKey="legs" name="Legs" fill={colors.legs} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cardio" name="Cardio" fill={colors.cardio} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Combined dashboard component with multiple charts
export interface MuscleDashboardProps {
  className?: string;
}

export function MuscleDashboard({ className = "" }: MuscleDashboardProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [overallScore, setOverallScore] = useState<number>(82); // Default fallback
  const [wasmReady, setWasmReady] = useState(false);

  // Initialize WASM compute module
  useEffect(() => {
    let mounted = true;
    const initWasm = async () => {
      try {
        // Dynamic import to load WASM module - it auto-initializes
        await import("@aivo/compute");
        if (mounted) {
          setWasmReady(true);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("WASM module failed to load, using fallback calculations:", error);
      }
    };
    initWasm();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute overall score using WASM when data changes
  useEffect(() => {
    if (!wasmReady) {
      return;
    }

    const computeScore = async () => {
      try {
        const aivoCompute = await import("@aivo/compute");
        const data = mockMuscleActivationData;
        if (data.length === 0) {
          return;
        }

        // Prepare scores as Float64Array
        const scores = new Float64Array(data.map(d => d.activation));
        // Optimal ratios: equal distribution
        const optimalRatios = new Float64Array(scores.length).fill(1 / scores.length);

        // Use FitnessCalculator.calculateMuscleBalanceScore
        const FitnessCalculator = aivoCompute.FitnessCalculator;
        if (FitnessCalculator && typeof FitnessCalculator.calculateMuscleBalanceScore === 'function') {
          const wasmScore = FitnessCalculator.calculateMuscleBalanceScore(scores, optimalRatios);
          if (typeof wasmScore === 'number' && !isNaN(wasmScore) && wasmScore >= 0 && wasmScore <= 100) {
            setOverallScore(Math.round(wasmScore));
            return;
          }
        }

        // Fallback to simple average if WASM function unavailable or returned invalid
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        setOverallScore(Math.round(avg));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("WASM calculation failed, using fallback:", error);
        // Fallback to simple average
        const data = mockMuscleActivationData;
        if (data.length > 0) {
          const avg = data.reduce((acc, item) => acc + item.activation, 0) / data.length;
          setOverallScore(Math.round(avg));
        }
      }
    };

    computeScore();
  }, [wasmReady]);

  const handleBarClick = (data: { muscle: string; activation: number }) => {
    setSelectedMuscle(data.muscle);
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Main Bar Chart */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Muscle Activation Map</h3>
        <MuscleActivationChart height={350} onBarClick={handleBarClick} />
        {selectedMuscle && (
          <p className="text-center text-cyan-400 text-sm mt-4">
            Selected: <span className="font-bold capitalize">{selectedMuscle}</span>
          </p>
        )}
      </div>

      {/* Radial Gauge + Time Series */}
      <div className="grid grid-cols-1 gap-6">
        {/* Overall Score */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 flex items-center justify-center">
          <div className="text-center">
            <MuscleRadialGauge score={overallScore} size={150} />
            <div className="flex items-center justify-center gap-2 mt-2">
              <h3 className="text-lg font-semibold text-white">Overall Engagement</h3>
              {wasmReady && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  WASM Powered
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm">Your muscles are responding well to training</p>
          </div>
        </div>

        {/* Time Series */}
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Activation Trend</h3>
          <ActivationTimeSeries height={180} />
        </div>
      </div>
    </div>
  );
}

