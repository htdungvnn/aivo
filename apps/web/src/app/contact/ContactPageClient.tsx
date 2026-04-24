"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock,
  Send,
  Headphones,
  Building2,
  MessageSquare,
  LifeBuoy,
  Calendar,
  Globe,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const contactDepartments = [
  {
    icon: Headphones,
    title: "Technical Support",
    email: "support@aivo.fitness",
    description: "Help with app issues, bugs, and technical questions",
    responseTime: "Within 24 hours",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Building2,
    title: "Business & Partnerships",
    email: "business@aivo.fitness",
    description: "Enterprise sales, gym partnerships, and B2B opportunities",
    responseTime: "Within 48 hours",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: MessageSquare,
    title: "Feedback & Feature Requests",
    email: "feedback@aivo.fitness",
    description: "Share your ideas and help shape the future of AIVO",
    responseTime: "Within 5 business days",
    color: "from-purple-500 to-pink-600",
  },
  {
    icon: LifeBuoy,
    title: "Privacy & Data Requests",
    email: "privacy@aivo.fitness",
    description: "Data access, deletion requests, and privacy concerns",
    responseTime: "Within 30 days (GDPR compliance)",
    color: "from-amber-500 to-orange-600",
  },
];

const faqItems = [
  {
    question: "How do I reset my password?",
    answer: "Use the 'Forgot Password' link on the login page. We'll send a reset link to your registered email within 5 minutes.",
  },
  {
    question: "How do I delete my account?",
    answer: "Go to Settings → Account → Delete Account. All your data will be permanently removed within 30 days. You'll receive a confirmation email.",
  },
  {
    question: "Can I export my data?",
    answer: "Yes! Visit Settings → Privacy → Export Data. You can download your workouts, body metrics, and AI analysis history in JSON or CSV format.",
  },
  {
    question: "How do I upgrade or cancel my subscription?",
    answer: "Manage your subscription in Settings → Billing. You can upgrade, downgrade, or cancel anytime. Cancellations take effect at the end of the current billing period.",
  },
];

export function ContactPageClient() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-8 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Contact Us</h1>
              <p className="text-gray-400 text-sm mt-1">
                We typically respond within 24 hours
              </p>
            </div>
          </div>

          {/* Hero Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: "< 24h", label: "Avg Response Time" },
              { value: "98%", label: "Satisfaction Rate" },
              { value: "50K+", label: "Happy Users" },
              { value: "24/7", label: "Support Available" },
            ].map((stat, idx) => (
              <Card key={idx} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-cyan-400 mb-1">{stat.value}</div>
                  <div className="text-gray-400 text-xs">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Departments */}
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Contact Departments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {contactDepartments.map((dept, idx) => (
              <Card key={idx} className="bg-slate-900/50 border-slate-700/50 hover:border-blue-500/30 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center shrink-0`}>
                      <dept.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white mb-1">{dept.title}</h3>
                      <p className="text-gray-400 text-sm mb-2">{dept.description}</p>
                      <a
                        href={`mailto:${dept.email}`}
                        className="text-blue-400 hover:underline text-sm"
                      >
                        {dept.email}
                      </a>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-500 text-xs">{dept.responseTime}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/30 mb-8">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-400" />
                Send Us a Message
              </h2>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Full Name *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email Address *</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Subject *</label>
                    <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-white">
                      <option value="">Select a topic</option>
                      <option value="technical">Technical Support</option>
                      <option value="feedback">Feature Request</option>
                      <option value="bug">Report a Bug</option>
                      <option value="business">Business Inquiry</option>
                      <option value="billing">Billing Question</option>
                      <option value="privacy">Privacy Concern</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Account Email (if applicable)</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                      placeholder="account@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Message *</label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-white resize-none"
                    placeholder="Describe your issue or question in detail..."
                    required
                  />
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" id="copy" className="mt-1" />
                  <label htmlFor="copy" className="text-sm text-gray-400">
                    Send me a copy of this message
                  </label>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500"
                  size="lg"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <p className="text-center text-gray-500 text-xs">
                  By submitting, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* FAQ */}
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 mb-8">
            {faqItems.map((faq, idx) => (
              <Card key={idx} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-white mb-2">{faq.question}</h3>
                  <p className="text-gray-400 text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white">Follow Us</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors">
                    <span className="w-6">𝕏</span> Twitter
                  </a>
                  <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors">
                    <span className="w-6">in</span> LinkedIn
                  </a>
                  <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors">
                    <span className="w-6">f</span> Facebook
                  </a>
                  <a href="#" className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors">
                    <span className="w-6">📷</span> Instagram
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white">Phone</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>Support: +1 (555) 123-4567</p>
                  <p>Business: +1 (555) 987-6543</p>
                  <p className="text-xs text-gray-500 mt-2">Mon-Fri 9am-6pm PT</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white">Schedule a Call</h3>
                </div>
                <p className="text-gray-400 text-sm mb-3">
                  Book a video or phone call with our team for complex issues.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Office Location */}
          <Card className="bg-slate-900/50 border-slate-700/50 mt-8">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Office Location
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">AIVO Inc.</h3>
                      <p className="text-gray-400 text-sm">Headquarters</p>
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm space-y-2">
                    <p>450 Sansome Street</p>
                    <p>Suite 1200</p>
                    <p>San Francisco, CA 94111</p>
                    <p>United States</p>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg h-48 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Interactive Map</p>
                  {/* Map would go here */}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
