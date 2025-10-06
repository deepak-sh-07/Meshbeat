"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import PageTransition from "../components/PageTransition";
import styles from "./room.module.css";

export default function CreateRoomPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [rname, setRname] = useState("");
  const [room_id, setRoom_id] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/login");
  }, [session, status, router]);

  // Prevent flashing content
  if (status === "loading" || !session) return null;

  const generate = () => {
    const rand = Math.floor(100000 + Math.random() * 900000).toString();
    setRoom_id(rand);
    navigator.clipboard.writeText(rand).catch(console.error);
    alert("Room code copied to clipboard!");
  };

  const createroom = async () => {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: rname,
        code: room_id,
        hostId: session.user.id,
      }),
    });

    const data = await res.json();

    if (data.success) router.push("/dashboard");
    else alert("Failed to create room: " + data.message);

    setRname("");
    setRoom_id("");
  };

  // Page-specific transition
  const roomVariants = {
    initial: { opacity: 0, y: 10, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.97 },
  };

  return (
    <PageTransition
      pathname={pathname}
      variants={roomVariants}
      transition={{ duration: 0.42, ease: "easeInOut" }}
      bgColor="rgb(49, 26, 27)" // ✅ red-themed transition background
    >
      <div className={styles.container}>
        <div className={styles.title}>Create a Room</div>

        <div className={styles.code}>
          Room Name
          <input
            type="text"
            placeholder="Enter room name"
            value={rname}
            onChange={(e) => setRname(e.target.value)}
          />
        </div>

        <div className={styles.generate}>
          <div className={styles.text}>Room Code</div>
          <button onClick={generate}>Generate</button>
        </div>

        <div className={styles.buttons}>
          <button onClick={createroom}>Create a Room</button>
        </div>
      </div>
    </PageTransition>
  );
}
