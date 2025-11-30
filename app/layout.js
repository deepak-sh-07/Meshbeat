"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import AnimatedPage from "./components/AnimatedPage";
import './view-transitions.css'

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
        <div className="bg-wrapper fixed inset-0 -z-10" style={{ backgroundColor: "#191b20" }} />
        
        <SessionProvider>
          <AnimatedPage>{children}</AnimatedPage>
        </SessionProvider>
      </body>
    </html>
  );
}