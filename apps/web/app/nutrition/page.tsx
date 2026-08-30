/**
 * Nutrition Dashboard Page
 * Daily overview of nutrition and meals
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface NutritionValues {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

interface Meal {
  id: string;
  mealType: string;
  name: string;
  totalNutrition: NutritionValues;
  createdAt: number;
}

interface DailySummary {
  date: string;
  meals: Meal[];
  totalNutrition: NutritionValues;
  macroPercentages: { proteinPercent: number; carbsPercent: number; fatPercent: number };
}

const METRICS = [
  { key: 'caloriesKcal', label: 'Calories', unit: 'kcal', color: '#3B82F6' },
  { key: 'proteinG', label: 'Protein', unit: 'g', color: '#10B981' },
  { key: 'carbsG', label: 'Carbs', unit: 'g', color: '#F59E0B' },
  { key: 'fatG', label: 'Fat', unit: 'g', color: '#8B5CF6' },
];

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: '#F59E0B',
  lunch: '#3B82F6',
  dinner: '#8B5CF6',
  snack: '#10B981',
};

export default function NutritionDashboard() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // In production, fetch from API
    // For now, show demo data
    const today = new Date().toISOString().split('T')[0];
    setSummary({
      date: today,
      meals: [
        {
          id: '1',
          mealType: 'breakfast',
          name: 'Greek Yogurt with Berries',
          totalNutrition: { caloriesKcal: 350, proteinG: 25, carbsG: 40, fatG: 8, fiberG: 4, sugarG: 20, sodiumMg: 100 },
          createdAt: Date.now(),
        },
        {
          id: '2',
          mealType: 'lunch',
          name: 'Grilled Chicken Salad',
          totalNutrition: { caloriesKcal: 450, proteinG: 40, carbsG: 20, fatG: 22, fiberG: 6, sugarG: 8, sodiumMg: 450 },
          createdAt: Date.now(),
        },
      ],
      totalNutrition: { caloriesKcal: 800, proteinG: 65, carbsG: 60, fatG: 30, fiberG: 10, sugarG: 28, sodiumMg: 550 },
      macroPercentages: { proteinPercent: 35, carbsPercent: 32, fatPercent: 33 },
    });
    setLoading(false);
  }, []);
  
  const getProgress = (consumed: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min((consumed / target) * 100, 100);
  };
  
  const targets = {
    caloriesKcal: 2000,
    proteinG: 50,
    carbsG: 275,
    fatG: 78,
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nutrition Dashboard</h1>
              <p className="text-gray-500 mt-1">
                {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link
              href="/nutrition/add"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Meal
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Calories Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Daily Calories</h2>
            <span className="text-sm text-gray-500">Target: {targets.caloriesKcal} kcal</span>
          </div>
          
          <div className="flex items-end gap-8">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-blue-600">
                  {summary?.totalNutrition.caloriesKcal ?? 0}
                </span>
                <span className="text-xl text-gray-400">kcal</span>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>0</span>
                  <span>{targets.caloriesKcal}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${getProgress(summary?.totalNutrition.caloriesKcal ?? 0, targets.caloriesKcal)}%` }}
                  />
                </div>
              </div>
              
              <p className="mt-4 text-gray-600">
                <span className="font-semibold text-gray-900">
                  {Math.max(0, targets.caloriesKcal - (summary?.totalNutrition.caloriesKcal ?? 0))}
                </span>{' '}
                kcal remaining
              </p>
            </div>
            
            {/* Macro distribution */}
            <div className="flex gap-8">
              {Object.entries(summary?.macroPercentages ?? {}).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="w-16 h-16 rounded-full border-4 border-gray-100 flex items-center justify-center mb-2" style={{
                    borderColor: key === 'proteinPercent' ? '#10B981' : key === 'carbsPercent' ? '#F59E0B' : '#8B5CF6',
                  }}>
                    <span className="text-lg font-bold">{value}%</span>
                  </div>
                  <span className="text-sm text-gray-500 capitalize">{key.replace('Percent', '')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Macro Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {METRICS.slice(1).map((metric) => (
            <div key={metric.key} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">{metric.label}</h3>
                <span className="text-sm text-gray-400">{metric.unit}</span>
              </div>
              
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold" style={{ color: metric.color }}>
                  {summary?.totalNutrition[metric.key as keyof NutritionValues] ?? 0}
                </span>
                <span className="text-gray-400">/ {targets[metric.key as keyof typeof targets]}</span>
              </div>
              
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${getProgress(
                      summary?.totalNutrition[metric.key as keyof NutritionValues] ?? 0,
                      targets[metric.key as keyof typeof targets]
                    )}%`,
                    backgroundColor: metric.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Today's Meals */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Today's Meals</h2>
            <span className="text-sm text-gray-500">{summary?.meals.length ?? 0} meals</span>
          </div>
          
          {summary?.meals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">No meals logged today</p>
              <Link
                href="/nutrition/add"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Log Your First Meal
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {summary?.meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div
                    className="w-2 h-12 rounded-full"
                    style={{ backgroundColor: MEAL_TYPE_COLORS[meal.mealType] }}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {meal.mealType}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">{meal.name}</h3>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">
                      {meal.totalNutrition.caloriesKcal} kcal
                    </div>
                    <div className="text-sm text-gray-500">
                      P: {meal.totalNutrition.proteinG}g • C: {meal.totalNutrition.carbsG}g • F: {meal.totalNutrition.fatG}g
                    </div>
                  </div>
                  
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Weekly Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Weekly Calories</h2>
            <Link
              href="/nutrition/charts"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View Details →
            </Link>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { day: 'Mon', calories: 1850 },
                  { day: 'Tue', calories: 2100 },
                  { day: 'Wed', calories: 1950 },
                  { day: 'Thu', calories: 2200 },
                  { day: 'Fri', calories: 1800 },
                  { day: 'Sat', calories: 2400 },
                  { day: 'Sun', calories: 800 },
                ]}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [`${value} kcal`, 'Calories']}
                />
                <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === 6 ? '#3B82F6' : '#93C5FD'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Target line indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-4 h-0.5 bg-blue-600 border-t-2 border-dashed" />
            <span className="text-sm text-gray-500">Target: {targets.caloriesKcal} kcal</span>
          </div>
        </div>
      </main>
    </div>
  );
}
