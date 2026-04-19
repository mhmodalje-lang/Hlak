/**
 * BARBER HUB - Custom Hand-drawn SVG Icons
 * Premium, unique iconography for a luxury brand
 * Stroke-based, gold accent friendly, RTL compatible
 */
import React from 'react';

const defaultProps = (size = 24, className = '', strokeWidth = 1.6) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className,
  'aria-hidden': 'true',
});

/* ============ TOOLS ============ */
export const Shears = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <circle cx="6.5" cy="17" r="3" />
    <circle cx="17.5" cy="17" r="3" />
    <path d="M8.6 14.9l8.3-11.6" />
    <path d="M15.4 14.9L7.1 3.3" />
    <circle cx="12" cy="9" r="0.9" fill="currentColor" />
  </svg>
);

export const Razor = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M3 15l7-7 5 5-7 7z" />
    <path d="M14 7l4-4 3 3-4 4" />
    <path d="M5 17l2 2" />
    <path d="M6 15l1.5 1.5" />
  </svg>
);

export const Comb = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M3 8h18v3H3z" />
    <path d="M5 11v7M8 11v8M11 11v6M14 11v8M17 11v6M20 11v7" />
    <path d="M3 5h18" strokeWidth={strokeWidth * 0.6} opacity="0.5" />
  </svg>
);

export const BarberChair = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M7 8c0-1.7 1.3-3 3-3h4c1.7 0 3 1.3 3 3v4H7V8z" />
    <path d="M5 12h14v4H5z" />
    <path d="M8 16v3M16 16v3" />
    <path d="M7 19h10" />
    <path d="M12 5v2" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
    <circle cx="12" cy="4" r="0.6" fill="currentColor" />
  </svg>
);

export const Mustache = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M2 12c2-3 5-3 6-1 1-1.5 3-1.5 4 0 1-1.5 3-1.5 4 0 1-2 4-2 6 1" />
  </svg>
);

export const Brush = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M9 3h6l-1 7h-4z" />
    <path d="M9 10h6v3H9z" />
    <path d="M10 13l-1 7M12 13v8M14 13l1 7" />
  </svg>
);

export const Perfume = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <rect x="7" y="9" width="10" height="12" rx="2" />
    <path d="M9 9V6h6v3" />
    <path d="M10 4h4" />
    <path d="M20 10l-1 1M21 13l-1.5.5M20 16l-1-.5" strokeWidth={strokeWidth * 0.8} />
  </svg>
);

export const Crown = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M3 8l3 8h12l3-8-4.5 3L12 5 7.5 11z" />
    <path d="M6 18h12" />
    <circle cx="12" cy="5" r="0.8" fill="currentColor" />
    <circle cx="3" cy="8" r="0.8" fill="currentColor" />
    <circle cx="21" cy="8" r="0.8" fill="currentColor" />
  </svg>
);

export const DiamondSparkle = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M12 2l3 6 6 1-4.5 4 1 6.5L12 16l-5.5 3.5 1-6.5L3 9l6-1z" />
    <path d="M12 8v8M8 12h8" strokeWidth={strokeWidth * 0.6} opacity="0.5" />
  </svg>
);

export const Rose = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M12 6c-1 1-1 3 0 4 1-1 1-3 0-4z" />
    <path d="M10 9c-.5.5-.5 2 0 2.5M14 9c.5.5.5 2 0 2.5" />
    <path d="M12 12v8" />
    <path d="M12 15c-2 0-3-1-3-2M12 17c2 0 3-1 3-2" />
  </svg>
);

/* ============ UI ============ */
export const BookCalendar = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
    <path d="M8 3v4M16 3v4" />
    <circle cx="8" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
    <circle cx="16" cy="14" r="1" fill="currentColor" />
    <circle cx="8" cy="18" r="1" fill="currentColor" />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </svg>
);

export const Location = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M12 22s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const Star = ({ size = 24, className = '', strokeWidth = 1.6, filled = false, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} fill={filled ? 'currentColor' : 'none'} {...props}>
    <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z" />
  </svg>
);

export const Heart = ({ size = 24, className = '', strokeWidth = 1.6, filled = false, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} fill={filled ? 'currentColor' : 'none'} {...props}>
    <path d="M12 21s-7-4.5-9-10a5 5 0 019-3 5 5 0 019 3c-2 5.5-9 10-9 10z" />
  </svg>
);

export const AIBrain = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M9 3C6.8 3 5 4.8 5 7v1c-1 .5-2 1.7-2 3s1 2.5 2 3v1c0 2.2 1.8 4 4 4" />
    <path d="M15 3c2.2 0 4 1.8 4 4v1c1 .5 2 1.7 2 3s-1 2.5-2 3v1c0 2.2-1.8 4-4 4" />
    <path d="M9 3v18M15 3v18" />
    <circle cx="7" cy="10" r="0.7" fill="currentColor" />
    <circle cx="12" cy="7" r="0.7" fill="currentColor" />
    <circle cx="17" cy="14" r="0.7" fill="currentColor" />
    <circle cx="12" cy="17" r="0.7" fill="currentColor" />
  </svg>
);

export const ShieldCheck = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const WhatsApp = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M4 21l1.8-5A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4.3-1.2z" />
    <path d="M9 9c0-.5.3-1 1-1h1l1 2.5-1 1c.5 1.2 1.3 2 2.5 2.5l1-1L17 14v1c0 .5-.5 1-1 1-3.3 0-7-3.7-7-7z" />
  </svg>
);

export const PhonePremium = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <rect x="7" y="2" width="10" height="20" rx="2.5" />
    <path d="M11 19h2" />
    <path d="M10 5h4" strokeWidth={strokeWidth * 0.7} opacity="0.5" />
  </svg>
);

export const Search = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.5-4.5" />
  </svg>
);

export const Menu = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M4 7h16M4 12h10M4 17h16" />
  </svg>
);

export const Bell = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M6 8a6 6 0 1112 0v4l2 3H4l2-3V8z" />
    <path d="M10 19a2 2 0 004 0" />
  </svg>
);

export const Clock = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const Price = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M20 12l-8 8-9-9V3h8z" />
    <circle cx="8" cy="8" r="1.5" />
  </svg>
);

export const ArrowRight = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeft = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const Close = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Check = ({ size = 24, className = '', strokeWidth = 1.8, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M5 12l4.5 4.5L19 7" />
  </svg>
);

export const Download = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

export const User = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </svg>
);

export const Logout = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M10 21H5a2 2 0 01-2-2V5a2 2 0 012-2h5" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const Settings = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6v.2a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1A2 2 0 017.1 4l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1A2 2 0 0119.8 6l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </svg>
);

export const Gallery = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8" cy="10" r="1.5" />
    <path d="M21 15l-5-5-11 9" />
  </svg>
);

export const Fire = ({ size = 24, className = '', strokeWidth = 1.6, ...props }) => (
  <svg {...defaultProps(size, className, strokeWidth)} {...props}>
    <path d="M12 22a6 6 0 006-6c0-3-2-4-3-7-1 2-2 3-4 3.5-1 .2-3 0-3-2-2 2-2 4-2 5.5a6 6 0 006 6z" />
  </svg>
);

export default {
  Shears, Razor, Comb, BarberChair, Mustache, Brush, Perfume, Crown, DiamondSparkle, Rose,
  BookCalendar, Location, Star, Heart, AIBrain, ShieldCheck, WhatsApp, PhonePremium, Search, Menu,
  Bell, Clock, Price, ArrowRight, ArrowLeft, Close, Check, Download, User, Logout, Settings, Gallery, Fire,
};
