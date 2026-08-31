/**
 * Daily Intelligence Dashboard Page
 * Web dashboard for health tracking and readiness
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart,
} from 'recharts';

// Types (simplified)
interface ReadinessFactor {
  code: string;
  score: number;
  weight: number;
  contribution: number;
  status: string;
  messageKey: string;
}

interface ReadinessData {
  date: string;
  score: number;
  level: 'low' | 'moderate' | 'good' | 'high';
  confidence: number;
  dataCompleteness: number;
  factors: ReadinessFactor[];
  recommendation: {
    action: string;
    intensityModifier: number;
    volumeModifier: number;
  };
}

interface DailyAction {
  id: string;
  type: string;
  priority: number;
  title: string;
  description: string;
  status: string;
}

interface ChartPoint {
  timestamp: string;
  value: number | null;
  target?: number;
}

interface ChartData {
  metric: string;
  range: string;
  unit: string;
  target?: number;
  points: ChartPoint[];
  summary: {
    current: number | null;
    average: number | null;
    minimum: number | null;
    maximum: number | null;
    changePercent: number | null;
  };
}

// Color schemes
const LEVEL_COLORS = {
  low: '#EF4444',
  moderate: '#F59E0B',
  good: '#10B981',
  high: '#3B82F6',
};

const ACTION_COLORS: Record<string, string> = {
  start_workout: '#EF4444',
  light_workout: '#3B82F6',
  recovery: '#10B981',
  rest: '#6366F1',
  add_protein: '#F59E0B',
  drink_water: '#06B6D4',
  short_walk: '#8B5CF6',
  prepare_sleep: '#6366F1',
  complete_checkin: '#3B82F6',
};

// Factor labels
const FACTOR_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  training_load: 'Training Load',
  workout_completion: 'Workout',
  form_quality: 'Form Quality',
  muscle_soreness: 'Soreness',
  energy: 'Energy',
  stress: 'Stress',
  resting_hr: 'Resting HR',
  hrv: 'HRV',
  steps: 'Steps',
  hydration: 'Hydration',
  nutrition: 'Nutrition',
  recovery_days: 'Recovery',
};

// Action titles
const ACTION_TITLES: Record<string, string> = {
  start_workout: 'Start Workout',
  light_workout: 'Light Training',
  recovery: 'Recovery',
  rest: 'Rest Day',
  add_protein: 'Add Protein',
  drink_water: 'Drink Water',
  short_walk: 'Take a Walk',
  prepare_sleep: 'Prepare for Sleep',
  complete_checkin: 'Daily Check-in',
};

export default function IntelligenceDashboard() {
  // State
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [actions, setActions] = useState<DailyAction[]>([]);
  const [readinessHistory, setReadinessHistory] = useState<Array<{ date: string; score: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d'>('7d');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInData, setCheckInData] = useState({
    energy: 5,
    stress: 5,
    sleepQuality: 5,
    muscleSoreness: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // For demo, use mock data since we don't have actual API
      const today = new Date().toISOString().split('T')[0] ?? '';
      
      // Mock readiness data
      const mockReadiness: ReadinessData = {
        date: today,
        score: 72,
        level: 'good',
        confidence: 0.85,
        dataCompleteness: 0.75,
        factors: [
          { code: 'sleep', score: 85, weight: 0.20, contribution: 7, status: 'positive', messageKey: '' },
          { code: 'training_load', score: 70, weight: 0.15, contribution: 3, status: 'positive', messageKey: '' },
          { code: 'workout_completion', score: 90, weight: 0.10, contribution: 4, status: 'positive', messageKey: '' },
          { code: 'energy', score: 75, weight: 0.10, contribution: 2.5, status: 'positive', messageKey: '' },
          { code: 'stress', score: 65, weight: 0.08, contribution: 1.2, status: 'neutral', messageKey: '' },
          { code: 'resting_hr', score: 80, weight: 0.06, contribution: 1.8, status: 'positive', messageKey: '' },
          { code: 'hrv', score: 72, weight: 0.05, contribution: 1.1, status: 'positive', messageKey: '' },
          { code: 'steps', score: 60, weight: 0.05, contribution: 0.5, status: 'neutral', messageKey: '' },
          { code: 'hydration', score: 55, weight: 0.05, contribution: 0.25, status: 'neutral', messageKey: '' },
          { code: 'nutrition', score: 70, weight: 0.05, contribution: 1, status: 'positive', messageKey: '' },
        ],
        recommendation: {
          action: 'normal_training',
          intensityModifier: 0,
          volumeModifier: 0,
        },
      };
      
      // Mock actions
      const mockActions: DailyAction[] = [
        { id: '1', type: 'start_workout', priority: 1, title: 'Start Workout', description: "You're ready for your regular training.", status: 'pending' },
        { id: '2', type: 'drink_water', priority: 2, title: 'Stay Hydrated', description: 'Drink water throughout the day.', status: 'pending' },
        { id: '3', type: 'complete_checkin', priority: 3, title: 'Daily Check-in', description: 'Log how you feel today.', status: 'pending' },
      ];
      
      // Mock history
      const mockHistory = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0] ?? '',
          score: 60 + Math.floor(Math.random() * 30),
        };
      });
      
      setReadiness(mockReadiness);
      setActions(mockActions);
      setReadinessHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle check-in submission
  const handleCheckInSubmit = async () => {
    setSubmitting(true);
    try {
      // In production, call API
      console.log('Submitting check-in:', checkInData);
      setCheckInOpen(false);
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to submit check-in:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle action completion
  const handleActionComplete = async (actionId: string) => {
    setActions(actions.map(a =>
      a.id === actionId ? { ...a, status: 'completed' as const } : a
    ));
  };

  // Get readiness color
  const getReadinessColor = (level: string) => LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || '#6B7280';

  // Get action color
  const getActionColor = (type: string) => ACTION_COLORS[type] || '#6B7280';

  // Render readiness ring
  const renderReadinessRing = () => {
    if (!readiness) return null;
    
    const score = readiness.score;
    const circumference = 2 * Math.PI * 80;
    const offset = circumference - (score / 100) * circumference;
    
    return (
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="80"
            stroke="#E5E7EB"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="96"
            cy="96"
            r="80"
            stroke={getReadinessColor(readiness.level)}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color: getReadinessColor(readiness.level) }}>
            {score}
          </span>
          <span className="text-sm text-gray-500 capitalize">{readiness.level}</span>
        </div>
      </div>
    );
  };

  // Render factor bar
  const renderFactorBar = (factor: ReadinessFactor) => {
    const width = factor.score;
    const color = factor.status === 'positive' ? '#10B981' : factor.status === 'negative' ? '#EF4444' : '#F59E0B';
    
    return (
      <div key={factor.code} className="flex items-center gap-3">
        <div className="w-24 text-sm text-gray-600">{FACTOR_LABELS[factor.code] || factor.code}</div>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${width}%`, backgroundColor: color }}
          />
        </div>
        <div className="w-10 text-sm text-right font-medium">{factor.score}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily Intelligence</h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCheckInOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Daily Check-in
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Readiness Score Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-center gap-12">
            {/* Score Ring */}
            {renderReadinessRing()}
            
            {/* Score Details */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Readiness Score</h2>
              
              {/* Recommendation */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">Recommended Activity:</span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: getActionColor(readiness?.recommendation.action || '') }}>
                    {ACTION_TITLES[readiness?.recommendation.action || ''] || 'Rest'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {readiness?.recommendation.action === 'rest' && 'Your body needs rest today. Take it easy and recover.'}
                  {readiness?.recommendation.action === 'recovery' && 'Light activity can help with recovery today.'}
                  {readiness?.recommendation.action === 'light_training' && 'A lighter workout is recommended for today.'}
                  {readiness?.recommendation.action === 'normal_training' && "You're ready for your regular training routine."}
                  {readiness?.recommendation.action === 'high_intensity' && "You're primed for a challenging workout today!"}
                </p>
              </div>
              
              {/* Data Quality */}
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-sm text-gray-500">Data Quality</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${(readiness?.dataCompleteness || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{Math.round((readiness?.dataCompleteness || 0) * 100)}%</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${(readiness?.confidence || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{Math.round((readiness?.confidence || 0) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Factor Breakdown */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Factor Breakdown</h2>
            <div className="space-y-4">
              {readiness?.factors.map(renderFactorBar)}
            </div>
          </div>

          {/* Today's Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Today's Actions</h2>
            <div className="space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    action.status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2 h-2 rounded-full mt-2"
                      style={{ backgroundColor: getActionColor(action.type) }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{action.title}</h3>
                        {action.status === 'pending' && (
                          <button
                            onClick={() => handleActionComplete(action.id)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Done
                          </button>
                        )}
                        {action.status === 'completed' && (
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Readiness Trend Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Readiness Trend</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRange('7d')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  selectedRange === '7d' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setSelectedRange('30d')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  selectedRange === '30d' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readinessHistory}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => [`${value}`, 'Score']}
                  labelFormatter={(label) => new Date(String(label)).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            <strong>Disclaimer:</strong> AIVO Readiness is an estimated wellness indicator based on available data. 
            It does not provide medical advice or replace professional guidance.
          </p>
        </div>
      </main>

      {/* Check-in Modal */}
      {checkInOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Daily Check-in</h2>
            
            <div className="space-y-6">
              {/* Energy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How's your energy level?
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={checkInData.energy}
                  onChange={(e) => setCheckInData({ ...checkInData, energy: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low</span>
                  <span className="font-medium">{checkInData.energy}</span>
                  <span>High</span>
                </div>
              </div>

              {/* Stress */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stress level
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={checkInData.stress}
                  onChange={(e) => setCheckInData({ ...checkInData, stress: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low</span>
                  <span className="font-medium">{checkInData.stress}</span>
                  <span>High</span>
                </div>
              </div>

              {/* Muscle Soreness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Muscle soreness
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={checkInData.muscleSoreness}
                  onChange={(e) => setCheckInData({ ...checkInData, muscleSoreness: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>None</span>
                  <span className="font-medium">{checkInData.muscleSoreness}</span>
                  <span>Very Sore</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setCheckInOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckInSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
