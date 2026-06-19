"use client";

import React, { useState, useEffect } from "react";

interface Flashcard {
  id: string;
  word: string;
  translation: string;
  definition: string;
  exampleSentence: string;
  boxLevel: number;
  nextReviewDate: string;
}

interface FlashcardScreenProps {
  user: any;
  onExit: () => void;
  onUpdatePoints: (newPoints: number) => void;
}

export default function FlashcardScreen({
  user,
  onExit,
  onUpdatePoints,
}: FlashcardScreenProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Estados do formulário de criação de novo flashcard
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newExample, setNewExample] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const loadFlashcards = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/flashcards?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setFlashcards(data);
      }
    } catch (err) {
      console.error("Erro ao carregar flashcards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, [user]);

  const handleRateCard = async (quality: number) => {
    const card = flashcards[currentIdx];
    setSubmittingRating(true);

    try {
      const response = await fetch("/api/flashcards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcardId: card.id,
          quality,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error("Erro ao classificar");

      // Atualiza pontos do usuário no header
      onUpdatePoints(data.userPoints);

      // Avança na fila
      setShowAnswer(false);
      
      // Remove o card da lista se foi avaliado com boa qualidade (quality >= 3)
      // Ou apenas avança o index se mantivermos todos para fins de demonstração
      if (currentIdx < flashcards.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        // Recarrega flashcards pendentes
        loadFlashcards();
        setCurrentIdx(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord || !newTranslation) {
      setFormError("Palavra e Tradução são obrigatórias.");
      return;
    }

    setFormError("");
    setFormSuccess("");

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          word: newWord,
          translation: newTranslation,
          definition: newDefinition,
          exampleSentence: newExample,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao adicionar");

      setFormSuccess(`Flashcard '${data.word}' criado com sucesso!`);
      setNewWord("");
      setNewTranslation("");
      setNewDefinition("");
      setNewExample("");
      
      // Recarrega a pilha
      loadFlashcards();
    } catch (err: any) {
      setFormError(err.message || "Erro ao conectar com servidor.");
    }
  };

  // Web Speech API do navegador para falar a palavra
  const speakWord = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const activeCard = flashcards[currentIdx];

  return (
    <div className="flashcard-container" style={styles.container}>
      {/* Header */}
      <div className="glass-panel flashcard-header" style={styles.header}>
        <button className="btn btn-glass" style={styles.backBtn} onClick={onExit}>
          ⬅ Voltar ao Seletor
        </button>
        <h3 style={styles.headerTitle}>📇 Flashcards Inteligentes (SM-2)</h3>
        <button
          className="btn btn-secondary"
          style={styles.addBtn}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Estudar Cartões" : "+ Novo Cartão"}
        </button>
      </div>

      {showAddForm ? (
        /* Formulário de Adição */
        <div className="glass-panel" style={styles.formCard}>
          <h4 style={{ marginBottom: "20px", color: "var(--color-secondary-light)" }}>Adicionar Novo Vocabulário</h4>
          <form onSubmit={handleAddFlashcard} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Palavra em Inglês *</label>
              <input
                type="text"
                placeholder="Ex: Breakthrough"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Tradução em Português *</label>
              <input
                type="text"
                placeholder="Ex: Avanço / Descoberta importante"
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Definição Didática (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: A sudden, dramatic, and important discovery or development."
                value={newDefinition}
                onChange={(e) => setNewDefinition(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Frase de Exemplo (Opcional)</label>
              <textarea
                placeholder="Ex: Scientists made a major breakthrough in cancer research."
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                style={styles.textarea}
              />
            </div>

            {formError && <div style={styles.error}>{formError}</div>}
            {formSuccess && <div style={styles.success}>{formSuccess}</div>}

            <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
              Salvar Flashcard 💾
            </button>
          </form>
        </div>
      ) : (
        /* Modo de Estudos */
        <div style={styles.studyArea}>
          {loading ? (
            <div style={styles.loadingState}>
              <p>Carregando seus cartões...</p>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="glass-panel" style={styles.emptyCard}>
              <span style={{ fontSize: "3rem", display: "block", marginBottom: "15px" }}>🎉</span>
              <h4>Tudo Limpo!</h4>
              <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: "10px 0 20px" }}>
                Você não possui flashcards pendentes de revisão hoje. Pratique no chat de conversação com o tutor para que novos flashcards sejam gerados automaticamente com base em suas dificuldades!
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                Criar Meu Primeiro Flashcard
              </button>
            </div>
          ) : (
            <div style={styles.deckContainer}>
              <div style={styles.cardInfo}>
                Cartão {currentIdx + 1} de {flashcards.length} | Nível da Caixa: {activeCard.boxLevel}
              </div>

              {/* Flashcard Físico 3D */}
              <div
                className="glass-panel flashcard-card"
                style={{
                  ...styles.flashcard,
                  borderColor: showAnswer ? "var(--color-primary-light)" : "var(--border-glass)",
                }}
              >
                <div style={styles.cardHeader}>
                  <button
                    className="btn btn-glass"
                    style={styles.audioBtn}
                    onClick={() => speakWord(activeCard.word)}
                    title="Ouvir pronúncia"
                  >
                    🔊 Ouvir
                  </button>
                  <span style={styles.boxBadge}>Caixa {activeCard.boxLevel}</span>
                </div>

                <div style={styles.cardContent}>
                  <h2 style={styles.cardWord}>{activeCard.word}</h2>

                  {showAnswer ? (
                    <div style={styles.answerSection}>
                      <h4 style={styles.cardTranslation}>👉 {activeCard.translation}</h4>
                      {activeCard.definition && (
                        <p style={styles.cardDef}><strong>Definição:</strong> {activeCard.definition}</p>
                      )}
                      {activeCard.exampleSentence && (
                        <p style={styles.cardEx}><strong>Exemplo:</strong> <em>"{activeCard.exampleSentence}"</em></p>
                      )}
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={styles.revealBtn}
                      onClick={() => setShowAnswer(true)}
                    >
                      Revelar Tradução 👀
                    </button>
                  )}
                </div>
              </div>

              {/* Botões de Feedback SM-2 */}
              {showAnswer && (
                <div className="glass-panel animate-fadeIn" style={styles.feedbackPanel}>
                  <p style={styles.feedbackIntro}>O quão fácil foi lembrar desta palavra?</p>
                  <div className="flashcard-rating-grid" style={styles.ratingGrid}>
                    <button
                      className="btn btn-glass"
                      style={{ ...styles.ratingBtn, background: "rgba(239, 68, 68, 0.1)" }}
                      onClick={() => handleRateCard(1)}
                      disabled={submittingRating}
                    >
                      <span>🔴 1</span>
                      <span style={styles.ratingLabel}>Esqueci</span>
                    </button>
                    <button
                      className="btn btn-glass"
                      style={{ ...styles.ratingBtn, background: "rgba(245, 158, 11, 0.1)" }}
                      onClick={() => handleRateCard(3)}
                      disabled={submittingRating}
                    >
                      <span>🟡 3</span>
                      <span style={styles.ratingLabel}>Lembrei c/ esforço</span>
                    </button>
                    <button
                      className="btn btn-glass"
                      style={{ ...styles.ratingBtn, background: "rgba(16, 185, 129, 0.1)" }}
                      onClick={() => handleRateCard(5)}
                      disabled={submittingRating}
                    >
                      <span>🟢 5</span>
                      <span style={styles.ratingLabel}>Fácil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "700px",
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
  addBtn: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    borderRadius: "8px",
  },
  studyArea: {
    width: "100%",
  },
  loadingState: {
    textAlign: "center",
    padding: "50px",
    color: "#9ca3af",
  },
  emptyCard: {
    padding: "50px 30px",
    textAlign: "center",
  },
  deckContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "center",
    width: "100%",
  },
  cardInfo: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    fontWeight: 600,
  },
  flashcard: {
    width: "100%",
    padding: "30px",
    minHeight: "260px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 0.3s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioBtn: {
    padding: "4px 10px",
    fontSize: "0.75rem",
    borderRadius: "6px",
  },
  boxBadge: {
    fontSize: "0.75rem",
    background: "rgba(147, 51, 234, 0.15)",
    color: "#a855f7",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "4px",
  },
  cardContent: {
    textAlign: "center",
    margin: "30px 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  cardWord: {
    fontSize: "2.2rem",
    color: "var(--text-primary)",
    marginBottom: "15px",
  },
  revealBtn: {
    padding: "10px 24px",
    fontSize: "0.9rem",
    borderRadius: "10px",
  },
  answerSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    animation: "fadeIn 0.3s ease-out",
  },
  cardTranslation: {
    fontSize: "1.3rem",
    color: "#34d399",
  },
  cardDef: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    lineHeight: "1.4",
  },
  cardEx: {
    fontSize: "0.85rem",
    color: "#d1d5db",
    background: "rgba(255,255,255,0.02)",
    padding: "8px 12px",
    borderRadius: "8px",
    lineHeight: "1.4",
  },
  feedbackPanel: {
    width: "100%",
    padding: "20px 25px",
    textAlign: "center",
  },
  feedbackIntro: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    marginBottom: "14px",
    fontWeight: 600,
  },
  ratingGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  },
  ratingBtn: {
    flexDirection: "column",
    padding: "12px 10px",
    borderRadius: "10px",
  },
  ratingLabel: {
    fontSize: "0.65rem",
    color: "#9ca3af",
    marginTop: "4px",
  },
  formCard: {
    padding: "30px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#d1d5db",
  },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "12px 14px",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
  },
  textarea: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "12px 14px",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    outline: "none",
    height: "80px",
    resize: "none",
    fontFamily: "inherit",
  },
  error: {
    color: "#f87171",
    fontSize: "0.85rem",
    background: "rgba(248,113,113,0.1)",
    padding: "8px 12px",
    borderRadius: "8px",
  },
  success: {
    color: "#34d399",
    fontSize: "0.85rem",
    background: "rgba(52,211,153,0.1)",
    padding: "8px 12px",
    borderRadius: "8px",
  },
};
