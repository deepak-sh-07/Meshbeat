"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function PageTransition({ children, pathname, variants, transition, bgColor }) {
  const defaultVariants = {
    initial: { opacity: 0, y: 10, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.97 },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={variants?.initial || defaultVariants.initial}
        animate={variants?.animate || defaultVariants.animate}
        exit={variants?.exit || defaultVariants.exit}
        transition={transition || { duration: 0.42, ease: "easeInOut" }}
        className="fixed inset-0 min-h-screen min-w-screen overflow-hidden z-50"
        style={{
          background: bgColor || "transparent", // red or gradient
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
