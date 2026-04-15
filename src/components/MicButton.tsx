/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Power } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface MicButtonProps {
  isActive: boolean;
  isConnecting: boolean;
  onClick: () => void;
  className?: string;
}

export function MicButton({ isActive, isConnecting, onClick, className }: MicButtonProps) {
  return (
    <div className={cn("relative flex items-center justify-center w-[280px] h-[280px]", className)}>
      {/* Orb Outer Ring */}
      <div className="absolute inset-0 border-2 border-accent-geometric rounded-full opacity-20 shadow-[inset_0_0_30px_rgba(0,242,255,0.4)]" />
      
      {/* Orb Middle Ring */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-[80%] h-[80%] border border-dashed border-accent-geometric rounded-full opacity-40" 
      />

      {/* Main Core Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        disabled={isConnecting}
        className={cn(
          "relative z-10 w-[160px] h-[160px] rounded-full flex items-center justify-center transition-all duration-500",
          "border-4 bg-bg-geometric",
          isActive 
            ? "border-accent-geometric shadow-[0_0_50px_rgba(0,242,255,0.4)]" 
            : "border-zinc-800 shadow-black/50 hover:border-zinc-700",
          isConnecting && "animate-pulse opacity-50 cursor-wait"
        )}
      >
        {/* Inner Pulse Effect */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-accent-geometric rounded-full"
            />
          )}
        </AnimatePresence>

        <div className="relative z-20">
          {isConnecting ? (
            <div className="w-10 h-10 border-4 border-accent-geometric border-t-transparent rounded-full animate-spin" />
          ) : isActive ? (
            <Mic className="w-12 h-12 text-accent-geometric" />
          ) : (
            <Power className="w-12 h-12 text-zinc-700" />
          )}
        </div>
      </motion.button>

      {/* Status Text - Repositioned for theme */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute -bottom-16 text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500"
      >
        {isConnecting ? "System Initializing" : isActive ? "Core Active" : "Core Standby"}
      </motion.div>
    </div>
  );
}
