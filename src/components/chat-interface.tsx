"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useAgent } from "@/app/hooks/useAgent";
import ReactMarkdown from "react-markdown";
import Typed from "typed.js";
import Image from "next/image";

export function ChatInterface() {
  const [inputValue, setInputValue] = useState("");
  const [isInitial, setIsInitial] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isThinking } = useAgent();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (titleRef.current && isInitial) {
      const typed = new Typed(titleRef.current, {
        strings: ["gm fren. what's the move?"],
        typeSpeed: 40,
        cursorChar: "▋",
        showCursor: false,
        onComplete: () => {
          if (titleRef.current) {
            titleRef.current.classList.add("terminal-text");
          }
        },
      });

      return () => {
        typed.destroy();
      };
    }
  }, [isInitial]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    setInputValue("");
    setIsInitial(false);

    // Send message to agent
    await sendMessage(inputValue);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] binary-pattern">
      {isInitial ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-70 h-16 rounded border border-primary/50 bg-background flex items-center justify-center overflow-hidden mb-2">
            <Image src="/logo-square.jpg" alt="Agent 9000 Logo" width={1000} height={1000} className="object-cover" />
          </div>
          <h1 ref={titleRef} className="text-4xl font-mono mb-8 text-center">
            gm fren. what's the move?
          </h1>
          <div className="w-full max-w-2xl">
            <form onSubmit={handleSendMessage} className="relative">
              <Input
                type="text"
                placeholder="Explain like I'm Vitalik..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full h-14 pl-6 pr-16 text-lg font-mono bg-muted/50 border-primary/20 focus:border-primary/50"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-2 h-10 w-10 rounded-sm bg-primary hover:bg-primary/90"
                disabled={isThinking}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-sm px-4 py-2 font-mono text-lg ${
                      message.sender === "user"
                        ? "bg-primary/20 border border-primary/30 text-foreground"
                        : "bg-muted/50 border border-muted text-foreground flex items-center gap-3"
                    }`}
                  >
                    {message.sender === "agent" && (
                      <div className="w-8 h-8 rounded border border-primary/50 bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
                        <Image
                          src="/logo-square.jpg"
                          alt="Agent 9000 Logo"
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="terminal-text">{children}</p>,
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                      <p
                        className={`text-sm mt-1 ${
                          message.sender === "user" ? "text-primary/70" : "text-muted-foreground"
                        }`}
                      >
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-muted text-foreground max-w-[80%] rounded-sm px-4 py-2 font-mono flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-primary/50 bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Image
                        src="/logo-square.jpg"
                        alt="Agent 9000 Logo"
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex items-center">
                      {/* <span>Thinking</span> */}
                      <span className="inline-flex ml-[2px]">
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t border-border/50 p-4">
            <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto relative">
              <Input
                type="text"
                placeholder=""
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full h-12 pl-6 pr-16 text-lg font-mono bg-muted/50 border-primary/20 focus:border-primary/50"
                disabled={isThinking}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-1 h-10 w-10 rounded-sm bg-primary hover:bg-primary/90"
                disabled={isThinking}
              >
                {isThinking ? (
                  <div className="h-4 w-4 animate-spin rounded-[50%] border-2 border-primary border-t-transparent" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
