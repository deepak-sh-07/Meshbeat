"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { useEffect } from "react";
export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // While checking the session, you might want to show a loader
   useEffect(() => {
    if (status === "loading") return; // wait for session
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
          Create a room or join existing one to listen
        </div>
        <div className={styles.d2}>to music with friends in real-time.</div>

        <div className={styles.buttons}>
          <button onClick={()=> router.push("/createroom")}>
            <img src="/plus.svg" alt="Create" />
             Create a Room
          </button>
          <button onClick={() => router.push("/join")}>
            <img src="/enter.svg" alt="Join" />
            Join a Room
          </button>
        </div>
      </div>
    </>
  );
}
