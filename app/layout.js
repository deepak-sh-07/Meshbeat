"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { TransitionProvider } from "./components/TransitionContext";
import AnimatedPage from "./components/AnimatedPage";

export default function RootLayout({ children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  if (!isClient) {
    return (
      <html lang="en">
        <body>
          <SessionProvider>{children}</SessionProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        {/* Persistent background to prevent white flash */}
        <div className="bg-wrapper fixed inset-0 -z-10" />
        
        <SessionProvider>
          <TransitionProvider>
            <AnimatedPage>{children}</AnimatedPage>
          </TransitionProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
