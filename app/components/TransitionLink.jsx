"use client";

import { useRouter } from "next/navigation";

export default function TransitionLink({ href, children, className, ...props }) {
  const router = useRouter();

  const handleClick = (e) => {
    e.preventDefault();

    // Check if browser supports View Transitions
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        router.push(href);
      });
    } else {
      // Fallback for browsers that don't support it
      router.push(href);
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}