"use client";

import { useState ,useEffect} from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; // ✅ import router
import styles from "./room.module.css";

export default function Room() {
  const [rname, setRname] = useState("");
  const [room_id, setRoom_id] = useState("");
  const router = useRouter(); // ✅ initialize router
  const { data: session, status } = useSession();
  
    // While checking the session, you might want to show a loader
   useEffect(() => {
    if (status === "loading") return; // wait until session is checked
    if (!session) {
      router.replace("/login"); // safer than push for redirects
    }
  }, [session, status, router]);

  // Prevent flashing content while session is being checked
  if (status === "loading" || !session) {
    return null;
  }
  const generate = () => {
    const rand = Math.floor(100000 + Math.random() * 900000).toString();
    setRoom_id(rand);
    navigator.clipboard.writeText(rand).catch(console.error);
    alert("code is copied to clipboard");
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

    if (data.success) {
      // ✅ redirect to dashboard
      router.push("/dashboard");
    } else {
      alert("Failed to create room: " + data.message);
    }

    setRname("");
    setRoom_id("");
  };

  return (
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
  );
}
