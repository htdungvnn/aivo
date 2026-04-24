"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Scale,
  FileText,
  AlertTriangle,
  CreditCard,
  Landmark,
  MessageCircle,
  Ban,
  RefreshCw,
  Shield,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const tableOfContents = [
  { id: "agreement", title: "Acceptance of Terms", icon: FileText },
  { id: "service", title: "Service Description", icon: Scale },
  { id: "accounts", title: "Account Requirements", icon: Shield },
  { id: "medical", title: "Medical Disclaimer", icon: AlertTriangle },
  { id: "user-responsibilities", title: "User Responsibilities", icon: Shield },
  { id: "payments", title: "Payment & Subscriptions", icon: CreditCard },
  { id: "intellectual-property", title: "Intellectual Property", icon: Landmark },
  { id: "user-content", title: "User Content License", icon: FileText },
  { id: "prohibited", title: "Prohibited Activities", icon: Ban },
  { id: "termination", title: "Termination", icon: RefreshCw },
  { id: "limitation", title: "Limitation of Liability", icon: Shield },
  { id: "disputes", title: "Dispute Resolution", icon: Scale },
  { id: "changes", title: "Changes to Terms", icon: RefreshCw },
  { id: "contact", title: "Contact Information", icon: MessageCircle },
];

export function TermsPageClient() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 text-white py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-8 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Terms of Service</h1>
              <p className="text-gray-400 text-sm mt-1">Last updated: April 24, 2025</p>
            </div>
          </div>

          {/* Introduction */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/30 mb-8">
            <CardContent className="pt-6">
              <p className="text-gray-300 leading-relaxed">
                Welcome to AIVO. These Terms of Service ("Terms") govern your use of the AIVO platform, including our website, mobile applications, and API services (collectively, the "Service"). Please read these Terms carefully before using AIVO.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                By accessing or using AIVO, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use our Service.
              </p>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card className="bg-slate-900/50 border-slate-700/50 mb-8">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Table of Contents
              </h2>
              <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tableOfContents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-purple-400 transition-colors text-sm py-1"
                  >
                    <item.icon className="w-4 h-4 text-purple-400/70" />
                    <span>{item.title}</span>
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Agreement */}
              <section id="agreement" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Acceptance of Terms
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      These Terms constitute a legally binding agreement between you and AIVO Inc. ("AIVO", "we", "us", or "our"). By accessing or using the Service, you represent that:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm">
                      <li>You are at least 16 years of age</li>
                      <li>You have the legal capacity to enter into this agreement</li>
                      <li>You are not barred from using the Service under applicable law</li>
                      <li>You have read, understood, and agree to be bound by these Terms</li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Service Description */}
              <section id="service" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-purple-400" />
                  Service Description
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      AIVO is an AI-native fitness intelligence platform that provides:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm mb-4">
                      <li>Body composition analysis through AI-powered image processing</li>
                      <li>Personalized workout scheduling and optimization</li>
                      <li>Real-time fitness tracking and metrics visualization</li>
                      <li>Nutrition logging and analysis</li>
                      <li>AI-powered coaching and insights</li>
                      <li>Cross-platform synchronization (web, mobile)</li>
                    </ul>
                    <p className="text-gray-400 text-sm">
                      The Service is provided "as-is" and may be updated, modified, or discontinued without notice. We reserve the right to limit availability based on capacity, geographic location, or other factors.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Account Requirements */}
              <section id="accounts" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Account Requirements
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      To use AIVO, you must:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm mb-4">
                      <li>Create an account using Google OAuth or Facebook OAuth</li>
                      <li>Provide accurate and complete information</li>
                      <li>Maintain the security of your account credentials</li>
                      <li>Not share your account with others</li>
                      <li>Keep your contact information up to date</li>
                    </ul>
                    <p className="text-gray-300 leading-relaxed">
                      You are responsible for all activities that occur under your account. Notify us immediately at support@aivo.fitness if you suspect unauthorized access.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Medical Disclaimer */}
              <section id="medical" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Medical Disclaimer
                </h2>
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="pt-6">
                    <p className="text-amber-100 leading-relaxed mb-4">
                      <strong>IMPORTANT:</strong> AIVO is designed for informational and educational purposes only. The fitness recommendations, health insights, and nutritional guidance provided through our Service are NOT medical advice.
                    </p>
                    <p className="text-gray-300 leading-relaxed mb-4">
                      Before starting any new fitness program, diet, or supplement regimen:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm">
                      <li>Consult with a qualified healthcare provider</li>
                      <li>Discuss any pre-existing medical conditions</li>
                      <li>Get clearance for exercise if you have health concerns</li>
                      <li>Stop immediately and seek medical help if you experience pain or discomfort</li>
                    </ul>
                    <p className="text-gray-300 leading-relaxed mt-4">
                      AIVO and its team are not licensed medical professionals. We are not responsible for any injuries, health complications, or adverse effects resulting from your use of our Service.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* User Responsibilities */}
              <section id="user-responsibilities" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  User Responsibilities
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      You agree to use the Service responsibly and in compliance with these Terms:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: "Accurate Information", desc: "Provide truthful data including body measurements and health status" },
                        { title: "Account Security", desc: "Keep your login credentials secure and confidential" },
                        { title: "Lawful Use", desc: "Use the Service in accordance with all applicable laws" },
                        { title: "No Abuse", desc: "Do not attempt to manipulate, exploit, or overload the system" },
                        { title: "Respect Others", desc: "Treat other users with respect; no harassment or bullying" },
                        { title: Report Issues", desc: "Report security vulnerabilities or bugs promptly" },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                          <h4 className="text-purple-400 font-semibold mb-1">{item.title}</h4>
                          <p className="text-gray-400 text-xs">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Payments */}
              <section id="payments" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  Payment & Subscriptions
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <ul className="text-gray-300 space-y-4">
                      <li>
                        <strong className="text-white">Free Tier:</strong> AIVO offers a free tier with limited features including 5 AI analyses per month, basic tracking, and mobile app access.
                      </li>
                      <li>
                        <strong className="text-white">Pro Tier ($19.99/month):</strong> Unlimited AI analyses, advanced analytics, priority support, calendar sync, and data export.
                      </li>
                      <li>
                        <strong className="text-white">Enterprise Tier:</strong> Custom pricing for gyms, trainers, and corporate wellness programs. Contact business@aivo.fitness.
                      </li>
                      <li>
                        <strong className="text-white">Billing:</strong> Payments processed securely via Stripe. All prices are in USD. Taxes may apply based on your location.
                      </li>
                      <li>
                        <strong className="text-white">Cancellation:</strong> Cancel anytime from your account settings. No refunds for partial months, but you retain access until the billing period ends.
                      </li>
                      <li>
                        <strong className="text-white">Price Changes:</strong> We may adjust prices with 30 days notice to existing subscribers.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Intellectual Property */}
              <section id="intellectual-property" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-purple-400" />
                  Intellectual Property
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      The AIVO platform, including but not limited to:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm mb-4">
                      <li>The "AIVO" name, logo, and branding</li>
                      <li>Software code, algorithms, and AI models</li>
                      <li>User interface design and visual elements</li>
                      <li>Documentation, tutorials, and marketing materials</li>
                    </ul>
                    <p className="text-gray-300 leading-relaxed">
                      ...are the exclusive property of AIVO Inc. and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, reverse engineer, or create derivative works without our written permission.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* User Content License */}
              <section id="user-content" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  User Content License
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      You retain ownership of any content you upload to AIVO, including body photos, workout logs, and personal data ("User Content"). By using our Service, you grant us:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm mb-4">
                      <li>A worldwide, non-exclusive license to process your User Content to provide the Service</li>
                      <li>The right to store and cache your data on our infrastructure</li>
                      <li>Permission to use aggregated, anonymized data for research and improvement</li>
                    </ul>
                    <p className="text-gray-300 leading-relaxed">
                      We will never sell your personal content. Body photos are deleted within 24 hours of upload. You may revoke this license by deleting your account.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Prohibited Activities */}
              <section id="prohibited" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-400" />
                  Prohibited Activities
                </h2>
                <Card className="bg-red-500/10 border-red-500/30">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      You may NOT use AIVO for:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm">
                      <li>Any illegal purpose or to facilitate illegal activities</li>
                      <li>Harassment, abuse, or harm of other users</li>
                      <li>Uploading malicious code, viruses, or harmful content</li>
                      <li>Attempting to bypass security measures or access unauthorized areas</li>
                      <li>Automated scraping or data extraction without permission</li>
                      <li>Impersonating AIVO staff or other users</li>
                      <li>Using the Service to train competing AI models</li>
                      <li>Reverse engineering our AI models or algorithms</li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Termination */}
              <section id="termination" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  Termination
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-semibold mb-2">By You</h4>
                        <p className="text-gray-300 text-sm">
                          You may terminate your account at any time through your account settings or by contacting support@aivo.fitness. Upon termination, your data will be deleted within 30 days.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">By AIVO</h4>
                        <p className="text-gray-300 text-sm">
                          We may suspend or terminate your access if you violate these Terms, engage in fraudulent activity, or create a risk to our infrastructure. We will provide notice when possible. Termination does not eliminate any accrued rights or claims.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Limitation of Liability */}
              <section id="limitation" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Limitation of Liability
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, AIVO AND ITS AFFILIATES SHALL NOT BE LIABLE FOR:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm mb-4">
                      <li>Any indirect, incidental, special, or consequential damages</li>
                      <li>Loss of profits, data, or business opportunities</li>
                      <li>Service interruptions, errors, or downtime</li>
                      <li>Injuries or health issues arising from use of fitness recommendations</li>
                      <li>Any damages exceeding the amount paid by you in the past 12 months</li>
                    </ul>
                    <p className="text-gray-400 text-sm">
                      Some jurisdictions do not allow limitation of liability, so this may not apply to you.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Dispute Resolution */}
              <section id="disputes" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-purple-400" />
                  Dispute Resolution
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      Before pursuing legal action, we encourage you to contact us to resolve any disputes. Any claim arising from these Terms shall be governed by:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm mb-4">
                      <li><strong className="text-white">Governing Law:</strong> California law, without regard to conflict of laws principles</li>
                      <li><strong className="text-white">Venue:</strong> Courts in San Francisco County, California</li>
                      <li><strong className="text-white">Arbitration:</strong> For disputes exceeding $10,000, binding arbitration is available</li>
                      <li><strong className="text-white">Class Actions:</strong> You waive the right to participate in class action lawsuits</li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Changes to Terms */}
              <section id="changes" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-purple-400" />
                  Changes to Terms
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      We may update these Terms from time to time. When we make material changes:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm">
                      <li>We will notify you via email at least 30 days before the changes take effect</li>
                      <li>The "Last updated" date will be revised</li>
                      <li>For significant changes, your continued use constitutes acceptance</li>
                      <li>You may object to changes by deleting your account before they take effect</li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Contact */}
              <section id="contact" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  Contact Information
                </h2>
                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/30">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      Questions about these Terms? Contact our legal team:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-purple-400" />
                        <a href="mailto:legal@aivo.fitness" className="text-purple-400 hover:underline">
                          legal@aivo.fitness
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-purple-400" />
                        <span>+1 (555) 123-4567</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mt-4">
                      Mailing Address: AIVO Inc., Attn: Legal Department, San Francisco, CA 94105
                    </p>
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Sidebar TOC */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">On This Page</h3>
                <nav className="space-y-1">
                  {tableOfContents.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-purple-400 hover:bg-purple-500/5 rounded-lg transition-all"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
