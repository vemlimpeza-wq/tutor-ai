"use client";

import React, { useState, useEffect } from "react";

interface DashboardScreenProps {
  user: any;
  onExit: () => void;
}

interface DashboardData {
  user: {
    id: string;
    name: string;
    cefrLevel: string;
    points: number;
    streakDays: number;
  };
  flashcards: {
    total: number;
    pending: number;
  };
  skills: {
    speaking: number;
    writing: number;
    grammar: number;
    vocabulary: number;
  };
  topErrors: { name: string; count: number }[];
  weeklyActivity: { date: string; xp: number }[];
}

export default function DashboardScreen({ user, onExit }: DashboardScreenProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?userId=${user.id}`);
      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Calcula a estimativa para o próximo nível CEFR
  const getNextLevelInfo = (currentLevel: string, points: number) => {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const currentIdx = levels.indexOf(currentLevel);
    
    if (currentIdx === -1 || currentIdx === levels.length - 1) {
      return { nextLevel: "C2", progress: 100, pointsNeeded: 0, timeEst: "Nível Máximo alcançado!" };
    }

    const nextLevel = levels[currentIdx + 1];
    
    // Pontuações fictícias exigidas para subir de nível CEFR
    const levelRequirements = {
      A2: 300,
      B1: 600,
      B2: 1200,
      C1: 2500,
      C2: 5000,
    };

    const targetPoints = levelRequirements[nextLevel as keyof typeof levelRequirements] || 1000;
    const pointsNeeded = Math.max(0, targetPoints - points);
    
    // Calcula progresso atual
    const prevTarget = currentIdx > 0 ? levelRequirements[levels[currentIdx] as keyof typeof levelRequirements] : 0;
    const range = targetPoints - prevTarget;
    const currentProgress = points - prevTarget;
    const progress = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)));

    // Estimativa de tempo baseada em 30 XP por dia
    const daysNeeded = Math.ceil(pointsNeeded / 30);
    const monthsNeeded = (daysNeeded / 30).toFixed(1);
    
    return {
      nextLevel,
      progress,
      pointsNeeded,
      timeEst: pointsNeeded > 0 ? `Aprox. ${monthsNeeded} meses (no seu ritmo atual de estudo)` : "Pronto para subir de nível!",
    };
  };

  const nextLevelInfo = data ? getNextLevelInfo(data.user.cefrLevel, data.user.points) : null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div className="glass-panel" style={styles.header}>
        <button className="btn btn-glass" style={styles.backBtn} onClick={onExit}>
          ⬅ Voltar ao Seletor
        </button>
        <h3 style={styles.headerTitle}>📈 Painel de Progresso Adaptativo</h3>
        <button className="btn btn-glass" style={styles.refreshBtn} onClick={fetchDashboardData}>
          🔄 Atualizar
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <p>Compilando suas estatísticas pedagógicas...</p>
        </div>
      ) : data ? (
        <div style={styles.dashboardGrid}>
          {/* Cartão de Usuário & Streaks */}
          <div className="glass-panel" style={styles.userCard}>
            <div style={styles.userInfoFlex}>
              <span style={styles.avatar}>🎓</span>
              <div>
                <h2 style={styles.userName}>{data.user.name}</h2>
                <span style={styles.levelBadge}>Nível CEFR: {data.user.cefrLevel}</span>
              </div>
            </div>
            <div style={styles.metricsRow}>
              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>🔥 Total de XP</span>
                <span style={styles.metricVal}>{data.user.points} XP</span>
              </div>
              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>⚡ Dias de Streak</span>
                <span style={styles.metricVal}>{data.user.streakDays} dias</span>
              </div>
              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>📇 Flashcards Ativos</span>
                <span style={styles.metricVal}>{data.flashcards.total} cards</span>
              </div>
            </div>
          </div>

          {/* Projeção do Próximo Nível */}
          {nextLevelInfo && (
            <div className="glass-panel" style={styles.projectionCard}>
              <h4 style={styles.cardTitle}>🎯 Rota para o Nível {nextLevelInfo.nextLevel}</h4>
              <div style={styles.progressRow}>
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${nextLevelInfo.progress}%` }}></div>
                </div>
                <span style={styles.progressPercentText}>{nextLevelInfo.progress}%</span>
              </div>
              <div style={styles.projectionDetails}>
                <p>Faltam <strong>{nextLevelInfo.pointsNeeded} XP</strong> para alcançar o nível {nextLevelInfo.nextLevel}.</p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px" }}>
                  ⏳ Tempo Estimado: {nextLevelInfo.timeEst}
                </p>
              </div>
            </div>
          )}

          {/* Gráfico de Habilidades (Speaking, Writing, Grammar, Vocabulary) */}
          <div className="glass-panel" style={styles.skillsCard}>
            <h4 style={styles.cardTitle}>📊 Competência por Habilidade (%)</h4>
            <div style={styles.skillsFlex}>
              {Object.entries(data.skills).map(([skill, val]) => (
                <div key={skill} style={styles.skillBarItem}>
                  <div style={styles.skillLabelRow}>
                    <span style={styles.skillLabel}>
                      {skill === "speaking" ? "🎙️ Speaking" : skill === "writing" ? "✍️ Writing" : skill === "grammar" ? "📚 Grammar" : "📇 Vocabulary"}
                    </span>
                    <span style={styles.skillVal}>{val}%</span>
                  </div>
                  <div style={styles.skillBarBg}>
                    <div
                      style={{
                        ...styles.skillBarFill,
                        width: `${val || 10}%`,
                        background: skill === "speaking" ? "var(--color-secondary)" : skill === "writing" ? "var(--color-primary-light)" : "#10b981",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Perfil Adaptativo - Erros Frequentes */}
          <div className="glass-panel" style={styles.errorsCard}>
            <h4 style={styles.cardTitle}>⚠️ Foco de Estudos (Erros Recorrentes)</h4>
            {data.topErrors.length === 0 ? (
              <p style={styles.emptyText}>Excelente trabalho! Você não cometeu erros recorrentes recentes no chat de conversação.</p>
            ) : (
              <div style={styles.errorsList}>
                {data.topErrors.map((err, idx) => (
                  <div key={idx} style={styles.errorItem}>
                    <span style={styles.errorNum}>#{idx + 1}</span>
                    <div style={styles.errorInfo}>
                      <span style={styles.errorName}>{err.name}</span>
                      <span style={styles.errorCount}>Cometido {err.count} {err.count === 1 ? "vez" : "vezes"}</span>
                    </div>
                  </div>
                ))}
                <p style={styles.adaptiveAdvice}>
                  💡 <strong>Dica Adaptativa:</strong> Nosso sistema está priorizando exercícios de conversação e gerando flashcards contendo essas estruturas gramaticais para você fixar melhor nas próximas sessões.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.loadingState}>
          <p>Sem estatísticas registradas. Pratique para ver sua evolução!</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "30px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 25px",
  },
  backBtn: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    borderRadius: "8px",
  },
  headerTitle: {
    fontSize: "1.1rem",
    color: "var(--text-primary)",
    margin: 0,
  },
  refreshBtn: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    borderRadius: "8px",
  },
  loadingState: {
    textAlign: "center",
    padding: "50px",
    color: "#9ca3af",
  },
  dashboardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  userCard: {
    padding: "25px",
  },
  userInfoFlex: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: "18px",
    marginBottom: "18px",
  },
  avatar: {
    fontSize: "2.5rem",
    background: "rgba(255,255,255,0.03)",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: "1.3rem",
    color: "var(--text-primary)",
    margin: 0,
  },
  levelBadge: {
    fontSize: "0.8rem",
    color: "#a855f7",
    fontWeight: 700,
    background: "rgba(147, 51, 234, 0.15)",
    padding: "2px 8px",
    borderRadius: "20px",
  },
  metricsRow: {
    display: "flex",
    justifyContent: "space-between",
  },
  metricItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metricLabel: {
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
  metricVal: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  projectionCard: {
    padding: "20px 25px",
  },
  cardTitle: {
    fontSize: "1.05rem",
    color: "var(--text-primary)",
    marginBottom: "16px",
    fontWeight: 700,
  },
  progressRow: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "12px",
  },
  progressBarBg: {
    background: "rgba(255,255,255,0.05)",
    height: "10px",
    borderRadius: "5px",
    flex: 1,
    overflow: "hidden",
  },
  progressBarFill: {
    background: "linear-gradient(90deg, #9333ea 0%, #06b6d4 100%)",
    height: "100%",
    borderRadius: "5px",
  },
  progressPercentText: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  projectionDetails: {
    fontSize: "0.85rem",
    color: "#e5e7eb",
  },
  skillsCard: {
    padding: "25px",
  },
  skillsFlex: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  skillBarItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  skillLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
  },
  skillLabel: {
    color: "#d1d5db",
    fontWeight: 600,
  },
  skillVal: {
    color: "var(--text-primary)",
    fontWeight: 700,
  },
  skillBarBg: {
    background: "rgba(255,255,255,0.05)",
    height: "8px",
    borderRadius: "4px",
    overflow: "hidden",
  },
  skillBarFill: {
    height: "100%",
    borderRadius: "4px",
  },
  errorsCard: {
    padding: "25px",
  },
  emptyText: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    lineHeight: "1.5",
  },
  errorsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  errorItem: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "rgba(239, 68, 68, 0.05)",
    border: "1px solid rgba(239, 68, 68, 0.15)",
    padding: "12px 16px",
    borderRadius: "10px",
  },
  errorNum: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#ef4444",
  },
  errorInfo: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    fontSize: "0.9rem",
  },
  errorName: {
    fontWeight: 600,
    color: "#fca5a5",
  },
  errorCount: {
    color: "#9ca3af",
    fontSize: "0.8rem",
  },
  adaptiveAdvice: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    background: "rgba(255,255,255,0.02)",
    padding: "10px 14px",
    borderRadius: "8px",
    marginTop: "10px",
    lineHeight: "1.4",
  },
};
