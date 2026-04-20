"use client";

import { Activity, Dumbbell, Heart, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Activity className="w-8 h-8 text-blue-500" />
              <span className="text-xl font-bold">AIVO</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Dashboard</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Workouts</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">AI Coach</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Settings</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-2">Welcome to AIVO</h1>
        <p className="text-gray-400 mb-8">Your AI-powered fitness companion</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Heart className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-gray-400">Heart Rate</span>
            </div>
            <p className="text-3xl font-bold">72 <span className="text-sm text-gray-500">bpm</span></p>
            <p className="text-green-400 text-sm mt-2">Normal zone</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Dumbbell className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-gray-400">Workouts</span>
            </div>
            <p className="text-3xl font-bold">12 <span className="text-sm text-gray-500">this week</span></p>
            <p className="text-green-400 text-sm mt-2">+2 from last week</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-gray-400">Calories</span>
            </div>
            <p className="text-3xl font-bold">2,847 <span className="text-sm text-gray-500">kcal</span></p>
            <p className="text-green-400 text-sm mt-2">85% of goal</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-gray-400">Active Minutes</span>
            </div>
            <p className="text-3xl font-bold">345 <span className="text-sm text-gray-500">min</span></p>
            <p className="text-gray-400 text-sm mt-2">On track for weekly goal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Recent Workouts</h2>
            <div className="space-y-4">
              {[
                { name: "HIIT Session", date: "Today, 7:00 AM", duration: "45 min", calories: "520 kcal" },
                { name: "Strength Training", date: "Yesterday, 6:30 PM", duration: "60 min", calories: "380 kcal" },
                { name: "Morning Run", date: "2 days ago, 6:00 AM", duration: "35 min", calories: "280 kcal" },
              ].map((workout, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{workout.name}</p>
                    <p className="text-sm text-gray-400">{workout.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{workout.duration}</p>
                    <p className="text-sm text-gray-400">{workout.calories}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">AI Coach Insights</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-800/30">
                <p className="text-sm text-blue-300 mb-2">Personalized Recommendation</p>
                <p className="text-gray-300">
                  Based on your recent performance, we recommend focusing on recovery today.
                  Consider a light stretching session or yoga to optimize your gains.
                </p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Weekly Trend</p>
                <p className="text-gray-300">
                  You&apos;ve increased your workout intensity by 23% this week. Keep it up!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
