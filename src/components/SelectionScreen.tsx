"use client";

import React, { useState } from "react";
import { tutorProfiles } from "@/lib/data/tutors";

interface SelectionScreenProps {
  user: any;
  onStartChat: (tutorId: string, scenario: string, accent: string) => void;
  onStartLive: (tutorId: string, scenario: string) => void;
  onNavigateToDashboard: () => void;
  onNavigateToFlashcards: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

const themeOptions = [
  { id: "midnight", name: "Midnight Glass", icon: "🌌", desc: "Escuro, profissional e elegante." },
  { id: "sunset", name: "Sunset Vibes", icon: "🌅", desc: "Quente, alegre e cinematográfico." },
  { id: "neon", name: "Neon Cyber City", icon: "🌃", desc: "Futurista, vibrante e moderno." },
  { id: "ethereal", name: "Ethereal Light", icon: "☁️", desc: "Claro, suave e acolhedor." },
];

const scenarios = [
  {
    id: "casual",
    name: "Conversa Casual",
    emoji: "☕",
    description: "Fale livremente sobre o seu dia, hobbies, viagens e cotidiano com o tutor.",
  },
  {
    id: "hotel",
    name: "Check-in no Hotel",
    emoji: "🛎️",
    description: "Simule a chegada na recepção de um hotel, solicite serviços e faça perguntas.",
  },
  {
    id: "interview",
    name: "Entrevista de Emprego",
    emoji: "💼",
    description: "Pratique respostas profissionais, descreva suas habilidades e responda a perguntas difíceis.",
  },
  {
    id: "airport",
    name: "Controle do Aeroporto",
    emoji: "✈️",
    description: "Encare as perguntas clássicas da imigração e segurança do aeroporto de forma confiante.",
  },
];

export default function SelectionScreen({
  user,
  onStartChat,
  onStartLive,
  onNavigateToDashboard,
  onNavigateToFlashcards,
  theme,
  onThemeChange,
}: SelectionScreenProps) {
  const [selectedTutor, setSelectedTutor] = useState(tutorProfiles[0].id);
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0].id);
  const [selectedAccent, setSelectedAccent] = useState(tutorProfiles[0].accent);
  const [showPreferences, setShowPreferences] = useState(false);

  const activeTutorObj = tutorProfiles.find((t) => t.id === selectedTutor)!;

  const handleTutorSelect = (tutorId: string, tutorAccent: string) => {
    setSelectedTutor(tutorId);
    setSelectedAccent(tutorAccent as "American" | "British" | "Australian");
  };

  const handleStart = () => {
    onStartChat(selectedTutor, selectedScenario, selectedAccent);
  };

  return (
    <div style={styles.container}>
      {/* Menu Superior Premium */}
      <div className="glass-panel" style={styles.navBar}>
        <div style={styles.navLogo}>
          <span style={styles.navEmoji}>🔮</span>
          <div>
            <h2 style={styles.navTitle}>Tutor de Inglês IA</h2>
            <span style={styles.navLevelBadge}>CEFR: {user?.cefrLevel}</span>
          </div>
        </div>
        <div style={styles.navStats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Pontos:</span>
            <span style={styles.statValue}>🔥 {user?.points} XP</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Streak:</span>
            <span style={styles.statValue}>⚡ {user?.streakDays} dias</span>
          </div>
        </div>
        <div style={styles.navMenu}>
          <button className="btn btn-glass" style={styles.navBtn} onClick={onNavigateToDashboard}>
            📈 Dashboard
          </button>
          <button className="btn btn-glass" style={styles.navBtn} onClick={onNavigateToFlashcards}>
            📇 Flashcards
          </button>
        </div>
      </div>

      <div style={styles.contentLayout}>
        {/* Lado Esquerdo: Tutores de IA */}
        <div style={styles.leftCol}>
          <h2 style={styles.sectionTitle}>1. Escolha seu Professor Virtual</h2>
          <div style={styles.tutorList}>
            {tutorProfiles.map((tutor) => {
              const isSelected = selectedTutor === tutor.id;
              return (
                <div
                  key={tutor.id}
                  className={isSelected ? "glass-panel-active" : "glass-panel"}
                  style={{
                    ...styles.tutorCard,
                    borderColor: isSelected ? "var(--color-primary)" : "var(--border-glass)",
                  }}
                  onClick={() => handleTutorSelect(tutor.id, tutor.accent)}
                >
                  <div style={styles.tutorAvatarSection}>
                    <span style={styles.tutorAvatar}>
                      {tutor.imageUrl ? (
                        <img 
                          src={tutor.imageUrl} 
                          alt={tutor.name} 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      ) : (
                        tutor.avatar
                      )}
                    </span>
                    <div>
                      <h4 style={styles.tutorName}>{tutor.name}</h4>
                      <span style={styles.tutorRole}>{tutor.role}</span>
                    </div>
                  </div>
                  <div style={styles.accentBadge}>Padrão: {tutor.accent}</div>
                  <p style={styles.tutorBio}>{tutor.bio}</p>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "20px" }}>
            <h3 style={{ fontSize: "1rem", color: "#e5e7eb", marginBottom: "10px" }}>Personalizar Sotaque:</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              {["American", "British", "Australian"].map((acc) => (
                <button
                  key={acc}
                  className={`btn ${selectedAccent === acc ? "btn-primary" : "btn-glass"}`}
                  style={{ flex: 1, padding: "8px", fontSize: "0.9rem" }}
                  onClick={() => setSelectedAccent(acc)}
                >
                  {acc === "American" && "🇺🇸 "}
                  {acc === "British" && "🇬🇧 "}
                  {acc === "Australian" && "🇦🇺 "}
                  {acc}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lado Direito: Cenários */}
        <div style={styles.rightCol}>
          <h2 style={styles.sectionTitle}>2. Escolha o Cenário da Prática</h2>
          <div style={styles.scenarioGrid}>
            {scenarios.map((scen) => {
              const isSelected = selectedScenario === scen.id;
              return (
                <div
                  key={scen.id}
                  className={isSelected ? "glass-panel-active" : "glass-panel"}
                  style={{
                    ...styles.scenarioCard,
                    borderColor: isSelected ? "var(--color-secondary)" : "var(--border-glass)",
                  }}
                  onClick={() => setSelectedScenario(scen.id)}
                >
                  <span style={styles.scenarioEmoji}>{scen.emoji}</span>
                  <h4 style={styles.scenarioName}>{scen.name}</h4>
                  <p style={styles.scenarioDesc}>{scen.description}</p>
                </div>
              );
            })}
          </div>

          {/* Chamada para Ação */}
          <div className="glass-panel" style={styles.actionCard}>
            <div style={styles.actionDetails}>
              <h4>Você vai falar com: <strong style={{ color: "var(--color-primary-light)" }}>{activeTutorObj.name}</strong></h4>
              <p>No cenário de: <strong style={{ color: "var(--color-secondary-light)" }}>
                {scenarios.find((s) => s.id === selectedScenario)?.name}
              </strong></p>
            </div>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button className="btn btn-secondary" style={{ ...styles.startBtn, flex: 1 }} onClick={handleStart}>
                💬 Chat Texto & Áudio
              </button>
              <button 
                className="btn btn-primary" 
                style={{ ...styles.startBtn, flex: 1, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }} 
                onClick={() => onStartLive(selectedTutor, selectedScenario)}
              >
                🎙️ Chamada Ao Vivo
              </button>
            </div>
          </div>

          <button 
            className="btn btn-glass" 
            style={{ width: "100%", padding: "12px", marginTop: "10px", fontSize: "0.95rem" }}
            onClick={() => setShowPreferences(true)}
          >
            ⚙️ Preferências de Tema
          </button>
        </div>
      </div>

      {/* MODAL DE PREFERÊNCIAS */}
      {showPreferences && (
        <div style={styles.modalOverlay} onClick={() => setShowPreferences(false)}>
          <div className="glass-panel" style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: "1.3rem", color: "var(--text-primary)" }}>🎨 Escolha o Seu Tema</h3>
              <button style={styles.closeBtn} onClick={() => setShowPreferences(false)}>✖</button>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "0.95rem" }}>
              Personalize a aparência do seu tutor com nossos temas cinematográficos premium.
            </p>
            
            <div style={styles.themesGrid}>
              {themeOptions.map((opt) => (
                <div 
                  key={opt.id} 
                  className={theme === opt.id ? "glass-panel-active" : "glass-panel"}
                  style={{ ...styles.themeCard, borderColor: theme === opt.id ? "var(--color-primary)" : "var(--border-glass)" }}
                  onClick={() => onThemeChange(opt.id)}
                >
                  <span style={styles.themeEmoji}>{opt.icon}</span>
                  <h4 style={styles.themeName}>{opt.name}</h4>
                  <p style={styles.themeDesc}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "30px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "30px",
  },
  navBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 25px",
    borderRadius: "16px",
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  navEmoji: {
    fontSize: "2rem",
  },
  navTitle: {
    fontSize: "1.1rem",
    color: "var(--text-primary)",
    margin: 0,
  },
  navLevelBadge: {
    fontSize: "0.75rem",
    color: "#a855f7",
    fontWeight: 700,
    background: "rgba(147, 51, 234, 0.15)",
    padding: "2px 8px",
    borderRadius: "20px",
  },
  navStats: {
    display: "flex",
    gap: "20px",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.85rem",
  },
  statLabel: {
    color: "#9ca3af",
  },
  statValue: {
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  navMenu: {
    display: "flex",
    gap: "10px",
  },
  navBtn: {
    padding: "8px 16px",
    fontSize: "0.85rem",
    borderRadius: "8px",
  },
  contentLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    color: "#e5e7eb",
    fontWeight: 700,
  },
  tutorList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  tutorCard: {
    padding: "20px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  tutorAvatarSection: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  tutorAvatar: {
    fontSize: "2.2rem",
    background: "rgba(255, 255, 255, 0.05)",
    width: "55px",
    height: "55px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tutorName: {
    fontSize: "1.05rem",
    color: "var(--text-primary)",
    margin: 0,
  },
  tutorRole: {
    fontSize: "0.8rem",
    color: "#9ca3af",
  },
  accentBadge: {
    fontSize: "0.75rem",
    color: "#a855f7",
    fontWeight: 700,
    background: "rgba(147, 51, 234, 0.1)",
    padding: "3px 8px",
    borderRadius: "4px",
    width: "fit-content",
  },
  tutorBio: {
    fontSize: "0.85rem",
    color: "#d1d5db",
    lineHeight: "1.5",
  },
  scenarioGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  scenarioCard: {
    padding: "20px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    height: "100%",
  },
  scenarioEmoji: {
    fontSize: "2rem",
    marginBottom: "5px",
  },
  scenarioName: {
    fontSize: "1rem",
    color: "var(--text-primary)",
    margin: 0,
  },
  scenarioDesc: {
    fontSize: "0.8rem",
    color: "#9ca3af",
    lineHeight: "1.4",
  },
  actionCard: {
    padding: "20px 25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
  },
  actionDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "0.9rem",
  },
  startBtn: {
    padding: "14px 28px",
    fontSize: "1rem",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalContent: {
    width: "90%",
    maxWidth: "600px",
    padding: "30px",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  themesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  themeCard: {
    padding: "20px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "8px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  themeEmoji: {
    fontSize: "2.5rem",
  },
  themeName: {
    color: "var(--text-primary)",
    fontSize: "1.05rem",
    margin: 0,
  },
  themeDesc: {
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    lineHeight: "1.4",
  },
};
