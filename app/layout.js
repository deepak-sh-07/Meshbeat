"use client";

import { SessionProvider } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import "./globals.css"; // Make sure you have this for base styles

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        <SessionProvider>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname} // ensures animation runs when route changes
              initial={{ opacity: 0, y: 15 }} // start: slightly down + invisible
              animate={{ opacity: 1, y: 0 }}   // animate: visible and in place
              exit={{ opacity: 0, y: -15 }}     // exit: fade + slide up
              transition={{
                duration: 0.4, // animation speed
                ease: "easeInOut", // animation curve
              }}
              className="min-h-screen px-6 py-4"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </SessionProvider>
      </body>
    </html>
  );
}
