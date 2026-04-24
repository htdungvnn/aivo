"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Database,
  Cloud,
  Globe,
  Cookie,
  FileText,
  UserCheck,
  Mail,
  Phone,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const tableOfContents = [
  { id: "commitment", title: "Our Privacy Commitment", icon: Shield },
  { id: "data-collection", title: "Information We Collect", icon: Database },
  { id: "cookies", title: "Cookies & Tracking", icon: Cookie },
  { id: "data-usage", title: "How We Use Your Data", icon: Eye },
  { id: "data-sharing", title: "Data Sharing & Third Parties", icon: Globe },
  { id: "data-protection", title: "Security Measures", icon: Lock },
  { id: "data-retention", title: "Data Retention", icon: FileText },
  { id: "user-rights", title: "Your Rights & Choices", icon: UserCheck },
  { id: "children", title: "Children's Privacy", icon: Shield },
  { id: "international", title: "International Data Transfers", icon: Globe },
  { id: "changes", title: "Changes to This Policy", icon: FileText },
  { id: "contact", title: "Contact Us", icon: Mail },
];

export function PrivacyPageClient() {
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-gray-400 text-sm mt-1">Last updated: April 24, 2025</p>
            </div>
          </div>

          {/* Table of Contents */}
          <Card className="bg-slate-900/50 border-slate-700/50 mb-8">
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Table of Contents
              </h2>
              <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tableOfContents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors text-sm py-1"
                  >
                    <item.icon className="w-4 h-4 text-cyan-400/70" />
                    <span>{item.title}</span>
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Introduction */}
              <section id="commitment" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Our Privacy Commitment
                </h2>
                <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-600/5 border-cyan-500/20">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      At AIVO, we believe your fitness data is yours—and yours alone. Our privacy-first architecture is designed to give you complete control over your personal information while delivering powerful AI-driven insights.
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                      This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read it carefully. By using AIVO, you consent to the practices described in this policy.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Data Collection */}
              <section id="data-collection" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  Information We Collect
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-white font-semibold mb-2">Personal Information</h3>
                        <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm">
                          <li>Name and email address (via OAuth with Google/Facebook)</li>
                          <li>Profile photo and display name</li>
                          <li>Account credentials (hashed and encrypted)</li>
                          <li>Subscription and billing information (processed via Stripe)</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-2">Fitness Data</h3>
                        <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm">
                          <li>Body measurements (height, weight, body fat percentage)</li>
                          <li>Body photos for AI analysis (stored temporarily, deleted after processing)</li>
                          <li>Workout history and exercise performance metrics</li>
                          <li>Nutrition logs and dietary preferences</li>
                          <li>Recovery metrics (sleep, heart rate variability, resting heart rate)</li>
                          <li>AI-generated insights and recommendations</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-2">Technical Data</h3>
                        <ul className="text-gray-300 space-y-2 list-disc list-inside text-sm">
                          <li>Device information (OS, browser, app version)</li>
                          <li>IP address and approximate location (for security & optimization)</li>
                          <li>Usage analytics (pages visited, features used, time spent)</li>
                          <li>Crash logs and error reports (anonymized)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Cookies */}
              <section id="cookies" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Cookie className="w-5 h-5 text-cyan-400" />
                  Cookies & Tracking Technologies
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      We use essential cookies and similar technologies to provide and improve our services:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left py-3 px-3 text-cyan-400">Cookie Type</th>
                            <th className="text-left py-3 px-3 text-cyan-400">Purpose</th>
                            <th className="text-left py-3 px-3 text-cyan-400">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Essential</td>
                            <td className="py-3 px-3">Authentication, session management</td>
                            <td className="py-3 px-3">Session</td>
                          </tr>
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Preference</td>
                            <td className="py-3 px-3">Language, theme settings</td>
                            <td className="py-3 px-3">1 year</td>
                          </tr>
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Analytics</td>
                            <td className="py-3 px-3">Usage patterns, performance (optional)</td>
                            <td className="py-3 px-3">2 years</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-gray-400 text-xs mt-4">
                      * You can opt out of non-essential cookies via your browser settings or our cookie consent banner.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Data Usage */}
              <section id="data-usage" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  How We Use Your Data
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      We use your information to provide, improve, and personalize our services:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: "AI Analysis", desc: "Process body photos to generate muscle activation heatmaps and fitness insights" },
                        { title: "Personalized Plans", desc: "Create custom workout schedules tailored to your goals and recovery" },
                        { title: "Progress Tracking", desc: "Monitor your fitness journey and visualize improvements over time" },
                        { title: "Feature Delivery", desc: "Provide core platform functionality including syncing and notifications" },
                        { title: "Service Improvement", desc: "Analyze aggregated, anonymized data to improve our AI models" },
                        { title: "Communication", desc: "Send service updates, security alerts, and optional marketing (opt-in)" },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                          <h4 className="text-cyan-400 font-semibold mb-1">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Data Sharing */}
              <section id="data-sharing" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Data Sharing & Third Parties
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      We do not sell your personal data. We only share information with trusted partners who help us deliver our services:
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Cloud className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-emerald-400 font-semibold">Cloudflare</h4>
                          <p className="text-gray-400 text-sm">Hosting, CDN, D1 database, R2 storage, and edge computing. Data processed under strict EU-US Data Privacy Framework.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-blue-400 font-semibold">Stripe</h4>
                          <p className="text-gray-400 text-sm">Payment processing for subscriptions. Only billing information is shared.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-purple-400 font-semibold">Google / Facebook</h4>
                          <p className="text-gray-400 text-sm">OAuth authentication providers. We receive only your verified email and basic profile.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Security */}
              <section id="data-protection" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  Security Measures
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      We implement industry-leading security measures to protect your data:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { title: "Encryption", desc: "AES-256 encryption at rest and TLS 1.3 in transit" },
                        { title: "Zero-Trust Auth", desc: "Cloudflare Turnstile + OAuth 2.0 with MFA support" },
                        { title: "Edge Security", desc: "All data processed at edge locations, never centralized" },
                        { title: "Access Controls", desc: "Role-based access with audit logging" },
                        { title: "Regular Audits", desc: "SOC 2 Type II compliant infrastructure" },
                        { title: "Bug Bounty", desc: "Responsible disclosure program for security researchers" },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                          <h4 className="text-emerald-400 font-semibold mb-1">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Data Retention */}
              <section id="data-retention" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Data Retention
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            <th className="text-left py-3 px-3 text-cyan-400">Data Type</th>
                            <th className="text-left py-3 px-4 text-cyan-400">Retention Period</th>
                            <th className="text-left py-3 px-3 text-cyan-400">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Account Info</td>
                            <td className="py-3 px-4">Until account deletion</td>
                            <td className="py-3 px-3">Retained while account is active</td>
                          </tr>
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Workout History</td>
                            <td className="py-3 px-4">Indefinite</td>
                            <td className="py-3 px-3">User can export/delete anytime</td>
                          </tr>
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Body Photos</td>
                            <td className="py-3 px-4">24 hours</td>
                            <td className="py-3 px-3">Deleted after AI processing</td>
                          </tr>
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Analytics Data</td>
                            <td className="py-3 px-4">26 months</td>
                            <td className="py-3 px-3">Aggregated, anonymized</td>
                          </tr>
                          <tr className="border-b border-slate-800/50">
                            <td className="py-3 px-3">Logs</td>
                            <td className="py-3 px-4">90 days</td>
                            <td className="py-3 px-3">Access logs for security</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* User Rights */}
              <section id="user-rights" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  Your Rights & Choices
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      You have full control over your data. Under GDPR, CCPA, and other privacy laws, you can:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { title: "Access", desc: "Request a copy of all your personal data" },
                        { title: "Rectify", desc: "Correct inaccurate information" },
                        { title: "Port", desc: "Export your data in JSON/CSV format" },
                        { title: "Delete", desc: "Remove your account and all associated data" },
                        { title: "Restrict", desc: "Limit certain types of processing" },
                        { title: "Object", desc: "Opt out of marketing communications" },
                      ].map((right, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                          <h4 className="text-cyan-400 font-semibold mb-1">{right.title}</h4>
                          <p className="text-gray-400 text-xs">{right.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <p className="text-cyan-300 text-sm">
                        <strong>How to exercise your rights:</strong> Visit Settings → Privacy in the app, email privacy@aivo.fitness, or use our data deletion form at /settings/delete-account.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Children's Privacy */}
              <section id="children" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  Children's Privacy
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed">
                      AIVO is not intended for users under 16 years of age. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately and we will delete that information.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* International Transfers */}
              <section id="international" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  International Data Transfers
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      AIVO operates globally using Cloudflare's edge network. Your data may be processed in any country where Cloudflare maintains servers, including:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside mb-4">
                      <li>United States (primary data residency)</li>
                      <li>European Union (EU data centers available)</li>
                      <li>Canada, United Kingdom, Australia, Japan, and others</li>
                    </ul>
                    <p className="text-gray-300 leading-relaxed">
                      All transfers comply with the EU-US Data Privacy Framework and Standard Contractual Clauses. You can request EU-only storage by contacting support.
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Changes */}
              <section id="changes" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Changes to This Privacy Policy
                </h2>
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. When we make material changes:
                    </p>
                    <ul className="text-gray-300 space-y-2 list-disc list-inside">
                      <li>We will notify you via email at least 30 days before changes take effect</li>
                      <li>We will update the "Last updated" date at the top of this policy</li>
                      <li>For significant changes, we may require your explicit consent</li>
                    </ul>
                  </CardContent>
                </Card>
              </section>

              {/* Contact */}
              <section id="contact" className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cyan-400" />
                  Contact Us
                </h2>
                <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30">
                  <CardContent className="pt-6">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      If you have questions about this Privacy Policy or our data practices, please reach out:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-cyan-400" />
                        <a href="mailto:privacy@aivo.fitness" className="text-cyan-400 hover:underline">
                          privacy@aivo.fitness
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-cyan-400" />
                        <span>+1 (555) 123-4567</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mt-4">
                      Data Protection Officer: DPO@aivo.fitness<br />
                      Mailing Address: AIVO Inc., Attn: Privacy Team, San Francisco, CA 94105
                    </p>
                    <p className="text-gray-400 text-sm mt-4">
                      We typically respond within 48 hours. For EU residents, you may also contact our EU representative.
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
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg transition-all"
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
