"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
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

const HOVER_DELAY_MS = 300; // Delay before opening dropdown

export function FAQSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expandedByClickIndex, setExpandedByClickIndex] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleHoverEnter = (index: number) => {
    setHoveredIndex(index);
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Set delay before expanding
    hoverTimeoutRef.current = setTimeout(() => {
      setExpandedIndex(index);
      setExpandedByClickIndex(null); // hover-driven expansion
    }, HOVER_DELAY_MS);
  };

  const handleHoverLeave = () => {
    setHoveredIndex(null);
    // Clear timeout if mouse leaves before delay completes
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Only collapse if not expanded by click
    if (expandedIndex !== null && expandedByClickIndex !== expandedIndex) {
      setExpandedIndex(null);
    }
  };

  const toggleExpanded = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
      setExpandedByClickIndex(null);
    } else {
      setExpandedIndex(index);
      setExpandedByClickIndex(index); // mark as click-driven expansion
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section
      id="faqs"
      className="relative py-32 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#0b1120] border-t border-white/10 overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl opacity-50 animate-pulse" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Find answers to common questions about Sentinel and how it can help your team
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <PremiumCard
              key={index}
              faq={faq}
              index={index}
              isExpanded={expandedIndex === index}
              isHovered={hoveredIndex === index}
              onMouseEnter={() => handleHoverEnter(index)}
              onMouseLeave={handleHoverLeave}
              onClick={() => toggleExpanded(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PremiumCard({
  faq,
  index,
  isExpanded,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick
}: any) {
  const ref = useRef<HTMLDivElement>(null);

  // Cursor-follow light effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: any) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Magnetic hover
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMagnet = (e: any) => {
    if (!isHovered) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);

    x.set(offsetX * 0.05);
    y.set(offsetY * 0.05);
  };

  const resetMagnet = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      layout
      style={{ x, y }}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleMagnet(e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => {
        onMouseLeave();
        resetMagnet();
      }}
      onClick={onClick}
      aria-expanded={isExpanded}
      {...(isExpanded && { "aria-controls": `faq-answer-${index}` })}
      className="relative rounded-2xl p-[1px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 cursor-pointer transition-all duration-300 w-full text-left"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
    >
      {/* Animated Gradient Border */}
      <motion.div
        animate={{ 
          backgroundPosition: isExpanded ? "200% center" : "0% center",
          opacity: isHovered ? 0.6 : 0.4
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-2xl blur-lg bg-[length:200%_200%]"
        style={{
          backgroundImage: "linear-gradient(90deg, #00f5ff, #a78bfa, #ec4899, #00f5ff)"
        }}
      />

      {/* Glass Morphism Card */}
      <motion.div
        layout
        className={`relative bg-white/5 backdrop-blur-xl border rounded-2xl p-6 overflow-hidden transition-all duration-300 ${
          isHovered 
            ? "border-cyan-400/50 bg-white/10" 
            : "border-white/10 bg-white/5"
        }`}
      >
        {/* Cursor Light - matches background gradient */}
        <motion.div
          className="pointer-events-none absolute w-64 h-64 bg-gradient-to-br from-cyan-400/30 via-indigo-400/30 to-purple-400/30 rounded-full blur-3xl"
          animate={{ opacity: isHovered ? 1 : 0.5 }}
          style={{
            left: springX,
            top: springY,
            translateX: "-50%",
            translateY: "-50%"
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Question */}
        <div className="flex justify-between items-center relative z-10 group">
          <h3 className={`text-lg font-semibold transition-all duration-300 ${
            isExpanded ? "text-cyan-300" : "text-white group-hover:text-cyan-200"
          }`}>
            {faq.question}
          </h3>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <ChevronDown className={`h-5 w-5 transition-colors duration-300 ${
              isExpanded || isHovered ? "text-cyan-400" : "text-indigo-400"
            }`} />
          </motion.div>
        </div>

        {/* Answer */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="relative z-10"
              id={`faq-answer-${index}`}
            >
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-gray-300 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
}