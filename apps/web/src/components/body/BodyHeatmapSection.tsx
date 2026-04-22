"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BodyHeatmap } from "./BodyHeatmap";
import { useBodyHeatmap } from "./useBodyHeatmap";
import { BODY_ZONES } from "@aivo/shared-types";
import type { HeatmapRegion } from "@aivo/shared-types";
import {
  Upload,
  RefreshCw,
  Camera,
  History,
  AlertCircle,
  CheckCircle,
  Activity,
} from "lucide-react";

interface HeatmapZoneOverlay {
  zoneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  color: string;
}

/**
 * Transform heatmap regions to zone overlays
 */
function regionsToZoneOverlays(regions: HeatmapRegion[]): HeatmapZoneOverlay[] {
  return regions.map(region => {
    const zone = BODY_ZONES.find(z => z.id === region.zoneId);
    const intensity = region.intensity / 10; // 0-1

    // Color from green (0) to yellow (0.5) to red (1)
    let r: number, g: number, b: number;
    if (intensity < 0.5) {
      const t = intensity * 2;
      r = Math.round(255 * t);
      g = 255;
      b = 0;
    } else {
      const t = (intensity - 0.5) * 2;
      r = 255;
      g = Math.round(255 * (1 - t));
      b = 0;
    }

    const bounds = zone?.bounds;
    return {
      zoneId: region.zoneId,
      x: bounds?.x ? bounds.x * 200 : 0,
      y: bounds?.y ? bounds.y * 400 : 0,
      width: bounds?.width ? bounds.width * 200 : 0,
      height: bounds?.height ? bounds.height * 400 : 0,
      intensity,
      color: `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.4})`,
    };
  }).filter(overlay => overlay.width > 0 && overlay.height > 0);
}

export function BodyHeatmapSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    currentHeatmap,
    currentPhoto,
    loading,
    error,
    refetch,
    zoneOverlays,
    history,
    loadHistory,
    uploadPhoto,
    analyzePhoto,
  } = useBodyHeatmap();

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Transform history heatmaps to zone overlays
  const historyWithOverlays = useMemo(() => {
    return history.map(item => ({
      ...item,
      overlays: item.heatmap.regions ? regionsToZoneOverlays(item.heatmap.regions) : [],
    }));
  }, [history]);

  const handleAnalyze = useCallback(async (photoId?: string) => {
    const id = photoId || currentPhoto?.id;
    if (!id) {return;}

    setAnalyzing(true);
    try {
      const result = await analyzePhoto(id);
      if (result) {
        setUploadMessage("Analysis complete! Heatmap generated.");
        setTimeout(() => setUploadMessage(null), 3000);
        await refetch();
      } else {
        setUploadMessage("Analysis failed. Please try again.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setUploadMessage(err.message);
      } else {
        setUploadMessage("Analysis failed");
      }
    } finally {
      setAnalyzing(false);
    }
  }, [currentPhoto, analyzePhoto, refetch]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {return;}

    setUploading(true);
    setUploadMessage(null);

    try {
      const result = await uploadPhoto(file);
      if (result?.photo) {
        setUploadMessage(`Photo uploaded! Click "Analyze" to generate heatmap.`);
        // Auto-trigger analysis after upload
        await handleAnalyze(result.photo.id);
      } else {
        setUploadMessage("Upload failed. Please try again.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setUploadMessage(err.message);
      } else {
        setUploadMessage("Upload failed");
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (e.target) {e.target.value = "";}
    }
  }, [uploadPhoto, handleAnalyze]);

  const loadMoreHistory = useCallback(async () => {
    await loadHistory(10, history.length);
  }, [history.length, loadHistory]);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
        disabled={uploading}
      />

      {/* Current Heatmap Display */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Heatmap Visualization */}
        <div className="flex-1 flex items-center justify-center">
          {loading && !currentHeatmap ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-purple-300">Loading your heatmap...</span>
            </div>
          ) : currentHeatmap ? (
            <BodyHeatmap
              zoneOverlays={zoneOverlays}
              width={300}
              height={600}
              animate={true}
              selectedMuscles={[]}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Camera className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">No Heatmap Yet</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                  Upload a body photo and let AI analyze your body composition
                </p>
              </div>
              <Button
                onClick={triggerFileUpload}
                disabled={uploading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Controls & Info Panel */}
        <div className="lg:w-80 space-y-4">
          {/* Upload Card */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-400" />
              Upload & Analyze
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={triggerFileUpload}
                disabled={uploading}
                className="w-full bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Select Photo
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleAnalyze()}
                disabled={!currentPhoto || analyzing || loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>

              {uploadMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-sm ${
                    uploadMessage.includes("complete") || uploadMessage.includes("uploaded")
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                      : "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                  }`}
                >
                  {uploadMessage}
                </motion.div>
              )}
            </div>
          </Card>

          {/* Last Analysis Info */}
          {currentPhoto && (
            <Card className="bg-slate-800/50 border-slate-700/50 p-4">
              <h3 className="font-semibold text-white mb-3">Last Analysis</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Photo Date</span>
                  <span className="text-white">
                    {new Date(currentPhoto.uploadDate * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge
                    variant="outline"
                    className={
                      currentHeatmap
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }
                  >
                    {currentHeatmap ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </Badge>
                </div>
                {currentHeatmap?.metrics?.overallScore && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Overall Score</span>
                    <span className="text-white">
                      {currentHeatmap.metrics.overallScore}/100
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Zones Legend */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-4">
            <h3 className="font-semibold text-white mb-3">Zone Intensity</h3>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400">Lean</span>
              <div className="flex-1 mx-3 h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
              <span className="text-gray-400">Fat</span>
            </div>
            <p className="text-xs text-gray-500">
              Colors show muscle vs fat distribution in each body zone
            </p>
          </Card>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section */}
      {history.length > 0 && (
        <div className="border-t border-slate-800/50 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Heatmap History</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-400 hover:text-white"
            >
              {showHistory ? "Hide" : "Show All"}
            </Button>
          </div>

          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
            >
              {historyWithOverlays.map((item, index) => (
                <Card
                  key={item.heatmap.id}
                  className={`bg-slate-800/50 border-slate-700/50 overflow-hidden cursor-pointer transition-all ${
                    selectedHistoryIndex === index
                      ? "ring-2 ring-purple-500 border-purple-500/50"
                      : "hover:border-purple-500/30"
                  }`}
                  onClick={() => setSelectedHistoryIndex(index === selectedHistoryIndex ? null : index)}
                >
                  <div className="aspect-[1/2] bg-slate-900/50 flex items-center justify-center p-2">
                    <BodyHeatmap
                      zoneOverlays={item.overlays}
                      width={100}
                      height={200}
                      animate={false}
                      showOutline={false}
                    />
                  </div>
                  <div className="p-2 text-center border-t border-slate-700/50">
                    <p className="text-xs text-gray-400">
                      {new Date(item.heatmap.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}

          {!showHistory && (
            <Button
              variant="outline"
              className="w-full border-slate-700/50 text-gray-400 hover:border-purple-500/30 hover:text-purple-300"
              onClick={loadMoreHistory}
            >
              <History className="w-4 h-4 mr-2" />
              Load More History
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
