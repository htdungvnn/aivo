"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Camera, Image as ImageIcon, Loader2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNutrition } from "./useNutrition";

interface FoodPhotoUploadProps {
  onAnalysisComplete?: (analysis: any) => void;
  onLogCreated?: (log: any) => void;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout" | "custom";
  className?: string;
}

export function FoodPhotoUpload({
  onAnalysisComplete,
  onLogCreated,
  mealType = "lunch",
  className,
}: FoodPhotoUploadProps) {
  const { uploadFoodImage, analyzeFoodImage, createFoodLogFromAnalysis, loading, error } = useNutrition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Upload image
      const uploadResult = await uploadFoodImage(file);
      setUploadedImageUrl(uploadResult.imageUrl);

      // Analyze with AI
      setAnalyzing(true);
      const analysisResult = await analyzeFoodImage(uploadResult.imageUrl, mealType);
      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  }, [uploadFoodImage, analyzeFoodImage, mealType, onAnalysisComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleCreateLog = useCallback(async () => {
    if (!analysis) return;

    try {
      const log = await createFoodLogFromAnalysis({
        detectedItems: analysis.detectedItems,
        mealType: mealType,
      });
      onLogCreated?.(log);
      // Reset state
      setPreview(null);
      setUploadedImageUrl(null);
      setAnalysis(null);
    } catch (err) {
      console.error("Failed to create log:", err);
    }
  }, [analysis, mealType, createFoodLogFromAnalysis, onLogCreated]);

  const handleClear = useCallback(() => {
    setPreview(null);
    setUploadedImageUrl(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-4">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            analyzing && "opacity-50 pointer-events-none"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={loading || analyzing}
          />

          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Food preview"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                type="button"
              >
                <X className="size-4" />
              </button>

              {analyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="size-8 animate-spin" />
                    <span>Analyzing food...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-muted">
                {dragOver ? <Camera className="size-8 text-primary" /> : <ImageIcon className="size-8 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-medium">Drop food photo here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports JPG, PNG, WebP. Max 10MB.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={loading}>
                <Upload className="size-4 mr-2" />
                Choose Photo
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="size-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {analysis && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Detected Foods</h4>
              <Button onClick={handleCreateLog} disabled={loading}>
                {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                Log to Journal
              </Button>
            </div>

            <div className="space-y-2">
              {analysis.detectedItems.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.estimatedPortionG}g ({item.portionUnit})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.calories} cal</p>
                    <p className="text-xs text-muted-foreground">
                      P: {item.protein_g}g • C: {item.carbs_g}g • F: {item.fat_g}g
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between p-3 bg-primary/10 rounded-lg text-sm">
              <span className="font-medium">Total</span>
              <div className="text-right">
                <p className="font-medium">{analysis.totalCalories} calories</p>
                <p className="text-muted-foreground">
                  Protein: {analysis.totalProtein}g • Carbs: {analysis.totalCarbs}g • Fat: {analysis.totalFat}g
                </p>
              </div>
            </div>

            {analysis.analysisConfidence && (
              <p className="text-xs text-muted-foreground text-center">
                AI confidence: {Math.round(analysis.analysisConfidence * 100)}%
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
