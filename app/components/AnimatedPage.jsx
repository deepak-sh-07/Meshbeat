"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AnimatedPage({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    // Add page-specific view transition names for custom animations
    const body = document.body;
    
    // Remove previous transition classes
    body.className = body.className.replace(/page-\S+/g, '').trim();
    
    // Add current page class for CSS targeting
    const pageClass = pathname.replace(/\//g, '-') || 'home';
    body.classList.add(`page${pageClass}`);
  }, [pathname]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#191b20" }}>
      {children}
    </div>
  );
}