"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useTransition } from "./TransitionContext";
import { useEffect, useState } from "react";

export default function AnimatedPage({ children }) {
  const pathname = usePathname();
  const { isExiting } = useTransition();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [bgColor, setBgColor] = useState("#191b20"); // default background

  const animations = {
    "/login": { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, bgColor: "#301718" },
    "/register": { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, bgColor: "#3b1d1e" },
    "/dashboard": { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -15 }, bgColor: "#1d1c1c" },
    "/createroom": { initial: { opacity: 0, y: 25 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, bgColor: "#311a1b" },
    "/join": { initial: { opacity: 0, y: 25 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, bgColor: "#2e2d2d" },
    "/room": { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -15 }, bgColor: "#452627" },
  };

  const variant = animations[pathname] || {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
    bgColor: "#191b20",
  };

  // Keep previous children visible until exit animation finishes
  useEffect(() => {
    if (!isExiting) {
      setDisplayChildren(children);
      setBgColor(variant.bgColor); // smoothly update background
    }
  }, [children, isExiting, pathname, variant.bgColor]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={variant.initial}
        animate={isExiting ? variant.exit : variant.animate}
        exit={variant.exit}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{
          backgroundColor: bgColor,
          transition: "background-color 0.4s ease",
        }}
        className="min-h-screen min-w-screen overflow-hidden"
      >
        {displayChildren}
      </motion.div>
    </AnimatePresence>
  );
}
