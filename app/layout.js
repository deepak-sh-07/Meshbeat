"use client";

import { SessionProvider } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./globals.css";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  const animations = {
    "/createroom": { 
      initial: { opacity: 0, y: 10, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -10, scale: 0.97 },
      bgColor: "rgb(49, 26, 27)",
    },
    "/dashboard": {
      initial: { opacity: 0, y: 5, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -5, scale: 0.98 },
      bgColor: "linear-gradient(to bottom right, #1d1c1c, #2a2a2a)",
    },
    "/join": {
      initial: { opacity: 0, y: 12, scale: 0.975 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -12, scale: 0.975 },
      bgColor: "linear-gradient(to bottom right, #2e2d2d, #3b3a3a)",
    },
    "/login": {
      initial: { opacity: 0, y: 15, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -15, scale: 0.97 },
      bgColor: "linear-gradient(to bottom right, #301718, #3b1d1e)",
    },
    "/register": {
      initial: { opacity: 0, y: 15, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -15, scale: 0.97 },
      bgColor: "linear-gradient(to bottom right, #301718, #3b1d1e)",
    },
    "/room": {
      initial: { opacity: 0, y: 10, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -10, scale: 0.97 },
      bgColor: "linear-gradient(to bottom right, #311a1b, #452627)",
    },
  };

  const variant = animations[pathname] || {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
    bgColor: "linear-gradient(to bottom right, #191b20, #2a2b2c)", // default
  };

  if (!isClient)
    return (
      <html lang="en">
        <body>
          <SessionProvider>{children}</SessionProvider>
        </body>
      </html>
    );

  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={variant.initial}
              animate={variant.animate}
              exit={variant.exit}
              transition={{ duration: 0.42, ease: "easeInOut" }}
              className="min-h-screen min-w-screen overflow-hidden fixed inset-0 z-50"
              style={{ background: variant.bgColor }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </SessionProvider>
      </body>
    </html>
  );
}
