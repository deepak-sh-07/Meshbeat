"use client";
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill all the fields");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Sign in without automatic redirect
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        alert("Invalid credentials!");
        setLoading(false);
        return;
      }

      // 2️⃣ Wait a bit for the session to update
      const session = await getSession();

      if (!session?.user?.id) {
        alert("Could not get user session. Try refreshing.");
        setLoading(false);
        return;
      }

      // 3️⃣ Redirect manually
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sub}>
        <div className={styles.title}>Log In To Your Account</div>

        <div className={styles.inputs}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className={styles.signup}>
          <button onClick={handleLogin} disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </div>

        <div className={styles.last}>
          Don't have an account?
          <div className={styles.login}>
            <Link href="/register">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
