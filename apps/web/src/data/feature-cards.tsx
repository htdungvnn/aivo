/**
 * Feature Details Data
 * Detailed information for each feature showcased on the landing page
 * Extracted from page.tsx for better code organization and potential sharing
 */

export interface FeatureDetail {
  benefits: string[];
  specs: { label: string; value: string }[];
  useCases: string[];
}

export interface FeatureCardConfig {
  id: string;
  title: string;
  description: string;
  gradient: string;
  borderGradient: string;
  icon: string;
  badgeColor: string;
  badgeBgColor: string;
  badgeBorderColor: string;
  details: FeatureDetail;
}

export const featureDetails: Record<string, FeatureDetail> = {
  edgeAuth: {
    benefits: [
      "Zero-knowledge proofs for privacy-preserving authentication",
      "Behavioral biometrics continuously verify user identity",
      "Geographic-based risk assessment blocks suspicious logins",
      "Hardware-backed keys for phishing-resistant MFA",
      "SOC 2 Type II certified infrastructure"
    ],
    specs: [
      { label: "Auth Latency", value: "< 50ms global" },
      { label: "Uptime SLA", value: "99.99%" },
      { label: "Encryption", value: "AES-256-GCM" },
      { label: "Compliance", value: "GDPR, HIPAA, SOC2" }
    ],
    useCases: [
      "Healthcare providers requiring HIPAA compliance",
      "Enterprise teams with SSO requirements",
      "High-security applications with sensitive health data",
      "Global apps needing low-latency auth worldwide"
    ]
  },
  aiInsight: {
    benefits: [
      "Real-time body composition analysis from a single photo",
      "Muscle group activation heatmaps with 95% accuracy",
      "Progress tracking with AI-generated insights",
      "Personalized recommendations based on your unique physiology",
      "3D body model generation from 2D inputs"
    ],
    specs: [
      { label: "Analysis Time", value: "< 3 seconds" },
      { label: "Accuracy", value: "95%+" },
      { label: "Data Points", value: "600+ muscle points" },
      { label: "Models", value: "Custom CNN + ViT" }
    ],
    useCases: [
      "Track muscle growth and fat loss over time",
      "Identify muscular imbalances for injury prevention",
      "Optimize training focus based on weak points",
      "Share progress with trainers for coaching"
    ]
  },
  scheduler: {
    benefits: [
      "50% reduction in AI token usage through smart batching",
      "Recovery-aware scheduling adapts to your fatigue levels",
      "Progressive overload automatically incorporated",
      "Equipment and time constraints respected",
      "Seamless calendar integration with Google/Apple Calendar"
    ],
    specs: [
      { label: "Optimization", value: "Rust WASM engine" },
      { label: "Schedule Generation", value: "< 500ms" },
      { label: "Token Savings", value: "~50%" },
      { label: "Calendar Sync", value: "Real-time" }
    ],
    useCases: [
      "Busy professionals needing efficient workout planning",
      "Athletes managing multiple training modalities",
      "Gyms creating personalized programs at scale",
      "Anyone wanting to maximize results with minimal AI cost"
    ]
  },
  tracking: {
    benefits: [
      "Millisecond-precision sync across all devices",
      "Offline-first architecture works without connectivity",
      "Real-time collaboration with trainers and teammates",
      "Comprehensive analytics dashboard with trend analysis",
      "Export data to CSV, JSON, or PDF formats"
    ],
    specs: [
      { label: "Sync Speed", value: "< 100ms" },
      { label: "Offline Support", value: "7 days" },
      { label: "Data Resolution", value: "1ms precision" },
      { label: "Storage", value: "Unlimited" }
    ],
    useCases: [
      "Monitor daily fitness metrics and recovery",
      "Share workouts with training partners",
      "Analyze long-term trends and plateaus",
      "Prepare for competitions with precise tracking"
    ]
  },
  retention: {
    benefits: [
      "AI analyzes user behavior to predict churn risk",
      "Personalized push notifications with 40%+ open rates",
      "Adaptive challenges match user fitness levels",
      "Social features including leaderboards and groups",
      "Achievement system with 100+ badges"
    ],
    specs: [
      { label: "Engagement Boost", value: "+156% retention" },
      { label: "Notification AI", value: "GPT-4 powered" },
      { label: "Badges Available", value: "100+" },
      { label: "Social Features", value: "Full suite" }
    ],
    useCases: [
      "Fitness apps reducing monthly churn",
      "Gyms increasing member retention",
      "Corporate wellness programs boosting participation",
      "Coaches keeping clients motivated long-term"
    ]
  }
};

export const featureCardsConfig: FeatureCardConfig[] = [
  {
    id: 'edgeAuth',
    title: 'Edge Auth',
    description: 'Military-grade security with Cloudflare Turnstile. Zero-trust authentication at the edge, protecting your health data with biometric verification and behavioral analysis.',
    gradient: 'from-emerald-500 to-teal-600',
    borderGradient: 'hover:border-emerald-500/50',
    icon: 'Shield',
    badgeColor: 'text-emerald-400',
    badgeBgColor: 'bg-emerald-500/10',
    badgeBorderColor: 'border-emerald-500/30',
    details: featureDetails.edgeAuth
  },
  {
    id: 'aiInsight',
    title: 'AI Body Insight',
    description: 'Visualize your body composition through 2D vector heatmaps. Our AI analyzes muscle distribution, fat percentage zones, and provides actionable insights with surgical precision.',
    gradient: 'from-cyan-500 to-blue-600',
    borderGradient: 'hover:border-cyan-500/50',
    icon: 'Brain',
    badgeColor: 'text-cyan-400',
    badgeBgColor: 'bg-cyan-500/10',
    badgeBorderColor: 'border-cyan-500/30',
    details: featureDetails.aiInsight
  },
  {
    id: 'scheduler',
    title: 'AI Smart Scheduler',
    description: 'Rust-powered optimization engine creates personalized workout schedules. Save 50% on AI tokens while getting hyper-personalized plans that adapt to your recovery and progress.',
    gradient: 'from-purple-500 to-pink-600',
    borderGradient: 'hover:border-purple-500/50',
    icon: 'Calendar',
    badgeColor: 'text-purple-400',
    badgeBgColor: 'bg-purple-500/10',
    badgeBorderColor: 'border-purple-500/30',
    details: featureDetails.scheduler
  },
  {
    id: 'tracking',
    title: 'Status Tracking',
    description: 'Real-time dashboard syncing across Web and Mobile. Track metrics, visualize trends, and monitor your fitness journey with millisecond-precision data updates.',
    gradient: 'from-blue-500 to-indigo-600',
    borderGradient: 'hover:border-blue-500/50',
    icon: 'BarChart3',
    badgeColor: 'text-blue-400',
    badgeBgColor: 'bg-blue-500/10',
    badgeBorderColor: 'border-blue-500/30',
    details: featureDetails.tracking
  },
  {
    id: 'retention',
    title: 'Retention Engine',
    description: 'AI-powered gamification with memory graph technology. Personalized nudges, achievement systems, and adaptive challenges keep users engaged and coming back for more.',
    gradient: 'from-orange-500 to-amber-600',
    borderGradient: 'hover:border-orange-500/50',
    icon: 'Bot',
    badgeColor: 'text-orange-400',
    badgeBgColor: 'bg-orange-500/10',
    badgeBorderColor: 'border-orange-500/30',
    details: featureDetails.retention
  }
];

// Icon component mapping for lazy loading
export const iconMap = {
  Shield: () => import('lucide-react').then(mod => mod.Shield),
  Brain: () => import('lucide-react').then(mod => mod.Brain),
  Calendar: () => import('lucide-react').then(mod => mod.Calendar),
  BarChart3: () => import('lucide-react').then(mod => mod.BarChart3),
  Bot: () => import('lucide-react').then(mod => mod.Bot),
  Star: () => import('lucide-react').then(mod => mod.Star),
  CheckCircle2: () => import('lucide-react').then(mod => mod.CheckCircle2),
  ChevronRight: () => import('lucide-react').then(mod => mod.ChevronRight),
  ChevronDown: () => import('lucide-react').then(mod => mod.ChevronDown),
  Quote: () => import('lucide-react').then(mod => mod.Quote),
};
