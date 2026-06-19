"use client";

import React, { useState } from "react";
import { cefrQuestions } from "@/lib/data/cefrQuestions";

interface LevelTestScreenProps {
  userId: string;
  onTestComplete: (updatedUser: any) => void;
}

export default function LevelTestScreen({ userId, onTestComplete }: LevelTestScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedOption: number }[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ cefrLevel: string; report: string; score: number } | null>(null);

  const activeQuestion = cefrQuestions[currentIdx];

  const handleSelectOption = async (optionIdx: number) => {
    const newAnswers = [
      ...answers,
      { questionId: activeQuestion.id, selectedOption: optionIdx },
    ];
    setAnswers(newAnswers);

    if (currentIdx < cefrQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Fim do teste, envia os resultados para a API
      setFinished(true);
      setLoading(true);
      try {
        const response = await fetch("/api/level-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, answers: newAnswers }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao avaliar teste");
        }

        setResult({
          cefrLevel: data.cefrLevel,
          report: data.report,
          score: data.score,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (finished) {
    return (
      <div style={styles.container}>
        <div className="glass-panel" style={styles.card}>
          {loading ? (
            <div style={styles.loadingSection}>
              <div className="voice-pulse" style={styles.spinner}>🧠</div>
              <h2 style={styles.loadingTitle}>Analisando suas respostas...</h2>
              <p style={styles.loadingText}>O motor de IA está medindo suas competências em gramática, vocabulário e interpretação baseando-se no padrão CEFR.</p>
            </div>
          ) : (
            <div style={styles.resultSection}>
              <span style={styles.trophy}>🏆</span>
              <h2 style={styles.resultTitle}>Seu nível é {result?.cefrLevel}</h2>
              <div style={styles.scoreBadge}>
                Você acertou {result?.score} de {cefrQuestions.length} questões!
              </div>

              <div style={styles.reportBox}>
                <p style={styles.reportText}>{result?.report}</p>
              </div>

              <p style={styles.congratsText}>
                Parabéns por concluir o teste! Você ganhou <strong>+150 pontos</strong> de bônus de boas-vindas. Seu tutor de inglês já se adaptou ao seu nível.
              </p>

              <button
                className="btn btn-primary"
                style={styles.continueBtn}
                onClick={() => onTestComplete(result)}
              >
                Ir para o Painel do Aluno
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const progressPercent = ((currentIdx) / cefrQuestions.length) * 100;

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <span style={styles.testBadge}>Teste de Nivelamento CEFR</span>
          <span style={styles.progressCounter}>
            Questão {currentIdx + 1} de {cefrQuestions.length}
          </span>
        </div>

        {/* Barra de Progresso */}
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }}></div>
        </div>

        <div style={styles.questionSection}>
          <span style={styles.categoryBadge}>{activeQuestion.category.toUpperCase()}</span>
          <h3 style={styles.questionText}>{activeQuestion.question}</h3>
        </div>

        <div style={styles.optionsList}>
          {activeQuestion.options.map((option, idx) => (
            <button
              key={idx}
              className="btn btn-glass"
              style={styles.optionBtn}
              onClick={() => handleSelectOption(idx)}
            >
              <span style={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
              <span style={styles.optionText}>{option}</span>
            </button>
          ))}
        </div>
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
    maxWidth: "600px",
    width: "100%",
    padding: "35px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  testBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#06b6d4",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  progressCounter: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    fontWeight: 600,
  },
  progressBarBg: {
    background: "rgba(255, 255, 255, 0.05)",
    height: "6px",
    borderRadius: "3px",
    width: "100%",
    marginBottom: "30px",
    overflow: "hidden",
  },
  progressBarFill: {
    background: "linear-gradient(90deg, #9333ea 0%, #06b6d4 100%)",
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.3s ease",
  },
  questionSection: {
    marginBottom: "30px",
  },
  categoryBadge: {
    background: "rgba(147, 51, 234, 0.15)",
    color: "#a855f7",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "0.7rem",
    fontWeight: 700,
    display: "inline-block",
    marginBottom: "12px",
  },
  questionText: {
    fontSize: "1.25rem",
    color: "var(--text-primary)",
    lineHeight: "1.5",
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  optionBtn: {
    textAlign: "left",
    padding: "16px 20px",
    borderRadius: "12px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    justifyContent: "flex-start",
  },
  optionLetter: {
    background: "rgba(255, 255, 255, 0.08)",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.9rem",
    color: "#9333ea",
  },
  optionText: {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "#e5e7eb",
  },
  loadingSection: {
    textAlign: "center",
    padding: "40px 0",
  },
  spinner: {
    fontSize: "3.5rem",
    display: "inline-block",
    width: "80px",
    height: "80px",
    lineHeight: "80px",
    borderRadius: "50%",
    background: "rgba(147, 51, 234, 0.1)",
    marginBottom: "20px",
  },
  loadingTitle: {
    fontSize: "1.4rem",
    color: "var(--text-primary)",
    marginBottom: "8px",
  },
  loadingText: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    lineHeight: "1.6",
  },
  resultSection: {
    textAlign: "center",
  },
  trophy: {
    fontSize: "3.5rem",
    display: "block",
    marginBottom: "15px",
  },
  resultTitle: {
    fontSize: "1.8rem",
    color: "var(--text-primary)",
    marginBottom: "8px",
  },
  scoreBadge: {
    display: "inline-block",
    background: "rgba(6, 182, 212, 0.15)",
    border: "1px solid rgba(6, 182, 212, 0.3)",
    color: "#22d3ee",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "0.9rem",
    fontWeight: 700,
    marginBottom: "20px",
  },
  reportBox: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "left",
    marginBottom: "20px",
  },
  reportText: {
    fontSize: "0.95rem",
    color: "#d1d5db",
    lineHeight: "1.6",
  },
  congratsText: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginBottom: "30px",
  },
  continueBtn: {
    width: "100%",
    padding: "14px",
    fontSize: "1rem",
  },
};
