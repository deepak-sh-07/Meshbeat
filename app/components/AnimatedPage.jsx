"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useTransition } from "./TransitionContext";
import { useEffect, useState } from "react";

export default function AnimatedPage({ children }) {
  const pathname = usePathname();
  const { isExiting } = useTransition();
  const [displayChildren, setDisplayChildren] = useState(children);

  // Animation configs for each page
  const animations = {
    "/login": { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
    "/register": { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
    "/dashboard": { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -15 } },
    "/createroom": { initial: { opacity: 0, y: 25 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
    "/join": { initial: { opacity: 0, y: 25 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
    "/room": { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -15 } },
  };

  const variant = animations[pathname] || {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
  };

  // Keep previous children visible until exit animation finishes
  useEffect(() => {
    if (!isExiting) {
      setDisplayChildren(children);
    }
  }, [children, isExiting, pathname]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#191b20" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={variant.initial}
          animate={isExiting ? variant.exit : variant.animate}
          exit={variant.exit}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {displayChildren}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
