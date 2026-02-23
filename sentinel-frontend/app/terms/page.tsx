
"use client";
import { motion } from "framer-motion";
import { ShieldCheck, FileText, Mail } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  const sections = [
    {
      icon: ShieldCheck,
      title: "Project Terms",
      content: (
        <ul className="space-y-3 text-gray-300 leading-relaxed">
          <li>All users must comply with Sentinel DevOps Agent security policies.</li>
          <li>Data privacy is ensured as per documentation and legal requirements.</li>
          <li>Platform usage is monitored for reliability and compliance.</li>
          <li>Unauthorized access or misuse results in suspension.</li>
          <li>Automated actions are logged for audit transparency.</li>
          <li>Incident logs are retained for reliability improvements.</li>
        </ul>
      )
    },
    {
      icon: FileText,
      title: "Legal Notice",
      content: (
        <ul className="space-y-3 text-gray-300 leading-relaxed">
          <li>Platform is provided &quot;as-is&quot; without warranty.</li>
          <li>Users must comply with applicable laws and regulations.</li>
          <li>Intellectual property governed by LICENSE file.</li>
          <li>Contributors retain rights under licensing terms.</li>
          <li>Refer to documentation for privacy policies.</li>
        </ul>
      )
    },
    {
      icon: Mail,
      title: "Contact & Support",
      content: (
        <p className="text-gray-300 leading-relaxed">
          For support, bug reports, or feature requests, please use official
          documentation or contact the team via GitHub.
        </p>
      )
    }
  ];

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#0b1120] text-white px-6 py-20 overflow-hidden">

      {/* Back Button */}
      <div className="absolute left-6 top-6 z-20">
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-indigo-500/20 border border-white/20 text-cyan-200 font-medium shadow transition-colors duration-200">
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Animated Background Orbs */}
      <motion.div
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-10 left-10 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ y: [0, -40, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute bottom-10 right-10 w-[28rem] h-[28rem] bg-cyan-500/20 rounded-full blur-3xl"
      />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Terms & Conditions
          </h1>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-sm md:text-base">
            Please review our platform policies and guidelines carefully before using our services.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="space-y-10">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                whileHover={{
                  y: -8,
                  scale: 1.03,
                  boxShadow: "0 8px 40px 0 rgba(99,102,241,0.25)"
                }}
                className="group relative bg-gradient-to-br from-white/10 via-indigo-400/5 to-cyan-400/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 transition-all duration-500 shadow-xl hover:border-indigo-400/60 hover:shadow-[0_8px_60px_rgba(99,102,241,0.25)]"
              >
                {/* Animated Gradient Border */}
                <div className="absolute inset-0 rounded-3xl pointer-events-none z-0">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.8 }}
                    className="w-full h-full bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-purple-500/20 blur-2xl group-hover:opacity-80 opacity-0 transition-opacity duration-500 rounded-3xl"
                  />
                </div>
                <div className="relative z-10">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-5 mb-8">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/40 to-cyan-500/40 border border-indigo-400/40 shadow-md">
                      <Icon size={28} className="text-cyan-300 drop-shadow-lg" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-wide text-white drop-shadow-sm">
                      {section.title}
                    </h2>
                  </div>
                  <div className="pl-2 pr-2 md:pl-6 md:pr-6">
                    {section.content}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-20 text-gray-500 text-sm border-t border-white/10 pt-8">
          © {new Date().getFullYear()} Sentinel DevOps Agent. All rights reserved.
        </div>

      </div>
    </main>
  );
}