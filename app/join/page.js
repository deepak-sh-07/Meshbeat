"use client";

import styles from "./join.module.css";
import { useState } from "react";
import { getSession } from "next-auth/react";

export default function Join() {
  const [rcode, setRcode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!rcode) {
      alert("Please enter a room code");
      return;
    }

    setLoading(true);

    try {
      // Get logged-in user
      const session = await getSession();
      if (!session?.user?.id) {
        alert("You must be logged in to join a room");
        setLoading(false);
        return;
      }

      // Call API with query params
      const res = await fetch(
        `/api/rooms?rcode=${rcode}&user_id=${session.user.id}`,
        { method: "GET" }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to join room");
      } else {
        alert(`Joined room: ${data.room.name}`);
        window.location.href = `/virtual/${rcode}`;
      }
    } catch (err) {
      console.error("Join error:", err);
      alert("An error occurred while joining");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.title}>Join a Room</div>

      <div className={styles.circle}></div>

      <div className={styles.t2}>Enter the room code</div>

      <div className={styles.des}>
        Join your friends and listen to music together in
      </div>
      <div className={styles.des1}>perfect sync.</div>

      <div className={styles.input}>
        <input
          type="text"
          placeholder="E. G. 123456"
          value={rcode}
          onChange={(e) => setRcode(e.target.value)}
        />
        <button onClick={handleJoin} disabled={loading}>
          {loading ? "Joining..." : "Join Room"}
        </button>
      </div>
    </div>
  );
}
