"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { tutorProfiles } from "@/lib/data/tutors";

interface ChatScreenProps {
  user: any;
  tutorId: string;
  scenario: string;
  accent: string;
  onExit: () => void;
  onUpdatePoints: (newPoints: number) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  correctedText?: string;
  grammarExplanation?: string;
  pronunciationScore?: number;
  createdAt: string;
  isVoiceMessage?: boolean;
  translation?: string;
}

// Tipagem para o SpeechRecognition do navegador
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export default function ChatScreen({
  user,
  tutorId,
  scenario,
  accent,
  onExit,
  onUpdatePoints,
}: ChatScreenProps) {
  const tutor = tutorProfiles.find((t) => t.id === tutorId) || tutorProfiles[0];
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [selectedPronunciationText, setSelectedPronunciationText] = useState<string | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<any | null>(null);
  const [loadingPronunciation, setLoadingPronunciation] = useState(false);
  const [showPronunciationModal, setShowPronunciationModal] = useState(false);
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [revealedTranslations, setRevealedTranslations] = useState<Record<string, boolean>>({});

  const toggleTranslation = (id: string) => {
    setRevealedTranslations((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  // Detecta suporte a Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Mensagem de boas-vindas inicial
  useEffect(() => {
    const welcomeMsg: Message = {
      id: "welcome-msg",
      role: "assistant",
      content: tutor.welcomeMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages([welcomeMsg]);

    // Fala a mensagem de boas-vindas
    if (autoSpeak) {
      setTimeout(() => speakText(tutor.welcomeMessage), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutor]);

  // Rola até o final das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Timer para gravação de áudio
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  
  // ====== GEMINI AUDIO PLAYER ======
  const playGeminiAudio = (base64Audio: string) => {
    if (typeof window === "undefined" || !base64Audio) return;
    try {
      setIsTutorSpeaking(true);
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 24000 });
      
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      
      const audioBuffer = audioContext.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsTutorSpeaking(false);
      source.start();
    } catch (err) {
      console.error("Failed to play Gemini Audio:", err);
      setIsTutorSpeaking(false);
    }
  };

  // ====== SPEECH SYNTHESIS - Fallback ou Legado ======
  const speakText = useCallback(
    (text: string, base64Audio?: string) => {
      if (!autoSpeak) return;
      if (base64Audio) {
        playGeminiAudio(base64Audio);
        return;
      }
      
      // Fallback para speechSynthesis caso base64Audio não venha
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (accent === "British") {
        utterance.lang = "en-GB";
      } else if (accent === "Australian") {
        utterance.lang = "en-AU";
      } else {
        utterance.lang = "en-US";
      }
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith(utterance.lang.split("-")[0]) && v.lang === utterance.lang
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.onstart = () => setIsTutorSpeaking(true);
      utterance.onend = () => setIsTutorSpeaking(false);
      utterance.onerror = () => setIsTutorSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [accent, autoSpeak]
  );
// ====== SPEECH RECOGNITION - Reconhecimento de voz real do usuário ======
  const startRecording = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz. Use o Chrome ou Edge.");
      return;
    }

    // Para a fala do tutor se estiver ativa
    window.speechSynthesis.cancel();
    setIsTutorSpeaking(false);

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // Reconhece inglês
    recognition.interimResults = true; // Mostra transcrição parcial em tempo real
    recognition.continuous = true; // Não para ao final da frase
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = "";
    setLiveTranscript("");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = finalText;
      setLiveTranscript(finalText + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      if (event.error !== "aborted") {
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      // Quando o reconhecimento termina naturalmente
      if (isRecording) {
        // Reinicia automaticamente se ainda estiver gravando
        try {
          recognition.start();
        } catch {
          setIsRecording(false);
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (err) {
      console.error("Falha ao iniciar gravação:", err);
    }
  }, [isRecording]);

  const stopRecordingAndSend = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // Previne reinício automático
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setIsRecording(false);

    // Usa a transcrição final acumulada, ou a live se a final estiver vazia
    const textToSend = finalTranscriptRef.current.trim() || liveTranscript.trim();

    if (textToSend) {
      handleSendMessage(textToSend, true);
    }

    setLiveTranscript("");
    finalTranscriptRef.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTranscript]);

  const handleMicrophoneClick = useCallback(() => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecordingAndSend();
    }
  }, [isRecording, startRecording, stopRecordingAndSend]);

  // ====== ENVIO DE MENSAGEM (texto ou voz) ======
  const handleSendMessage = async (textToSend: string, isVoice: boolean = false) => {
    if (!textToSend.trim()) return;

    const tempUserMsgId = `temp-user-${Date.now()}`;
    const newMsg: Message = {
      id: tempUserMsgId,
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
      isVoiceMessage: isVoice,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          tutorId: tutor.id,
          scenario,
          message: textToSend,
          accentPreference: accent,
          conversationId: messages.length > 1 ? "some-conv-id" : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro no chat");

      const tutorMessage: Message = {
        id: data.tutorMessage.id,
        role: "assistant",
        content: data.tutorMessage.content,
        createdAt: data.tutorMessage.createdAt,
        translation: data.tutorMessage.translation,
      };

      setMessages((prev) =>
        prev
          .map((m) =>
            m.id === tempUserMsgId
              ? {
                  ...m,
                  id: data.userMessage.id,
                  correctedText: data.userMessage.correctedText,
                  grammarExplanation: data.userMessage.grammarExplanation,
                }
              : m
          )
          .concat(tutorMessage)
      );

      onUpdatePoints(data.userPoints);

      // O tutor fala a resposta em voz alta
      if (autoSpeak) {
        speakText(data.tutorMessage.content);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ====== PRONÚNCIA ======
  const handleAnalyzePronunciation = async (phrase: string) => {
    setSelectedPronunciationText(phrase);
    setLoadingPronunciation(true);
    setShowPronunciationModal(true);

    try {
      const response = await fetch("/api/pronunciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, expectedText: phrase }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error("Erro na pronúncia");

      setPronunciationResult(data.evaluation);
      onUpdatePoints(data.userPoints);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPronunciation(false);
    }
  };

  const playNativeReferenceAudio = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        tutor.accent === "British"
          ? "en-GB"
          : tutor.accent === "Australian"
          ? "en-AU"
          : "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const getAccuracyColor = (score: number) => {
    if (score >= 90) return "#10b981";
    if (score >= 80) return "#f59e0b";
    return "#ef4444";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={styles.container}>
      {/* Header do Chat */}
      <div className="glass-panel" style={styles.header}>
        <button className="btn btn-glass" style={styles.backBtn} onClick={onExit}>
          ⬅ Voltar
        </button>

        <div style={styles.tutorInfo}>
          <div style={styles.avatarContainer}>
            <span style={styles.avatar}>{tutor.avatar}</span>
            {isTutorSpeaking && (
              <div style={styles.speakingIndicator}>
                <div style={styles.soundWave}></div>
                <div style={{ ...styles.soundWave, animationDelay: "0.15s" }}></div>
                <div style={{ ...styles.soundWave, animationDelay: "0.3s" }}></div>
              </div>
            )}
          </div>
          <div>
            <h3 style={styles.tutorName}>
              {tutor.name}
              {isTutorSpeaking && (
                <span style={styles.speakingBadge}> 🔊 falando...</span>
              )}
            </h3>
            <span style={styles.accentBadge}>Sotaque {tutor.accent}</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            style={{
              ...styles.autoSpeakToggle,
              background: autoSpeak
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(255, 255, 255, 0.03)",
              borderColor: autoSpeak
                ? "rgba(16, 185, 129, 0.3)"
                : "rgba(255, 255, 255, 0.08)",
            }}
            onClick={() => {
              setAutoSpeak(!autoSpeak);
              if (isTutorSpeaking) {
                window.speechSynthesis.cancel();
                setIsTutorSpeaking(false);
              }
            }}
            title={autoSpeak ? "Desativar voz do tutor" : "Ativar voz do tutor"}
          >
            {autoSpeak ? "🔊" : "🔇"} Auto-voz
          </button>
          <div style={styles.scenarioInfo}>
            <span style={styles.scenarioLabel}>Modo:</span>
            <span style={styles.scenarioValue}>
              {scenario === "casual"
                ? "☕ Casual"
                : scenario === "hotel"
                ? "🛎️ Hotel"
                : scenario === "interview"
                ? "💼 Entrevista"
                : "✈️ Aeroporto"}
            </span>
          </div>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="glass-panel" style={styles.chatArea}>
        <div style={styles.messageList}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${
                msg.role === "user" ? "message-user" : "message-assistant"
              }`}
              style={{
                ...styles.bubbleOverride,
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {/* Autor */}
              <div style={styles.bubbleHeader}>
                <span style={styles.bubbleAuthor}>
                  {msg.role === "user" ? (
                    <>
                      Você {msg.isVoiceMessage && <span style={styles.voiceBadge}>🎙️ voz</span>}
                    </>
                  ) : (
                    <>
                      {tutor.name}
                      <button
                        style={styles.replayBtn}
                        onClick={() => speakText(msg.content)}
                        title="Ouvir novamente"
                      >
                        🔊
                      </button>
                    </>
                  )}
                </span>
                <span style={styles.bubbleTime}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Conteúdo */}
              <p style={styles.bubbleContent}>{msg.content}</p>

              {/* Botão de Tradução (Angola) */}
              {msg.role === "assistant" && msg.translation && (
                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => toggleTranslation(msg.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    {revealedTranslations[msg.id] ? "🙈 Ocultar Tradução" : "🌍 Ver Tradução (AO)"}
                  </button>
                  
                  {revealedTranslations[msg.id] && (
                    <div style={{
                      marginTop: "6px",
                      padding: "10px",
                      background: "var(--bg-card)",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                      borderLeft: "3px solid var(--color-primary)"
                    }}>
                      {msg.translation}
                    </div>
                  )}
                </div>
              )}

              {/* Correção Gramatical */}
              {msg.role === "user" && msg.correctedText && (
                <div style={styles.correctionBox}>
                  <div style={styles.correctionTitle}>
                    <span>⚠️ Correção Gramatical</span>
                  </div>
                  <div className="corrected-text">{msg.correctedText}</div>
                  {msg.grammarExplanation && (
                    <p style={styles.correctionExplanation}>
                      {msg.grammarExplanation}
                    </p>
                  )}
                </div>
              )}

              {/* Botão de prática de pronúncia */}
              {msg.role === "user" && (
                <button
                  className="btn btn-glass"
                  style={styles.pronounceBtn}
                  onClick={() => handleAnalyzePronunciation(msg.content)}
                >
                  🎙️ Analisar Minha Pronúncia
                </button>
              )}
            </div>
          ))}

          {loading && (
            <div
              className="message-bubble message-assistant"
              style={{ ...styles.bubbleOverride, alignSelf: "flex-start" }}
            >
              <div style={styles.typingIndicator}>
                <div style={styles.typingDot}></div>
                <div style={{ ...styles.typingDot, animationDelay: "0.2s" }}></div>
                <div style={{ ...styles.typingDot, animationDelay: "0.4s" }}></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Caixa de Entrada e Controles de Voz */}
      <div className="glass-panel" style={styles.inputArea}>
        {/* Overlay de gravação de voz REAL */}
        {isRecording && (
          <div style={styles.recordingOverlay}>
            <div style={styles.recordingLeft}>
              <div style={styles.pulseRing}>
                <div className="voice-pulse" style={styles.pulseCore}>🎙️</div>
              </div>
              <div style={styles.recordingInfo}>
                <span style={styles.recordingTitle}>
                  🔴 Gravando · {formatTime(recordingSeconds)}
                </span>
                <span style={styles.recordingHint}>
                  Fale em inglês — sua voz está sendo transcrita em tempo real
                </span>
              </div>
            </div>

            {/* Transcrição ao vivo */}
            {liveTranscript && (
              <div style={styles.liveTranscriptBox}>
                <span style={styles.liveTranscriptLabel}>📝 Transcrição:</span>
                <p style={styles.liveTranscriptText}>{liveTranscript}</p>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={styles.stopRecordingBtn}
              onClick={handleMicrophoneClick}
            >
              ⏹️ Parar e Enviar
            </button>
          </div>
        )}

        {/* Aviso de navegador sem suporte */}
        {!speechSupported && (
          <div style={styles.noSpeechWarning}>
            ⚠️ Seu navegador não suporta reconhecimento de voz. Use o{" "}
            <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> para
            interagir por voz.
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText, false);
          }}
          style={styles.inputForm}
        >
          <button
            type="button"
            className={`btn ${isRecording ? "btn-secondary" : "btn-glass"}`}
            style={{
              ...styles.micBtn,
              ...(isRecording
                ? {
                    background: "rgba(239, 68, 68, 0.2)",
                    borderColor: "rgba(239, 68, 68, 0.5)",
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)",
                  }
                : {}),
            }}
            onClick={handleMicrophoneClick}
            title={isRecording ? "Parar gravação" : "Falar com o tutor"}
            disabled={!speechSupported || loading}
          >
            {isRecording ? "⏹️" : "🎙️"}
          </button>

          <input
            type="text"
            placeholder={
              isRecording
                ? "🎙️ Ouvindo sua voz..."
                : `Responda a ${tutor.name} em inglês...`
            }
            value={isRecording ? liveTranscript : inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={styles.textInput}
            disabled={loading || isRecording}
          />

          <button
            type="submit"
            className={`btn btn-primary ${
              !inputText.trim() || loading || isRecording ? "btn-disabled" : ""
            }`}
            style={styles.sendBtn}
            disabled={!inputText.trim() || loading || isRecording}
          >
            Enviar ✉️
          </button>
        </form>
      </div>

      {/* Modal de Análise Fonética */}
      {showPronunciationModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3>🎙️ Relatório Detalhado de Pronúncia</h3>
              <button
                style={styles.closeModalBtn}
                onClick={() => setShowPronunciationModal(false)}
              >
                ✕
              </button>
            </div>

            {loadingPronunciation ? (
              <div style={styles.modalLoading}>
                <div className="voice-pulse" style={styles.spinner}>
                  🗣️
                </div>
                <h4>Analisando áudio foneticamente...</h4>
              </div>
            ) : (
              <div style={styles.modalContent}>
                <div style={styles.scoresGrid}>
                  <div style={styles.scoreCard}>
                    <span style={styles.scoreVal}>
                      {pronunciationResult?.overallScore}
                    </span>
                    <span style={styles.scoreLab}>Nota Geral</span>
                  </div>
                  <div style={styles.scoreCard}>
                    <span style={styles.scoreVal}>
                      {pronunciationResult?.accuracyScore}
                    </span>
                    <span style={styles.scoreLab}>Precisão</span>
                  </div>
                  <div style={styles.scoreCard}>
                    <span style={styles.scoreVal}>
                      {pronunciationResult?.fluencyScore}
                    </span>
                    <span style={styles.scoreLab}>Fluência</span>
                  </div>
                </div>

                <div style={styles.feedbackBox}>
                  <strong>Avaliação pedagógica:</strong>
                  <p>{pronunciationResult?.feedback}</p>
                </div>

                <div style={styles.wordsAnalysisBox}>
                  <h4 style={{ marginBottom: "10px" }}>
                    Análise por Palavra (clique para ouvir):
                  </h4>
                  <div style={styles.wordsFlex}>
                    {pronunciationResult?.words.map((w: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          ...styles.wordBadge,
                          borderBottom: `4px solid ${getAccuracyColor(w.score)}`,
                        }}
                        onClick={() => playNativeReferenceAudio(w.word)}
                        title={`Clique para ouvir. Nota: ${w.score}%`}
                      >
                        <span style={styles.wordText}>{w.word}</span>
                        <span style={styles.wordScorePercent}>{w.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.actionBox}>
                  <button
                    className="btn btn-glass"
                    onClick={() =>
                      playNativeReferenceAudio(selectedPronunciationText || "")
                    }
                  >
                    🔊 Ouvir Frase Completa (Nativo)
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowPronunciationModal(false)}
                  >
                    Voltar para Conversa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS Animations inline */}
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0.2; }
          100% { transform: scale(1); opacity: 0.6; }
        }
        @keyframes soundWaveAnim {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes liveGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(168, 85, 247, 0.2); }
          50% { box-shadow: 0 0 25px rgba(168, 85, 247, 0.5); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "850px",
    margin: "0 auto",
    padding: "20px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "calc(100vh - 40px)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    flexWrap: "wrap",
    gap: "10px",
  },
  backBtn: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    borderRadius: "8px",
  },
  tutorInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatarContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    fontSize: "1.8rem",
  },
  speakingIndicator: {
    position: "absolute",
    bottom: "-6px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "2px",
    alignItems: "flex-end",
    height: "16px",
  },
  soundWave: {
    width: "3px",
    height: "4px",
    background: "#10b981",
    borderRadius: "2px",
    animation: "soundWaveAnim 0.6s ease-in-out infinite",
  },
  tutorName: {
    fontSize: "1rem",
    color: "var(--text-primary)",
    margin: 0,
  },
  speakingBadge: {
    fontSize: "0.7rem",
    color: "#10b981",
    fontWeight: 400,
  },
  accentBadge: {
    fontSize: "0.7rem",
    color: "#06b6d4",
    fontWeight: 700,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  autoSpeakToggle: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "var(--text-primary)",
    fontSize: "0.75rem",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s ease",
  },
  scenarioInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  scenarioLabel: {
    fontSize: "0.75rem",
    color: "#9ca3af",
  },
  scenarioValue: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  chatArea: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  bubbleOverride: {
    maxWidth: "80%",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  bubbleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "4px",
  },
  bubbleAuthor: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#a855f7",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  voiceBadge: {
    fontSize: "0.65rem",
    background: "rgba(168, 85, 247, 0.15)",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "#c084fc",
    fontWeight: 600,
  },
  replayBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    padding: "2px 4px",
    borderRadius: "4px",
    transition: "transform 0.2s ease",
  },
  bubbleTime: {
    fontSize: "0.7rem",
    color: "#6b7280",
  },
  bubbleContent: {
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    whiteSpace: "pre-line",
  },
  correctionBox: {
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "10px",
    padding: "10px 14px",
    marginTop: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  correctionTitle: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#f87171",
    textTransform: "uppercase" as const,
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  correctionExplanation: {
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginTop: "8px",
    lineHeight: "1.4",
  },
  pronounceBtn: {
    alignSelf: "flex-start",
    padding: "6px 12px",
    fontSize: "0.75rem",
    borderRadius: "6px",
    marginTop: "8px",
    border: "1px solid rgba(6, 182, 212, 0.2)",
    color: "#22d3ee",
  },
  typingIndicator: {
    display: "flex",
    gap: "6px",
    padding: "8px 4px",
    alignItems: "center",
  },
  typingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#a855f7",
    animation: "typingBounce 1.2s ease-in-out infinite",
  },
  inputArea: {
    padding: "16px",
    position: "relative",
  },
  recordingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(10, 10, 20, 0.97)",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 25px",
    zIndex: 10,
    gap: "16px",
    animation: "fadeIn 0.2s ease-out",
  },
  recordingLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  pulseRing: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "rgba(239, 68, 68, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "pulseRing 1.5s ease-in-out infinite",
    border: "2px solid rgba(239, 68, 68, 0.3)",
  },
  pulseCore: {
    fontSize: "1.5rem",
  },
  recordingInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  recordingTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#ef4444",
  },
  recordingHint: {
    fontSize: "0.78rem",
    color: "#9ca3af",
  },
  liveTranscriptBox: {
    width: "100%",
    background: "rgba(168, 85, 247, 0.08)",
    border: "1px solid rgba(168, 85, 247, 0.2)",
    borderRadius: "12px",
    padding: "12px 16px",
    animation: "liveGlow 2s ease-in-out infinite",
  },
  liveTranscriptLabel: {
    fontSize: "0.7rem",
    color: "#c084fc",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  liveTranscriptText: {
    fontSize: "1rem",
    color: "var(--text-primary)",
    margin: "6px 0 0 0",
    lineHeight: "1.5",
    fontStyle: "italic",
  },
  stopRecordingBtn: {
    padding: "12px 30px",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: 700,
  },
  noSpeechWarning: {
    background: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "0.8rem",
    color: "#fbbf24",
    marginBottom: "12px",
    textAlign: "center",
  },
  inputForm: {
    display: "flex",
    gap: "12px",
    width: "100%",
  },
  micBtn: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    padding: 0,
    fontSize: "1.2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.3s ease",
  },
  textInput: {
    flex: 1,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "14px 18px",
    borderRadius: "12px",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
  },
  sendBtn: {
    padding: "0 24px",
    borderRadius: "12px",
    fontSize: "0.95rem",
  },
  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "20px",
  },
  modalCard: {
    maxWidth: "550px",
    width: "100%",
    padding: "25px",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: "12px",
    marginBottom: "20px",
  },
  closeModalBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  modalLoading: {
    textAlign: "center",
    padding: "40px 0",
  },
  spinner: {
    fontSize: "3rem",
    display: "inline-block",
    width: "70px",
    height: "70px",
    lineHeight: "70px",
    borderRadius: "50%",
    background: "rgba(6, 182, 212, 0.1)",
    marginBottom: "15px",
  },
  modalContent: {},
  scoresGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginBottom: "20px",
  },
  scoreCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    padding: "15px 10px",
    borderRadius: "12px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  scoreVal: {
    fontSize: "1.8rem",
    fontWeight: 800,
    color: "#06b6d4",
  },
  scoreLab: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    fontWeight: 600,
  },
  feedbackBox: {
    background: "rgba(255,255,255,0.03)",
    padding: "14px 18px",
    borderRadius: "10px",
    fontSize: "0.85rem",
    lineHeight: "1.4",
    color: "#d1d5db",
    marginBottom: "20px",
  },
  wordsAnalysisBox: {
    marginBottom: "25px",
  },
  wordsFlex: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  wordBadge: {
    background: "rgba(255,255,255,0.04)",
    padding: "6px 12px",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    transition: "transform 0.2s ease",
  },
  wordText: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  wordScorePercent: {
    fontSize: "0.7rem",
    color: "#9ca3af",
    fontWeight: 700,
  },
  actionBox: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
  },
};
