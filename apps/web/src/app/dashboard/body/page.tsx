"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BodyInsightCard } from "@/components/body/BodyInsightCard";
import { Upload, Image, X, FileImage, Activity } from "lucide-react";
import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function BodyInsightPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

  useEffect(() => {
    setMounted(true);
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!imageFile || !user) {return;}

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const token = localStorage.getItem("aivo_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const formData = new FormData();
      formData.append("image", imageFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload to R2
      const uploadRes = await fetch(`${apiUrl}/api/body/upload`, {
        method: "POST",
        headers: {
          "X-User-Id": user.id,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadRes.json();
      setSelectedImage(uploadData.data.imageUrl);

      // Optionally trigger AI analysis
      // await triggerAnalysis(uploadData.data.imageUrl);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to upload image");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !user) {return;}

    setAnalyzing(true);
    setError(null);

    try {
      const token = localStorage.getItem("aivo_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const res = await fetch(`${apiUrl}/api/body/vision/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-User-Id": user.id,
        },
        body: JSON.stringify({
          imageUrl: selectedImage,
          analyzeMuscles: true,
          analyzePosture: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Analysis failed");
      }

      // Redirect back to insights or show success
      alert("Analysis complete! Your body metrics have been updated.");
      router.back();

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to analyze image");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setError(null);
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-white transition-colors mr-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="relative">
                <Activity className="w-7 h-7 text-cyan-400" />
                <div className="absolute -inset-1 bg-cyan-400/20 rounded-full blur-sm" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                AIVO
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                Dashboard
              </a>
              <a href="#" className="text-cyan-400 border-b-2 border-cyan-400 pb-1 text-sm font-medium transition-colors">
                Body Insights
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                AI Coach
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Body Insight Analysis
          </h1>
          <p className="text-gray-400">
            Upload a body photo to receive AI-powered analysis of your physique, posture, and muscle development.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Analysis */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">Upload Body Photo</h2>

              {selectedImage ? (
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-full aspect-[3/4] object-cover rounded-lg bg-slate-800"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500 hover:bg-slate-800/50 transition-all group">
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                      <Image className="w-8 h-8 text-slate-400 group-hover:text-cyan-400" />
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, WebP (max 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelect}
                  />
                </label>
              )}

              <div className="mt-6 space-y-3">
                {uploading ? (
                  <div className="w-full">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleUpload}
                      disabled={!imageFile || uploading}
                      className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={!selectedImage || analyzing}
                      className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
                    >
                      {analyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FileImage className="w-4 h-4" />
                          Run AI Analysis
                        </>
                      )}
                    </button>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Analysis Includes:</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    Posture assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    Muscle symmetry analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    Muscle development heatmap
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    Body composition estimates
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Tips Card */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 rounded-xl p-6"
            >
              <h3 className="text-cyan-400 font-semibold mb-3">Tips for Best Results</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Stand straight with arms slightly away from body</li>
                <li>Wear form-fitting clothing</li>
                <li>Good, even lighting without harsh shadows</li>
                <li>Front view works best for muscle analysis</li>
                <li>Take photos at consistent times for tracking</li>
              </ul>
            </motion.div>
          </div>

          {/* Right Column - Full Insights */}
          <div className="lg:col-span-2">
            <BodyInsightCard
              apiUrl={apiUrl}
              compact={false}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
