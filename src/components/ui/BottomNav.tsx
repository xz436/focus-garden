"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN_NAV = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/timer", label: "Timer", icon: "⏱️" },
  { href: "/blind75", label: "Blind 75", icon: "💻" },
  { href: "/garden", label: "Garden", icon: "🌱" },
];

const MORE_ITEMS = [
  { href: "/plan", label: "Daily Plan", icon: "📝" },
  { href: "/baby", label: "Baby Activities", icon: "🌷" },
  { href: "/summary", label: "Summary", icon: "📊" },
  { href: "/review", label: "Weekly Review", icon: "📅" },
  { href: "/trends", label: "Trends", icon: "📈" },
  { href: "/stats", label: "Stats & Streaks", icon: "🔥" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Don't show nav on landing page or onboarding
  if (pathname === "/" || pathname === "/onboarding") return null;

  const isMoreActive = MORE_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href)
  );

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More menu popup */}
      {showMore && (
        <div className="fixed bottom-16 right-2 z-50 w-52 rounded-2xl bg-card border border-card-border shadow-xl p-2 animate-fade-in">
          {MORE_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? "bg-gray-100 dark:bg-gray-700 font-semibold"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-card-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-around py-2">
          {MAIN_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-all ${
                  isActive
                    ? "text-foreground font-semibold scale-105"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span className={`text-xl ${isActive ? "animate-pulse-soft" : ""}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs transition-all ${
              isMoreActive || showMore
                ? "text-foreground font-semibold scale-105"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className={`text-xl ${isMoreActive ? "animate-pulse-soft" : ""}`}>
              •••
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
