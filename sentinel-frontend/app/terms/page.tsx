"use client";

import { motion } from "framer-motion";
import { ShieldCheck, FileText, Mail } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1120] to-[#020617] text-white px-6 py-16 relative overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Page Title */}
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent"
        >
          Terms & Conditions
        </motion.h1>

        {/* Card Component */}
        {[
          {
            icon: <ShieldCheck size={28} />,
            title: "Project Terms",
            content: (
              <ul className="space-y-3 text-gray-300">
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
            icon: <FileText size={28} />,
            title: "Legal Notice",
            content: (
              <ul className="space-y-3 text-gray-300">
                <li>Platform is provided "as-is" without warranty.</li>
                <li>Users must comply with applicable laws and regulations.</li>
                <li>Intellectual property governed by LICENSE file.</li>
                <li>Contributors retain rights under licensing terms.</li>
                <li>Refer to documentation for privacy policies.</li>
              </ul>
            )
          },
          {
            icon: <Mail size={28} />,
            title: "Contact & Support",
            content: (
              <p className="text-gray-300">
                For support, bug reports, or feature requests, please use official documentation
                or contact the team via GitHub.
              </p>
            )
          }
        ].map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 0 40px rgba(99,102,241,0.4)"
            }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8 transition-all duration-500 hover:border-indigo-400/40"
          >
            <div className="flex items-center gap-4 mb-6 text-indigo-400">
              {section.icon}
              <h2 className="text-2xl font-semibold">{section.title}</h2>
            </div>

            {section.content}
          </motion.div>
        ))}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          © {new Date().getFullYear()} Sentinel DevOps Agent. All rights reserved.
        </div>
      </div>
    </main>
  );
}