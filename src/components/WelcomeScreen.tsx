"use client";

import React, { useState } from "react";

interface WelcomeScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function WelcomeScreen({ onLoginSuccess }: WelcomeScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao fazer login");
      }

      // Salva no localStorage para persistência local rápida
      localStorage.setItem("tutor_user_id", data.id);
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel welcome-card" style={styles.card}>
        <div style={styles.logoSection}>
          <span style={styles.emoji}>🔮</span>
          <h1 style={styles.title}>Tutor de Inglês com IA</h1>
          <p style={styles.subtitle}>Inspirado no EasySpeak AI</p>
        </div>

        <p style={styles.description}>
          Pratique conversação com tutores de inteligência artificial em sotaques nativos, 
          receba feedbacks gramaticais em tempo real e evolua com o método adaptativo de repetição espaçada.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Como podemos te chamar?</label>
            <input
              type="text"
              placeholder="Digite seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Qual seu melhor e-mail?</label>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            className={`btn btn-primary ${loading ? "btn-disabled" : ""}`}
            style={styles.button}
            disabled={loading}
          >
            {loading ? "Iniciando tutor..." : "Começar a Aprender"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "20px",
  },
  card: {
    maxWidth: "480px",
    width: "100%",
    padding: "40px 30px",
    textAlign: "center",
  },
  logoSection: {
    marginBottom: "24px",
  },
  emoji: {
    fontSize: "3rem",
    display: "block",
    marginBottom: "10px",
  },
  title: {
    fontSize: "1.8rem",
    color: "var(--text-primary)",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "#06b6d4",
    textTransform: "uppercase",
    letterSpacing: "2px",
    fontWeight: 700,
  },
  description: {
    fontSize: "0.95rem",
    color: "#9ca3af",
    marginBottom: "30px",
    lineHeight: "1.5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    textAlign: "left",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#d1d5db",
  },
  input: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "14px 16px",
    borderRadius: "10px",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.3s ease",
  },
  error: {
    color: "#f87171",
    fontSize: "0.85rem",
    background: "rgba(248, 113, 113, 0.1)",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(248, 113, 113, 0.2)",
  },
  button: {
    width: "100%",
    marginTop: "10px",
    padding: "14px",
    fontSize: "1rem",
  },
};
