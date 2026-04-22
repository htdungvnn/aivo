"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  Dumbbell,
  Heart,
  TrendingUp,
  Calendar,
  Award,
  Target,
  ChevronRight,
  Plus,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  Camera,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BodyInsightCard } from "@/components/body/BodyInsightCard";
import { BodyHeatmapSection } from "@/components/body/BodyHeatmapSection";
import { createApiClient, type ExportFormat } from "@aivo/api-client";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const handleExport = useCallback(async () => {
    if (!user) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const token = localStorage.getItem("aivo_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const client = createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787/api",
        tokenProvider: async () => token,
        userIdProvider: async () => user.id,
      });

      const options: Parameters<typeof client.exportData>[0] = {
        format: exportFormat,
      };
      if (exportStartDate) options.startDate = exportStartDate;
      if (exportEndDate) options.endDate = exportEndDate;

      const result = await client.exportData(options);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Export failed");
      }

      // Download the file
      const blob = new Blob([result.data.data], { type: result.data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [user, exportFormat, exportStartDate, exportEndDate]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 text-lg font-medium">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const stats = [
    { icon: Heart, label: "Heart Rate", value: "72", unit: "bpm", color: "blue", status: "Normal" },
    { icon: Dumbbell, label: "Workouts", value: "12", unit: "this week", color: "green", change: "+2" },
    { icon: TrendingUp, label: "Calories", value: "2,847", unit: "kcal", color: "purple", progress: "85%" },
    { icon: Activity, label: "Active Time", value: "345", unit: "min", color: "orange", status: "On track" },
  ];

  const workouts = [
    { name: "HIIT Session", date: "Today, 7:00 AM", duration: "45 min", calories: "520 kcal", color: "red" },
    { name: "Strength Training", date: "Yesterday, 6:30 PM", duration: "60 min", calories: "380 kcal", color: "blue" },
    { name: "Morning Run", date: "2 days ago, 6:00 AM", duration: "35 min", calories: "280 kcal", color: "green" },
  ];

  const upcoming = [
    { day: "Today", time: "6:00 PM", name: "Upper Body Strength", type: "Strength" },
    { day: "Tomorrow", time: "7:00 AM", name: "Morning Cardio", type: "Cardio" },
    { day: "Wed", time: "6:30 PM", name: "Leg Day", type: "Strength" },
  ];

  const achievements = [
    { name: "7-Day Streak", unlocked: true },
    { name: "10K Steps", unlocked: true },
    { name: "First 5K", unlocked: false },
    { name: "Protein Master", unlocked: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-7 h-7 text-cyan-400" />
                <div className="absolute -inset-1 bg-cyan-400/20 rounded-full blur-sm" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                AIVO
              </span>
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                PRO
              </Badge>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-cyan-400 border-b-2 border-cyan-400 pb-1 text-sm font-medium">
                Dashboard
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                Workouts
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                AI Coach
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                Insights
              </a>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border-2 border-cyan-400/30">
                  <span className="text-sm font-bold">{user.name?.charAt(0).toUpperCase() || "U"}</span>
                </div>
                <span className="text-gray-300 text-sm font-medium hidden sm:block">{user.name}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-400">Your AI fitness companion is ready to optimize your journey.</p>
        </motion.div>

        {/* Export Data Card */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-cyan-900/30 via-slate-900/60 to-blue-900/30 border-cyan-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Download className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Export Your Data</h2>
                  <p className="text-sm text-gray-400">Download your complete fitness journey</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Format Selection */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Format
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat("xlsx")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                        exportFormat === "xlsx"
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-slate-800/50 border-slate-700/50 text-gray-300 hover:border-slate-600"
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat("csv")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                        exportFormat === "csv"
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-slate-800/50 border-slate-700/50 text-gray-300 hover:border-slate-600"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat("json")}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                        exportFormat === "json"
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-slate-800/50 border-slate-700/50 text-gray-300 hover:border-slate-600"
                      }`}
                    >
                      <FileJson className="w-4 h-4" />
                      JSON
                    </button>
                  </div>
                </div>

                {/* Date Range */}
                <div className="lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Date Range (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="Start date"
                    />
                    <span className="flex items-center text-gray-500">to</span>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      placeholder="End date"
                    />
                  </div>
                </div>

                {/* Export Button */}
                <div className="lg:col-span-5 flex items-end">
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export {exportFormat.toUpperCase()}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Error Display */}
              {exportError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg"
                >
                  <p className="text-red-300 text-sm">{exportError}</p>
                </motion.div>
              )}

              {/* Info Text */}
              <p className="mt-3 text-xs text-gray-500">
                Includes all your workouts, body metrics, schedules, AI interactions, and gamification data.
                {exportFormat === "xlsx" && " Image links will be clickable in the spreadsheet."}
                Leave date range empty to export all data.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Body Heatmap Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-purple-900/30 via-slate-900/60 to-pink-900/30 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Body Composition Heatmap</h2>
                    <p className="text-sm text-gray-400">AI-powered analysis from your body photos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="body-photo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // TODO: Implement upload
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>
              </div>

              <BodyHeatmapSection />
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-slate-900/60 border-slate-800/50 hover:border-slate-700/50 transition-all h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg bg-${stat.color}-500/20`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                    </div>
                    {stat.change && (
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                        {stat.change}
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {stat.value} <span className="text-sm text-gray-500 font-normal">{stat.unit}</span>
                  </p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  {stat.progress && (
                    <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: stat.progress }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Insights Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Card className="bg-gradient-to-br from-blue-900/30 via-slate-900/60 to-purple-900/30 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Activity className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">AI Coach Insights</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg border border-cyan-800/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-cyan-400" />
                        <p className="text-sm font-medium text-cyan-300">Today&apos;s Focus</p>
                      </div>
                      <p className="text-gray-300">
                        Based on your recent performance, we recommend focusing on recovery today.
                        Consider a light stretching session or yoga to optimize your gains.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-400 mb-2">Weekly Trend</p>
                          <p className="text-white font-semibold text-lg mb-1">+23%</p>
                          <p className="text-sm text-gray-400">Intensity increase</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-400 mb-2">Recovery Score</p>
                          <p className="text-emerald-400 font-semibold text-lg mb-1">89%</p>
                          <p className="text-sm text-gray-400">Optimal readiness</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Workouts */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Card className="bg-slate-900/60 border-slate-800/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Dumbbell className="w-5 h-5 text-green-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Recent Workouts</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-transparent p-0">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {workouts.map((workout, i) => (
                      <motion.div
                        key={i}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInUp}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full bg-${workout.color}-500/20 flex items-center justify-center`}>
                            <Activity className={`w-5 h-5 text-${workout.color}-400`} />
                          </div>
                          <div>
                            <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">{workout.name}</p>
                            <p className="text-sm text-gray-400">{workout.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">{workout.duration}</p>
                          <p className="text-sm text-gray-400">{workout.calories}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Body Insight Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              {user && <BodyInsightCard userId={user.id} apiUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"} />}
            </motion.div>

            {/* Upcoming Workouts */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Card className="bg-slate-900/60 border-slate-800/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Calendar className="w-5 h-5 text-orange-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Upcoming</h2>
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-slate-800">
                      <Plus className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {upcoming.map((item, i) => (
                      <div key={i} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-cyan-400">{item.day}</span>
                          <span className="text-xs text-gray-500">{item.time}</span>
                        </div>
                        <p className="font-medium text-white text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.type}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Card className="bg-gradient-to-br from-amber-900/20 via-slate-900/60 to-orange-900/20 border-amber-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Award className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Achievements</h2>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {achievements.map((achievement, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg text-center border ${
                          achievement.unlocked
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-slate-800/50 border-slate-700/30 opacity-50"
                        }`}
                      >
                        <div className={`text-lg mb-1 ${achievement.unlocked ? "text-amber-400" : "text-gray-500"}`}>
                          {achievement.unlocked ? "🏆" : "🔒"}
                        </div>
                        <p className="text-xs text-gray-300">{achievement.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
