"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const TransitionContext = createContext(undefined);

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error("useTransition must be used within a TransitionProvider");
  }
  return context;
};

export function TransitionProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExiting, setIsExiting] = useState(false);
  const [displayPath, setDisplayPath] = useState(pathname);

  // Sync path when user navigates with back/forward
  useEffect(() => {
    setDisplayPath(pathname);
  }, [pathname]);

  const triggerTransition = (href) => {
    if (href === pathname || isExiting) return;

    setIsExiting(true);

    // Wait for exit animation to complete before navigation
    setTimeout(() => {
      router.push(href);
      setDisplayPath(href);

      // Allow small delay before resetting to prevent overlap flicker
      setTimeout(() => setIsExiting(false), 200);
    }, 500); // matches animation duration
  };

  return (
    <TransitionContext.Provider value={{ isExiting, triggerTransition, displayPath }}>
      {children}
    </TransitionContext.Provider>
  );
}
