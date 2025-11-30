"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill all the fields");
      return;
    }

    setLoading(true);

    try {
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

      const session = await getSession();

      if (!session?.user?.id) {
        alert("Could not get user session. Try refreshing.");
        setLoading(false);
        return;
      }

      // Use View Transitions for smooth navigation
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          router.push("/dashboard");
        });
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToRegister = () => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        router.push("/register");
      });
    } else {
      router.push("/register");
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
          <div
            className={styles.login}
            onClick={handleNavigateToRegister}
            style={{ cursor: "pointer", color: "#dee3ebff", fontWeight: "500" }}
          >
            Sign Up
          </div>
        </div>
      </div>
    </div>
  );
}