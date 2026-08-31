/**
 * AIVO Design System - FAQ Data
 * Typed FAQ entries for landing page
 */

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: "general" | "ai" | "privacy" | "pricing" | "technical";
}

export const faqItems: FAQItem[] = [
  {
    id: "ai-safety",
    question: "Is AIVO's AI advice safe?",
    answer:
      "AIVO provides wellness guidance based on evidence-based health practices, not medical diagnoses or treatments. Our AI coach can help with general nutrition advice, fitness motivation, and healthy lifestyle tips. However, AIVO does not replace professional medical advice, diagnosis, or treatment. Always consult a healthcare professional for medical concerns.",
    category: "ai",
  },
  {
    id: "platforms",
    question: "What platforms does AIVO support?",
    answer:
      "AIVO is available on iOS and Android mobile apps, as well as a full-featured web application. All your data syncs seamlessly across devices, so you can track on mobile and analyze on web. Desktop browsers supported include Chrome, Firefox, Safari, and Edge.",
    category: "general",
  },
  {
    id: "free-vs-pro",
    question: "What's included in the free plan?",
    answer:
      "The free plan includes basic health profile setup, daily tracking for weight, sleep, hydration, and habits, limited AI coaching (3 interactions per week), and basic weekly summaries. Upgrading to Pro unlocks unlimited AI coaching, meal analysis, personalized plans, advanced analytics, and cross-device sync.",
    category: "pricing",
  },
  {
    id: "cancel-subscription",
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your subscription at any time from your account settings. On mobile, go to Profile > Settings > Subscription. On web, visit Settings > Billing. Your access continues until the end of your current billing period. Your data remains accessible (read-only) after cancellation, and you can reactivate anytime.",
    category: "pricing",
  },
  {
    id: "data-privacy",
    question: "How does AIVO protect my health data?",
    answer:
      "We take your privacy seriously. Your data is encrypted in transit and at rest using industry-standard encryption. We never sell your personal or health data to third parties. You own your data and can export or delete it anytime. We collect only what's necessary for the service and are transparent about our practices. Review our Privacy Policy and Health Data Policy for details.",
    category: "privacy",
  },
  {
    id: "medical-replacement",
    question: "Does AIVO replace seeing a doctor?",
    answer:
      "No. AIVO provides wellness guidance and does not diagnose medical conditions, prescribe treatments, or replace professional healthcare. Our AI coach offers general wellness tips and motivation. For any medical concerns, symptoms, or conditions, always consult a qualified healthcare professional. Never ignore professional medical advice or delay seeking it because of anything you read in AIVO.",
    category: "ai",
  },
  {
    id: "data-export",
    question: "Can I export my data?",
    answer:
      "Yes. You can export all your health data anytime from your account settings. We support JSON and CSV formats. Your export includes tracking data, meal logs, workout records, and AI interactions. You retain full ownership of your data and can download it even after account deletion (within 30 days of deletion request).",
    category: "privacy",
  },
  {
    id: "sync-devices",
    question: "How does data sync work?",
    answer:
      "AIVO syncs your data in real-time across all your devices using secure cloud infrastructure. When you track on mobile, it's immediately available on web, and vice versa. Offline changes are queued and synced when connectivity is restored. Sync is end-to-end encrypted for privacy.",
    category: "technical",
  },
  {
    id: "accurate-nutrition",
    question: "How accurate is the AI meal analysis?",
    answer:
      "Our AI meal analysis provides estimates based on food recognition and nutritional databases. While we strive for accuracy, the analysis is an approximation and should not replace professional nutritional advice for medical conditions. For specific dietary needs, consult a registered dietitian. We're continuously improving our models.",
    category: "ai",
  },
  {
    id: "age-requirement",
    question: "What's the minimum age to use AIVO?",
    answer:
      "AIVO is designed for adults 18 years and older. We do not knowingly collect data from children under 13. If you're under 18 but over 13, you may use AIVO with parental consent and supervision. Always involve a parent or guardian when making significant health or dietary changes.",
    category: "general",
  },
];

export const faqCategories = {
  general: { label: "General", description: "Basic questions about AIVO" },
  ai: { label: "AI Coach", description: "Questions about AI features" },
  privacy: { label: "Privacy & Security", description: "Data protection questions" },
  pricing: { label: "Pricing & Billing", description: "Subscription questions" },
  technical: { label: "Technical", description: "How the app works" },
} as const;

export function getFAQByCategory(category: FAQItem["category"]): FAQItem[] {
  return faqItems.filter((item) => item.category === category);
}
