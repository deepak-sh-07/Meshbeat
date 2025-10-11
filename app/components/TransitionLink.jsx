"use client";

import { useTransition } from "./TransitionContext";

export default function TransitionLink({ href, children, className, ...props }) {
  const { triggerTransition } = useTransition();

  const handleClick = (e) => {
    e.preventDefault();
    triggerTransition(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
