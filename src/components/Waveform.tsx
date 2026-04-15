/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface WaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
  className?: string;
}

export function Waveform({ isSpeaking, isListening, className }: WaveformProps) {
  const bars = Array.from({ length: 15 });

  return (
    <div className={cn("flex items-center justify-center gap-[6px] w-[400px] h-[60px]", className)}>
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-accent-geometric rounded-full"
          initial={{ height: 4 }}
          animate={{
            height: isSpeaking || isListening ? [4, Math.random() * 40 + 10, 4] : 4,
            opacity: isSpeaking || isListening ? 0.8 : 0.2,
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            delay: i * 0.03,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
