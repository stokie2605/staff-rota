import React, { useState } from "react";
import { useRota } from "../context/RotaContext";

export function LoginPage() {
  const { login } = useRota();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleDemoLogin = (role, name) => {
    login({ role, name });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate standard login for demonstration purposes
    alert(`${isRegistering ? "Registration" : "Login"} attempted for ${email}. Please use Demo Shortcuts below.`);
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "var(--surface-2)",
      padding: "20px"
    }}>
      <div className="panel" style={{
        width: "100%",
        maxWidth: "450px",
        padding: "40px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "var(--primary)",
            color: "white",
            fontSize: "24px",
            marginBottom: "16px",
            fontWeight: "bold"
          }}>
            ✦
          </div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "1.75rem", color: "var(--text)" }}>RotaCare</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {isRegistering ? "Create your workspace account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
          <div className="form-group">
            <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text)" }}>Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", width: "100%", background: "var(--surface)" }}
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text)" }}>Password</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", width: "100%", background: "var(--surface)" }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: "14px", fontSize: "1rem", borderRadius: "8px", marginTop: "8px" }}
          >
            {isRegistering ? "Register Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          {isRegistering ? "Already have an account? " : "Don't have an account? "}
          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--primary)", 
              fontWeight: "600", 
              cursor: "pointer", 
              padding: 0,
              fontSize: "0.9rem"
            }}
          >
            {isRegistering ? "Back to Login" : "Register here"}
          </button>
        </div>

        <hr style={{ margin: "32px 0", border: "none", borderTop: "1px solid var(--border)" }} />

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>
            Demo Shortcuts
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" }}>
            <button 
              type="button"
              className="btn btn-outline"
              style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              onClick={() => handleDemoLogin("admin", "Practice Manager")}
            >
              Practice Manager
            </button>
            <button 
              type="button"
              className="btn btn-outline"
              style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              onClick={() => handleDemoLogin("staff", "Dr. Sarah Jenkins")}
            >
              Dr. Sarah Jenkins
            </button>
            <button 
              type="button"
              className="btn btn-outline"
              style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              onClick={() => handleDemoLogin("staff", "Nurse Chloe Evans")}
            >
              Nurse Chloe Evans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
