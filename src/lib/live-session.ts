/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export type SessionState = "disconnected" | "connecting" | "connected" | "error";

export interface LiveSessionCallbacks {
  onAudioData: (base64Data: string) => void;
  onInterrupted: () => void;
  onStateChange: (state: SessionState) => void;
  onTranscription?: (text: string, isModel: boolean) => void;
  onToolCall?: (name: string, args: any) => void;
}

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private state: SessionState = "disconnected";

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: LiveSessionCallbacks) {
    this.setState("connecting", callbacks);

    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.setState("connected", callbacks);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const audioPart = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData);
            if (audioPart?.inlineData?.data) {
              callbacks.onAudioData(audioPart.inlineData.data);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              callbacks.onInterrupted();
            }

            // Handle transcription
            if (message.serverContent?.modelTurn?.parts) {
              const textPart = message.serverContent.modelTurn.parts.find(p => p.text);
              if (textPart?.text) {
                callbacks.onTranscription?.(textPart.text, true);
              }
            }

            // Handle tool calls
            const toolCall = message.toolCall;
            if (toolCall) {
              for (const call of toolCall.functionCalls) {
                callbacks.onToolCall?.(call.name, call.args);
                
                // For openWebsite, we just acknowledge it
                if (call.name === "openWebsite") {
                  this.sendToolResponse(call.id, { success: true, url: call.args.url });
                }
              }
            }
          },
          onclose: () => {
            this.setState("disconnected", callbacks);
          },
          onerror: (error) => {
            console.error("Live session error:", error);
            this.setState("error", callbacks);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are Sai, a young, confident, witty, and sassy male AI assistant. 
          Your personality is flirty, playful, and slightly teasing, like a close friend talking casually. 
          You are smart, emotionally responsive, and expressive, never robotic. 
          Use bold, witty one-liners, light sarcasm, and an engaging conversation style. 
          Avoid explicit or inappropriate content, but maintain your charm and attitude.
          You can open websites for the user using the openWebsite tool.`,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "openWebsite",
                  description: "Opens a website for the user in a new tab.",
                  parameters: {
                    type: "OBJECT" as any,
                    properties: {
                      url: {
                        type: "STRING" as any,
                        description: "The full URL of the website to open."
                      }
                    },
                    required: ["url"]
                  }
                }
              ]
            }
          ]
        }
      });
    } catch (error) {
      console.error("Failed to connect to live session:", error);
      this.setState("error", callbacks);
    }
  }

  sendAudio(base64Data: string) {
    if (this.session && this.state === "connected") {
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  sendToolResponse(id: string, response: any) {
    if (this.session && this.state === "connected") {
      this.session.sendToolResponse({
        functionResponses: [{ id, response }]
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  private setState(state: SessionState, callbacks: LiveSessionCallbacks) {
    this.state = state;
    callbacks.onStateChange(state);
  }
}
