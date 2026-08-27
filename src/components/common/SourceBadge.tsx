"use client";

import React from "react";
import {
  Send,
  Users,
  Briefcase,
  Video,
  PhoneCall,
  Globe,
  HelpCircle,
} from "lucide-react";
import { SOURCE_CONFIG } from "@/types";

interface SourceBadgeProps {
  source: string;
  sourceDetails?: string | null;
  showDetails?: boolean;
  size?: "sm" | "md";
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function SourceBadge({
  source,
  sourceDetails,
  showDetails = false,
  size = "sm",
}: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.OTHER;

  const renderIcon = () => {
    const iconClass = size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0";
    switch (source) {
      case "FACEBOOK":
        return <FacebookIcon className={iconClass} />;
      case "INSTAGRAM":
        return <InstagramIcon className={iconClass} />;
      case "TELEGRAM":
        return <Send className={iconClass} />;
      case "REFERRAL":
        return <Users className={iconClass} />;
      case "INDEED":
        return <Briefcase className={iconClass} />;
      case "TIKTOK":
        return <Video className={iconClass} />;
      case "DIRECT_CALL":
        return <PhoneCall className={iconClass} />;
      case "WEBSITE":
        return <Globe className={iconClass} />;
      default:
        return <HelpCircle className={iconClass} />;
    }
  };

  return (
    <div className="inline-flex flex-col sm:flex-row sm:items-center gap-1 whitespace-nowrap">
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md border shrink-0 whitespace-nowrap ${config.bg} ${config.text} ${config.border} ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
        }`}
        title={`Lead source: ${config.label}${sourceDetails ? ` (${sourceDetails})` : ""}`}
      >
        {renderIcon()}
        <span>{config.label}</span>
      </span>
      {showDetails && sourceDetails && (
        <span
          className="text-xs text-zinc-500 font-medium truncate max-w-[170px]"
          title={sourceDetails}
        >
          • {sourceDetails}
        </span>
      )}
    </div>
  );
}
