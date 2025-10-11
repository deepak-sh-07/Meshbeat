"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TransitionLink from "../components/TransitionLink";
import styles from "./dashboard.module.css";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
  }, [session, status, router]);

  if (!session) return null;

  return (
    <>
      <div className={styles.container}>
        <div className={styles.signout}>
          <button onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign Out
          </button>
        </div>
      </div>

      <div className={styles.second}>
        <div className={styles.title}>Anytime, Anywhere.</div>
        <div className={styles.d1}>
          Create a room or join an existing one to listen
        </div>
        <div className={styles.d2}>to music with friends in real time.</div>

        <div className={styles.buttons}>
          <TransitionLink href="/createroom" className={styles.transitionButton}>
            <img src="/plus.svg" alt="Create" />
            Create a Room
          </TransitionLink>

          <TransitionLink href="/join" className={styles.transitionButton}>
            <img src="/enter.svg" alt="Join" />
            Join a Room
          </TransitionLink>
        </div>
      </div>
    </>
  );
}
