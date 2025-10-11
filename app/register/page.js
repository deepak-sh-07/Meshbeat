"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SignupPage.module.css";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpassword, setCpassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();

  const handleadd = async () => {
    setError("");
    setSuccess("");

    if (!name || !email || !password || !cpassword) {
      setError("⚠️ Please fill all the fields");
      return;
    }

    if (password !== cpassword) {
      setError("⚠️ Password and Confirm Password do not match");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("✅ Account created successfully! Redirecting...");
        setName("");
        setEmail("");
        setPassword("");
        setCpassword("");

        // Smooth redirect using router.push
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("🚨 Server error. Please try again later.");
      console.error(err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sub}>
        <div className={styles.title}>Create Account</div>
        <div className={styles.desc}>Let's get you started</div>

        {/* Error / Success messages */}
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.inputs}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
          <input
            type="password"
            placeholder="Confirm Password"
            value={cpassword}
            onChange={(e) => setCpassword(e.target.value)}
          />
        </div>

        <div className={styles.signup}>
          <button onClick={handleadd}>Sign Up</button>
        </div>

        <div className={styles.last}>
          Already have an account?
          <div
            className={styles.login}
            onClick={() => router.push("/login")}
            style={{ cursor: "pointer" }}
          >
            Sign In
          </div>
        </div>
      </div>
    </div>
  );
}
