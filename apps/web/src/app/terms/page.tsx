import { Metadata } from "next";
import { TermsPageClient } from "./TermsPageClient";

export const metadata: Metadata = {
  title: "Terms of Service - AIVO",
  description: "AIVO Terms of Service. Read about our service agreement, user responsibilities, medical disclaimer, intellectual property, and liability terms.",
  keywords: ["terms of service", "legal", "user agreement", "fitness app terms"],
};

export default function TermsPage() {
  return <TermsPageClient />;
}
