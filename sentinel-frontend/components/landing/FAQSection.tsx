"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "What is Sentinel?",
    answer:
      "Sentinel is a DevOps agent platform designed to monitor, heal, and automate your infrastructure with ease."
  },
  {
    question: "How do I set up Sentinel?",
    answer:
      "You can set up Sentinel by following the quick-setup guide in the documentation or running the quick-setup.js script in the backend directory."
  },
  {
    question: "Does Sentinel support real-time monitoring?",
    answer:
      "Yes, Sentinel provides real-time monitoring and alerting for your infrastructure."
  },
  {
    question: "Is Sentinel open source?",
    answer:
      "Yes, Sentinel is open source and contributions are welcome!"
  },
  {
    question: "Where can I get support?",
    answer:
      "You can get support by opening an issue on GitHub or checking the FAQ and documentation provided in the project."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faqs"
      className="relative py-24 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#0b1120] border-t border-white/10 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent"
        >
          Frequently Asked Questions
        </motion.h2>

        <div className="space-y-6">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-cyan-400/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.25)]"
              >
                {/* Question */}
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex justify-between items-center p-6 text-left"
                >
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300">
                    {faq.question}
                  </h3>

                  <ChevronDown
                    className={`h-5 w-5 text-cyan-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Answer */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="px-6 pb-6 text-gray-300 leading-relaxed"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}