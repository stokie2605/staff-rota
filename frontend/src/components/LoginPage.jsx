import React from "react";
import { useRota } from "../context/RotaContext";

export function LoginPage() {
  const { login } = useRota();

  const handleLogin = (role, name) => {
    login({ role, name });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--surface-2)" }}>
      <div className="panel" style={{ width: "100%", maxWidth: "400px", padding: "40px", textAlign: "center", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <h1 style={{ marginBottom: "10px", fontSize: "1.8rem", color: "var(--text)" }}>RotaCare</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "30px", fontSize: "0.95rem" }}>
          Secure Portal Access
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button 
            className="btn btn-primary" 
            style={{ padding: "12px", fontSize: "1rem", backgroundColor: "var(--primary)" }}
            onClick={() => handleLogin("admin", "Practice Manager")}
          >
            Log in as Practice Manager
          </button>
          
          <button 
            className="btn btn-outline" 
            style={{ padding: "12px", fontSize: "1rem", backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
            onClick={() => handleLogin("staff", "Dr. Sarah Jenkins")}
          >
            Log in as Practitioner (Dr. Sarah Jenkins)
          </button>
          
          <button 
            className="btn btn-outline" 
            style={{ padding: "12px", fontSize: "1rem", backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
            onClick={() => handleLogin("staff", "Nurse Chloe Evans")}
          >
            Log in as Practitioner (Nurse Chloe Evans)
          </button>
        </div>
        
        <div style={{ marginTop: "30px", fontSize: "0.75rem", color: "var(--text-faint)" }}>
          Demo mock authentication active. In production, this would securely authenticate via OAuth or SAML.
        </div>
      </div>
    </div>
  );
}
