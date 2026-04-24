"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient } from "@aivo/api-client";
import { Moon, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SleepLogFormProps {
  onSuccess?: () => void;
  prefilledDate?: string;
}

export function SleepLogForm({ onSuccess, prefilledDate }: SleepLogFormProps) {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    date: prefilledDate || new Date().toISOString().split("T")[0],
    durationHours: 7,
    qualityScore: 75,
    deepSleepMinutes: 90,
    remSleepMinutes: 90,
    awakeMinutes: 15,
    bedtime: "22:30",
    waketime: "06:30",
    consistencyScore: 80,
    notes: "",
  });

  const apiClient = user ? createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787/api",
    tokenProvider: async () => localStorage.getItem("aivo_token") || "",
    userIdProvider: async () => user.id,
  }) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiClient) {return;}

    setLoading(true);
    setMessage(null);

    try {
      const result = await apiClient.createSleepLog(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Sleep log saved successfully!" });
        onSuccess?.();
        // Reset form except date
        setFormData(prev => ({
          ...prev,
          durationHours: 7,
          qualityScore: 75,
          deepSleepMinutes: 90,
          remSleepMinutes: 90,
          awakeMinutes: 15,
          notes: "",
        }));
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save sleep log" });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: "error", text: err.message });
      } else {
        setMessage({ type: "error", text: "Failed to save sleep log" });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-900/30 via-slate-900/60 to-purple-900/30 border-indigo-500/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-400" />
          Log Sleep
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-400">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationHours" className="text-gray-400">Duration (hours)</Label>
              <Input
                id="durationHours"
                name="durationHours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.durationHours}
                onChange={handleChange}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualityScore" className="text-gray-400">Sleep Quality (0-100)</Label>
              <Input
                id="qualityScore"
                name="qualityScore"
                type="number"
                min="0"
                max="100"
                value={formData.qualityScore}
                onChange={handleChange}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deepSleepMinutes" className="text-gray-400">Deep Sleep (min)</Label>
              <Input
                id="deepSleepMinutes"
                name="deepSleepMinutes"
                type="number"
                min="0"
                max="480"
                value={formData.deepSleepMinutes}
                onChange={handleChange}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remSleepMinutes" className="text-gray-400">REM Sleep (min)</Label>
              <Input
                id="remSleepMinutes"
                name="remSleepMinutes"
                type="number"
                min="0"
                max="300"
                value={formData.remSleepMinutes}
                onChange={handleChange}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="awakeMinutes" className="text-gray-400">Awake Time (min)</Label>
              <Input
                id="awakeMinutes"
                name="awakeMinutes"
                type="number"
                min="0"
                value={formData.awakeMinutes}
                onChange={handleChange}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedtime" className="text-gray-400">Bedtime</Label>
              <Input
                id="bedtime"
                name="bedtime"
                type="time"
                value={formData.bedtime}
                onChange={handleChange}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waketime" className="text-gray-400">Wake Time</Label>
              <Input
                id="waketime"
                name="waketime"
                type="time"
                value={formData.waketime}
                onChange={handleChange}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-400">Notes (optional)</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="How did you sleep? Any disruptions?"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Sleep Log
              </>
            )}
          </Button>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/20 border border-red-500/30 text-red-300"
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>
    </Card>
  );
}
