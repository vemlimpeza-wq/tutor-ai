"use client";

import React, { useEffect, useRef, useState } from "react";
import { tutorProfiles } from "@/lib/data/tutors";
import { useLiveAudio } from "@/lib/useLiveAudio";

interface LiveCallScreenProps {
  user: any;
  tutorId: string;
  scenario: string;
  onExit: () => void;
}

export default function LiveCallScreen({
  user,
  tutorId,
  scenario,
  onExit,
}: LiveCallScreenProps) {
  const tutor = tutorProfiles.find((t) => t.id === tutorId) || tutorProfiles[0];
  const { connect, disconnect, isConnected, isTutorSpeaking, statusText, error } = useLiveAudio();
  const [isMuted, setIsMuted] = useState(false);

  // Canvas visualizador
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  useEffect(() => {
    // Definindo as instruções rígidas do Tutor Híbrido (English + Portuguese corrections)
    const systemPrompt = `You are an AI English Tutor named ${tutor.name}. Personality: ${tutor.bio}.
We are in a real-time voice call simulating a "${scenario}" scenario.
The student is speaking to you. 
CRITICAL RULE: If the student makes a grammar or pronunciation error, you MUST gently interrupt them by speaking in BRAZILIAN PORTUGUESE to point out the error and say how to correctly say it in English. 
After the Portuguese correction, IMMEDIATELY switch back to English to continue the conversation naturally.
If they do not make mistakes, keep the conversation entirely in English.
Keep your responses short, natural, and conversational.`;

    connectRef.current(tutor.geminiVoice || "Aoede", systemPrompt);

    return () => {
      disconnectRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutor.id, scenario]);

  // Efeito Visual do Espectrograma (Falso/Procedural se não atrelado diretamente ao WebAudio do output, 
  // mas como temos o estado 'isTutorSpeaking', podemos fazer um visualizer responsivo ao estado)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Amplitude aumenta se o tutor estiver falando
      const targetAmplitude = isTutorSpeaking ? 40 : (isConnected ? 5 : 2);
      time += isTutorSpeaking ? 0.15 : 0.05;

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let i = 0; i < width; i++) {
        const x = i;
        // Combinação de ondas seno para efeito suave tipo Siri/SVoice
        const y1 = Math.sin(x * 0.02 + time) * targetAmplitude;
        const y2 = Math.sin(x * 0.01 + time * 1.5) * (targetAmplitude * 0.5);
        const y3 = Math.sin(x * 0.04 - time) * (targetAmplitude * 0.2);
        
        // Envelope de Hanning para zerar as pontas
        const envelope = Math.sin((x / width) * Math.PI);
        const y = centerY + (y1 + y2 + y3) * envelope;

        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = "rgba(168, 85, 247, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Reflexo sutil
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let i = 0; i < width; i++) {
        const x = i;
        const y1 = Math.sin(x * 0.02 + time) * targetAmplitude;
        const envelope = Math.sin((x / width) * Math.PI);
        const y = centerY - y1 * envelope * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isConnected, isTutorSpeaking]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button className="btn btn-glass" onClick={onExit} style={styles.btnBack}>
          ⬅ Voltar
        </button>
        <div style={styles.scenarioBadge}>
          Modo Ao Vivo: {scenario}
        </div>
      </div>

      <div style={styles.callCard}>
        {error ? (
          <div style={styles.errorBox}>
            <p>⚠️ {error}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
              <button className="btn btn-primary" onClick={() => {
                const systemPrompt = `You are an AI English Tutor named ${tutor.name}. Personality: ${tutor.bio}.
We are in a real-time voice call simulating a "${scenario}" scenario.
The student is speaking to you. 
CRITICAL RULE: If the student makes a grammar or pronunciation error, you MUST gently interrupt them by speaking in BRAZILIAN PORTUGUESE to point out the error and say how to correctly say it in English. 
After the Portuguese correction, IMMEDIATELY switch back to English to continue the conversation naturally.
If they do not make mistakes, keep the conversation entirely in English.
Keep your responses short, natural, and conversational.`;
                disconnect();
                setTimeout(() => connect(tutor.geminiVoice || "Aoede", systemPrompt), 500);
              }}>🔄 Reconectar</button>
              <button className="btn btn-glass" onClick={onExit}>⬅ Voltar</button>
            </div>
          </div>
        ) : (
          <>
            <div style={styles.avatarContainer}>
              <div
                style={{
                  ...styles.avatarGlow,
                  animation: isTutorSpeaking ? "pulseGlow 1s infinite alternate" : "none",
                  opacity: isTutorSpeaking ? 1 : 0.2,
                }}
              />
              <div style={styles.avatarPhoto}>
                {tutor.imageUrl ? (
                  <img 
                    src={tutor.imageUrl} 
                    alt={tutor.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                ) : (
                  tutor.avatar
                )}
              </div>
            </div>

            <h2 style={styles.tutorName}>{tutor.name}</h2>
            <p style={styles.statusText}>
              {statusText}
            </p>

            {/* Visualizador de Ondas */}
            <div style={styles.visualizerContainer}>
              <canvas ref={canvasRef} width={300} height={100} style={styles.canvas} />
            </div>

            <div style={styles.controls}>
              <button
                className={`btn ${isMuted ? "btn-danger" : "btn-glass"}`}
                style={styles.controlBtn}
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? "🔇 Mudo" : "🎙️ Microfone"}
              </button>
              <button
                className="btn btn-danger"
                style={{ ...styles.controlBtn, background: "#ef4444", color: "#fff" }}
                onClick={onExit}
              >
                ☎️ Desligar
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    background: "var(--bg-default)",
    position: "relative",
  },
  header: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnBack: {
    padding: "8px 16px",
  },
  scenarioBadge: {
    background: "rgba(0,0,0,0.2)",
    padding: "6px 12px",
    borderRadius: "12px",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  callCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "24px",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "90%",
    maxWidth: "400px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
  },
  avatarContainer: {
    position: "relative",
    width: "120px",
    height: "120px",
    marginBottom: "20px",
  },
  avatarGlow: {
    position: "absolute",
    top: "-10px",
    left: "-10px",
    right: "-10px",
    bottom: "-10px",
    background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
    borderRadius: "50%",
    zIndex: 0,
    transition: "opacity 0.3s ease",
  },
  avatarPhoto: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "var(--bg-default)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "4rem",
    zIndex: 1,
    border: "4px solid var(--bg-card)",
    overflow: "hidden",
  },
  tutorName: {
    margin: "0 0 5px 0",
    fontSize: "1.5rem",
    color: "var(--text-primary)",
  },
  statusText: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.95rem",
  },
  visualizerContainer: {
    marginTop: "30px",
    marginBottom: "30px",
    width: "100%",
    height: "100px",
    display: "flex",
    justifyContent: "center",
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
  controls: {
    display: "flex",
    gap: "16px",
    marginTop: "10px",
  },
  controlBtn: {
    padding: "12px 24px",
    fontSize: "1rem",
    borderRadius: "30px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
  },
  errorBox: {
    textAlign: "center",
    color: "#ef4444",
  }
};
