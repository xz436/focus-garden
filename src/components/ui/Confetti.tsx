"use client";

import { useEffect, useState } from "react";

const COLORS = ["#22c55e", "#f59e0b", "#ec4899", "#10b981", "#ef4444", "#a855f7", "#3b82f6"];

interface ConfettiPiece {
  id: number;
  left: string;
  color: string;
  delay: string;
  size: number;
  shape: "square" | "circle" | "strip";
}

let triggerConfettiFn: (() => void) | null = null;

export function triggerConfetti() {
  if (triggerConfettiFn) triggerConfettiFn();
}

export default function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    triggerConfettiFn = () => {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: Date.now() + i,
        left: `${Math.random() * 100}%`,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: `${Math.random() * 1}s`,
        size: 6 + Math.random() * 8,
        shape: (["square", "circle", "strip"] as const)[Math.floor(Math.random() * 3)],
      }));
      setPieces(newPieces);
      setTimeout(() => setPieces([]), 4000);
    };
    return () => {
      triggerConfettiFn = null;
    };
  }, []);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[150]">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            top: "-10px",
            width: piece.shape === "strip" ? piece.size * 0.4 : piece.size,
            height: piece.shape === "strip" ? piece.size * 1.5 : piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.shape === "circle" ? "50%" : piece.shape === "strip" ? "2px" : "1px",
            animationDelay: piece.delay,
          }}
        />
      ))}
    </div>
  );
}
