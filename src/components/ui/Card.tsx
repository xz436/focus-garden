"use client";

import { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export default function Card({ children, className = "", style, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-2xl border border-card-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
