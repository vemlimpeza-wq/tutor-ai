"use client";

import React, { useState, useEffect } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import LevelTestScreen from "@/components/LevelTestScreen";
import SelectionScreen from "@/components/SelectionScreen";
import ChatScreen from "@/components/ChatScreen";
import FlashcardScreen from "@/components/FlashcardScreen";
import DashboardScreen from "@/components/DashboardScreen";
import LiveCallScreen from "@/components/LiveCallScreen";

type ScreenType = "welcome" | "level_test" | "selection" | "chat" | "live_call" | "flashcards" | "dashboard";

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("welcome");
  const [user, setUser] = useState<any | null>(null);
  const [activeTutor, setActiveTutor] = useState<string>("");
  const [activeScenario, setActiveScenario] = useState<string>("");
  const [activeAccent, setActiveAccent] = useState<string>("");
  const [theme, setTheme] = useState<string>("midnight");
  const [loading, setLoading] = useState(true);

  // Aplica o tema ao body quando muda
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.className = `theme-${theme}`;
      localStorage.setItem("tutor_theme", theme);
    }
  }, [theme]);

  // Auto-login e resgate do tema salvo
  useEffect(() => {
    const autoLogin = async () => {
      const savedTheme = localStorage.getItem("tutor_theme");
      if (savedTheme) setTheme(savedTheme);

      const savedUserId = localStorage.getItem("tutor_user_id");
      if (savedUserId) {
        try {
          const response = await fetch(`/api/users?id=${savedUserId}`);
          if (response.ok) {
            const data = await response.json();
            setUser(data);
            setCurrentScreen("selection");
          } else {
            localStorage.removeItem("tutor_user_id");
          }
        } catch (err) {
          console.error("Erro no auto-login:", err);
        }
      }
      setLoading(false);
    };

    autoLogin();
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    // Se for o primeiro acesso (pontos === 100 e nível A1 padrão), encaminha para o teste de nivelamento
    if (loggedInUser.cefrLevel === "A1" && loggedInUser.points === 100) {
      setCurrentScreen("level_test");
    } else {
      setCurrentScreen("selection");
    }
  };

  const handleTestComplete = (testResult: any) => {
    // Atualiza dados locais do usuário com o novo nível obtido
    setUser((prev: any) => ({
      ...prev,
      cefrLevel: testResult.cefrLevel,
      points: prev.points + 150, // Adiciona o bônus
    }));
    setCurrentScreen("selection");
  };

  const handleStartChat = (tutorId: string, scenario: string, accent: string) => {
    setActiveTutor(tutorId);
    setActiveScenario(scenario);
    setActiveAccent(accent);
    setCurrentScreen("chat");
  };

  const handleStartLive = (tutorId: string, scenario: string) => {
    setActiveTutor(tutorId);
    setActiveScenario(scenario);
    setCurrentScreen("live_call");
  };

  const updatePoints = (newPoints: number) => {
    setUser((prev: any) => ({
      ...prev,
      points: newPoints,
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("tutor_user_id");
    setUser(null);
    setCurrentScreen("welcome");
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="voice-pulse" style={styles.spinner}>🔮</div>
        <p style={{ marginTop: "20px", color: "var(--text-secondary)" }}>
          Carregando portal do estudante...
        </p>
      </div>
    );
  }

  return (
    <main style={styles.main}>
      {/* Botão de Sair fixo no topo direito se logado para facilidade de teste */}
      {user && currentScreen !== "welcome" && currentScreen !== "level_test" && (
        <div style={styles.topControl}>
          <span style={styles.userBadge}>Olá, {user.name}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sair da Conta 🚪
          </button>
        </div>
      )}

      {currentScreen === "welcome" && (
        <WelcomeScreen onLoginSuccess={handleLoginSuccess} />
      )}

      {currentScreen === "level_test" && user && (
        <LevelTestScreen userId={user.id} onTestComplete={handleTestComplete} />
      )}

      {currentScreen === "selection" && user && (
        <SelectionScreen
          user={user}
          theme={theme}
          onThemeChange={setTheme}
          onStartChat={handleStartChat}
          onStartLive={handleStartLive}
          onNavigateToDashboard={() => setCurrentScreen("dashboard")}
          onNavigateToFlashcards={() => setCurrentScreen("flashcards")}
        />
      )}

      {currentScreen === "chat" && user && (
        <ChatScreen
          user={user}
          tutorId={activeTutor}
          scenario={activeScenario}
          accent={activeAccent}
          onExit={() => setCurrentScreen("selection")}
          onUpdatePoints={updatePoints}
        />
      )}

      {currentScreen === "live_call" && user && (
        <LiveCallScreen
          user={user}
          tutorId={activeTutor}
          scenario={activeScenario}
          onExit={() => setCurrentScreen("selection")}
        />
      )}

      {currentScreen === "flashcards" && user && (
        <FlashcardScreen
          user={user}
          onExit={() => setCurrentScreen("selection")}
          onUpdatePoints={updatePoints}
        />
      )}

      {currentScreen === "dashboard" && user && (
        <DashboardScreen user={user} onExit={() => setCurrentScreen("selection")} />
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    position: "relative",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  spinner: {
    fontSize: "3rem",
    width: "70px",
    height: "70px",
    lineHeight: "70px",
    borderRadius: "50%",
    background: "rgba(147, 51, 234, 0.1)",
    textAlign: "center",
  },
  topControl: {
    position: "absolute",
    top: "10px",
    right: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    zIndex: 1000,
  },
  userBadge: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
    padding: "4px 10px",
    borderRadius: "8px",
    border: "1px solid var(--border-glass)",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "#f87171",
    fontSize: "0.8rem",
    cursor: "pointer",
    fontWeight: 600,
  },
};
