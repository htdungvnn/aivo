import type { Metadata } from "next";
import { PrivacyPageClient } from "./PrivacyPageClient";

export const metadata: Metadata = {
  title: "Privacy Policy - AIVO",
  description: "Learn how AIVO protects your privacy. Our commitment to data security, transparency, and giving you control over your fitness information.",
  keywords: ["privacy", "data protection", "GDPR", "HIPAA", "fitness data", "security"],
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
