"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Wait until session is checked

    if (status === "unauthenticated" || !session) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  return null; // Nothing to render while redirecting
}
