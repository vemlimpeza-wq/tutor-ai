import { useState, useRef, useCallback, useEffect } from "react";

// Converte Float32Array (Microfone) para Int16Array PCM
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

// Converte ArrayBuffer para Base64
function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Converte Base64 para Float32Array (Audio Player)
function base64ToFloat32Array(base64: string, outputSampleRate: number): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
  }
  return float32Array;
}

export function useLiveAudio() {
  const [isConnected, setIsConnected] = useState(false);
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Preparando...");

  const wsRef = useRef<WebSocket | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Reprodução de áudio contínua sem cortes
  const playAudioQueue = useCallback(() => {
    const ctx = playbackCtxRef.current;
    if (!ctx || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsTutorSpeaking(false);
      return;
    }

    setIsTutorSpeaking(true);
    isPlayingRef.current = true;

    // Junta todos os pedaços de áudio num buffer único
    let totalLength = 0;
    for (const buf of audioQueueRef.current) totalLength += buf.length;

    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of audioQueueRef.current) {
      combined.set(buf, offset);
      offset += buf.length;
    }
    audioQueueRef.current = [];

    // Gemini Live API devolve áudio PCM a 24kHz
    const audioBuffer = ctx.createBuffer(1, combined.length, 24000);
    audioBuffer.getChannelData(0).set(combined);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Cria GainNode para amplificar o volume em dispositivos móveis (ganho de 2.2x)
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(2.2, ctx.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playAudioQueue();
      } else {
        isPlayingRef.current = false;
        setIsTutorSpeaking(false);
      }
    };
    source.start(0);
  }, []);

  const startMicrophone = useCallback(async () => {
    try {
      setStatusText("Acessando microfone...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } 
      });
      streamRef.current = stream;

      // AudioContext separado para captura a 16kHz
      const captureCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;

      const source = captureCtx.createMediaStreamSource(stream);
      const processor = captureCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcm16.buffer);

        ws.send(JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: "audio/pcm;rate=16000",
              data: base64Audio
            }
          }
        }));
      };

      source.connect(processor);
      processor.connect(captureCtx.destination);

      setStatusText("Pronto! Pode falar...");
      console.log("[LiveAudio] Microfone ativo e enviando áudio.");
    } catch (e: any) {
      console.error("[LiveAudio] Erro no microfone:", e);
      setError("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  }, []);

  const connect = useCallback(async (tutorVoice: string, systemInstruction: string) => {
    try {
      setError(null);
      setStatusText("Obtendo configuração...");

      // 1. Pega a API Key
      const res = await fetch("/api/config");
      const { geminiApiKey } = await res.json();
      if (!geminiApiKey) throw new Error("GEMINI_API_KEY não encontrada.");

      // 2. Cria o AudioContext para playback (sample rate padrão do sistema)
      const playbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      playbackCtxRef.current = playbackCtx;

      // 3. Abre o WebSocket
      setStatusText("Conectando ao Gemini Live...");
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;
      
      console.log("[LiveAudio] Abrindo WebSocket...");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[LiveAudio] WebSocket aberto! Enviando setup...");
        setStatusText("Enviando configuração do tutor...");

        // Mensagem de setup obrigatória
        const setupMsg = {
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: tutorVoice || "Aoede" }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          }
        };

        ws.send(JSON.stringify(setupMsg));
        console.log("[LiveAudio] Setup enviado:", JSON.stringify(setupMsg).substring(0, 200));
      };

      ws.onmessage = (event) => {
        const parseMessage = (text: string) => {
          try {
            const msg = JSON.parse(text);
            console.log("[LiveAudio] Mensagem recebida:", Object.keys(msg));

            // Confirmação de setup
            if (msg.setupComplete) {
              console.log("[LiveAudio] ✅ Setup completo! Conexão estabelecida.");
              setIsConnected(true);
              setStatusText("Pronto! Pode falar...");
              // Agora que o setup está completo, inicia o microfone
              startMicrophone();
            }

            // Áudio do tutor
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const audioFloat = base64ToFloat32Array(part.inlineData.data, 24000);
                  audioQueueRef.current.push(audioFloat);
                  if (!isPlayingRef.current) {
                    playAudioQueue();
                  }
                }
              }
            }

            // Fim do turno do servidor
            if (msg.serverContent?.turnComplete) {
              console.log("[LiveAudio] Turno do servidor completo.");
              setStatusText("Pronto! Pode falar...");
            }

            // Servidor interrompido (o user falou e cortou o tutor)
            if (msg.serverContent?.interrupted) {
              console.log("[LiveAudio] Tutor foi interrompido pelo aluno.");
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsTutorSpeaking(false);
            }

            // GoAway — sessão expirando, tenta reconectar
            if (msg.goAway) {
              console.warn("[LiveAudio] ⚠️ GoAway recebido. Sessão expirando...");
              setStatusText("⏳ Sessão expirando, reconectando...");
            }

          } catch (e) {
            console.error("[LiveAudio] Erro ao parsear mensagem:", e, text.substring(0, 200));
          }
        };

        if (event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => parseMessage(reader.result as string);
          reader.readAsText(event.data);
        } else {
          parseMessage(event.data);
        }
      };

      ws.onclose = (event) => {
        console.log(`[LiveAudio] WebSocket fechado. Code: ${event.code}, Reason: ${event.reason}`);
        setIsConnected(false);
        if (event.code !== 1000) {
          setError(`Conexão encerrada (código ${event.code}). ${event.reason || "Verifique sua API Key e cota."}`);
        }
      };

      ws.onerror = (e) => {
        console.error("[LiveAudio] WebSocket Error:", e);
        setError("Erro na conexão WebSocket com o Gemini. Verifique a API Key e a conexão de internet.");
        setIsConnected(false);
      };

    } catch (e: any) {
      console.error("[LiveAudio] Erro geral:", e);
      setError(e.message || "Não foi possível conectar.");
      setIsConnected(false);
    }
  }, [playAudioQueue, startMicrophone]);

  const disconnect = useCallback(() => {
    console.log("[LiveAudio] Desconectando...");
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close();
      captureCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsTutorSpeaking(false);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return { connect, disconnect, isConnected, isTutorSpeaking, statusText, error };
}
