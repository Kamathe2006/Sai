/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AudioStreamer } from "@/src/lib/audio-streamer";
import { LiveSession, SessionState } from "@/src/lib/live-session";
import { MicButton } from "@/src/components/MicButton";
import { Waveform } from "@/src/components/Waveform";
import { Sparkles, Globe, Info } from "lucide-react";

export default function App() {
  const [state, setState] = useState<SessionState>("disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [wittyMessage, setWittyMessage] = useState("Ready for some charm?");

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const wittyMessages = [
    "Don't keep me waiting, darling.",
    "I'm all ears. Literally.",
    "Ready to be impressed?",
    "Go ahead, say something smart.",
    "I promise not to tease you... much.",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (state === "disconnected") {
        setWittyMessage(wittyMessages[Math.floor(Math.random() * wittyMessages.length)]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [state]);

  const handleToggle = useCallback(async () => {
    if (state === "connected") {
      liveSessionRef.current?.disconnect();
      audioStreamerRef.current?.stop();
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      setState("error");
      return;
    }

    try {
      if (!audioStreamerRef.current) {
        audioStreamerRef.current = new AudioStreamer();
      }
      
      // Start audio FIRST to ensure user gesture context is preserved for the permission prompt
      await audioStreamerRef.current.start((base64) => {
        liveSessionRef.current?.sendAudio(base64);
        setIsListening(true);
      });

      if (!liveSessionRef.current) {
        liveSessionRef.current = new LiveSession(apiKey);
      }

      await liveSessionRef.current.connect({
        onStateChange: (newState) => setState(newState),
        onAudioData: (base64) => {
          audioStreamerRef.current?.addAudioChunk(base64);
          setIsSpeaking(true);
        },
        onInterrupted: () => {
          audioStreamerRef.current?.clearQueue();
          setIsSpeaking(false);
        },
        onTranscription: (text, isModel) => {
          if (isModel) {
            setTranscription(text);
          }
        },
        onToolCall: (name, args) => {
          if (name === "openWebsite") {
            window.open(args.url, "_blank");
          }
        }
      });
    } catch (error) {
      console.error("Microphone error:", error);
      setState("error");
      setTranscription("Microphone access denied. Please allow microphone access in your browser.");
      liveSessionRef.current?.disconnect();
      audioStreamerRef.current?.stop();
      return;
    }
  }, [state]);

  // Reset speaking/listening states after a short delay if no data
  useEffect(() => {
    if (isSpeaking) {
      const timer = setTimeout(() => setIsSpeaking(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking]);

  useEffect(() => {
    if (isListening) {
      const timer = setTimeout(() => setIsListening(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  return (
    <div className="min-h-screen bg-bg-geometric text-white flex flex-col items-center justify-center p-8 overflow-hidden font-display selection:bg-accent-geometric/30">
      {/* Interface Layer (Radial Gradient) */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Corner Decorations */}
      <div className="fixed top-5 left-5 w-24 h-24 border-t-2 border-l-2 border-accent-geometric/30 pointer-events-none" />
      <div className="fixed top-5 right-5 w-24 h-24 border-t-2 border-r-2 border-accent-geometric/30 pointer-events-none" />
      <div className="fixed bottom-5 left-5 w-24 h-24 border-b-2 border-l-2 border-accent-geometric/30 pointer-events-none" />
      <div className="fixed bottom-5 right-5 w-24 h-24 border-b-2 border-r-2 border-accent-geometric/30 pointer-events-none" />

      {/* Top Bar */}
      <header className="fixed top-10 w-full px-16 flex items-center justify-between z-20">
        <div className="text-2xl font-extrabold tracking-[4px] uppercase text-accent-geometric shadow-[0_0_20px_rgba(0,242,255,0.4)]">
          Sai
        </div>
        <div className="text-[10px] text-text-dim tracking-[2px] uppercase font-mono">
          Secure Live Session // PCM16 16kHz
        </div>
      </header>

      {/* Main Stage */}
      <main className="relative z-10 flex flex-col items-center justify-center gap-10">
        {/* Status Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 py-2 rounded-full border border-white/10 bg-white/5 text-[11px] font-medium tracking-[1px] uppercase text-accent-geometric"
        >
          {state === "connected" ? "Listening..." : state === "connecting" ? "Connecting..." : "Standby"}
        </motion.div>

        {/* Orb / Mic Button */}
        <MicButton 
          isActive={state === "connected"} 
          isConnecting={state === "connecting"}
          onClick={handleToggle}
        />

        {/* Waveform Visualizer */}
        <div className="mt-10">
          <Waveform 
            isSpeaking={isSpeaking} 
            isListening={isListening} 
          />
        </div>
      </main>

      {/* Persona Caption / Footer */}
      <footer className="fixed bottom-16 flex flex-col items-center text-center max-w-2xl px-8 z-20">
        <AnimatePresence mode="wait">
          {state === "connected" ? (
            <motion.div
              key="transcription"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <p className="text-2xl font-light italic text-white leading-relaxed">
                {transcription || "I'm listening, don't be shy..."}
              </p>
              <p className="text-[12px] text-text-dim tracking-[1px] uppercase">
                Tap central core to interrupt
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="witty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <p className="text-2xl font-light italic text-white leading-relaxed">
                "{wittyMessage}"
              </p>
              <p className="text-[12px] text-text-dim tracking-[1px] uppercase">
                Tap central core to begin session
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>

      {/* Error Toast / Troubleshooting */}
      <AnimatePresence>
        {state === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/50 backdrop-blur-md text-red-400 text-sm font-medium z-50 max-w-sm text-center"
          >
            <p className="mb-2 font-bold uppercase tracking-wider">Microphone Access Denied</p>
            <p className="text-xs text-red-300/80 mb-3">
              I can't hear you! Please check your browser's address bar to allow microphone access.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-1.5 rounded-full bg-red-500 text-white text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors"
            >
              Reload & Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
