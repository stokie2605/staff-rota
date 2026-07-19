import React from "react";
import { useRota } from "../context/RotaContext";

export function LoginPage() {
  const { login } = useRota();

  const handleLogin = (role, name) => {
    login({ role, name });
  };

  return (
    <>
      <style>
        {`
          .login-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: radial-gradient(circle at top left, #1e1b4b, #0f172a 40%, #020617 100%);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            position: relative;
            overflow: hidden;
          }

          /* Ambient glowing orbs in background */
          .login-container::before {
            content: '';
            position: absolute;
            top: -10%;
            left: -10%;
            width: 50vw;
            height: 50vw;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 60%);
            border-radius: 50%;
            z-index: 0;
            animation: float 15s ease-in-out infinite alternate;
          }

          .login-container::after {
            content: '';
            position: absolute;
            bottom: -20%;
            right: -10%;
            width: 60vw;
            height: 60vw;
            background: radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 60%);
            border-radius: 50%;
            z-index: 0;
            animation: float 20s ease-in-out infinite alternate-reverse;
          }

          @keyframes float {
            0% { transform: translate(0, 0); }
            100% { transform: translate(5%, 5%); }
          }

          .glass-panel {
            position: relative;
            z-index: 10;
            width: 100%;
            maxWidth: 440px;
            padding: 48px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            text-align: center;
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .login-logo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, #6366f1, #3b82f6);
            color: white;
            font-size: 28px;
            margin-bottom: 24px;
            box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
          }

          .login-title {
            margin: 0 0 8px 0;
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.02em;
          }

          .login-subtitle {
            color: #94a3b8;
            margin: 0 0 40px 0;
            font-size: 1rem;
            font-weight: 400;
          }

          .login-btn-group {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .login-btn {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 16px;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            overflow: hidden;
            border: none;
            color: white;
          }

          .login-btn-primary {
            background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
            box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);
          }

          .login-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
            filter: brightness(1.1);
          }

          .login-btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
          }

          .login-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
          }

          .login-footer {
            margin-top: 40px;
            font-size: 0.8rem;
            color: #64748b;
          }
        `}
      </style>

      <div className="login-container">
        <div className="glass-panel">
          <div className="login-logo">✦</div>
          <h1 className="login-title">RotaCare</h1>
          <p className="login-subtitle">Secure Clinical Operating System</p>
          
          <div className="login-btn-group">
            <button 
              className="login-btn login-btn-primary"
              onClick={() => handleLogin("admin", "Practice Manager")}
            >
              Log in as Practice Manager
            </button>
            
            <button 
              className="login-btn login-btn-secondary"
              onClick={() => handleLogin("staff", "Dr. Sarah Jenkins")}
            >
              Practitioner (Dr. Sarah Jenkins)
            </button>
            
            <button 
              className="login-btn login-btn-secondary"
              onClick={() => handleLogin("staff", "Nurse Chloe Evans")}
            >
              Practitioner (Nurse Chloe Evans)
            </button>
          </div>
          
          <div className="login-footer">
            Demo Environment • Secure 256-bit Encryption
          </div>
        </div>
      </div>
    </>
  );
}
