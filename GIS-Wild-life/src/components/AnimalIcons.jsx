import React from 'react';

// Single-Color Accurate Vector Animal & Facility SVGs (Inherits currentColor)

export const TigerIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Tiger Head Profile & Stripes */}
    <path d="M4 8c-1-3 1-5 3-5 1.5 0 2.5 1 3 2 1.5-.5 3-.5 4.5 0 .5-1 1.5-2 3-2 2 0 4 2 3 5 .5 1.5.5 3 0 4.5-1 3-3.5 5.5-6.5 6.5l-1.5 1-1.5-1C7.5 18 5 15.5 4 12.5c-.5-1.5-.5-3 0-4.5z" />
    <path d="M9 10h.01" />
    <path d="M15 10h.01" />
    <path d="M10 14c1 1 3 1 4 0" />
    <path d="M12 11v2" />
    <path d="M6 7l3 2" />
    <path d="M18 7l-3 2" />
    <path d="M7 13l2-1" />
    <path d="M17 13l-2-1" />
  </svg>
);

export const LeopardIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Leopard Stalking Cat Silhouette */}
    <circle cx="9" cy="6" r="1" fill="currentColor" />
    <circle cx="15" cy="6" r="1" fill="currentColor" />
    <path d="M5 11c-.5-2 0-4 1.5-5.5C8 4 10.5 4 12 5c1.5-1 4-1 5.5.5 1.5 1.5 2 3.5 1.5 5.5-.5 2.5-2 5-5 6.5l-2 1-2-1c-3-1.5-4.5-4-5-6.5z" />
    <path d="M7 3L5 6" />
    <path d="M17 3l2 3" />
    <circle cx="8" cy="11" r="0.8" fill="currentColor" />
    <circle cx="16" cy="11" r="0.8" fill="currentColor" />
    <circle cx="12" cy="9" r="0.8" fill="currentColor" />
    <path d="M10 14c1 .8 3 .8 4 0" />
  </svg>
);

export const BearIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Sloth Bear Head with Rounded Ears & Snout */}
    <circle cx="5" cy="6" r="2.5" />
    <circle cx="19" cy="6" r="2.5" />
    <path d="M12 21c4.5 0 8-3.5 8-8 0-3-1.5-5.5-4-7-1.2-.7-2.6-1-4-1s-2.8.3-4 1c-2.5 1.5-4 4-4 7 0 4.5 3.5 8 8 8z" />
    <ellipse cx="12" cy="15" rx="3.5" ry="2.5" />
    <path d="M11 14h2" />
    <circle cx="9" cy="10.5" r="1" fill="currentColor" />
    <circle cx="15" cy="10.5" r="1" fill="currentColor" />
  </svg>
);

export const DeerIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Deer / Antelope Head with Antlers */}
    <path d="M6 3l3 4-2 2" />
    <path d="M5 5l2 1" />
    <path d="M18 3l-3 4 2 2" />
    <path d="M19 5l-2 1" />
    <path d="M9 11c-.5-1.5 0-3 1-4 1-1 2.5-1 4 0 1 1 1.5 2.5 1 4-.5 2-1.5 4.5-3 6.5l-.5.5-.5-.5c-1.5-2-2.5-4.5-3-6.5z" />
    <circle cx="10.5" cy="10.5" r="0.8" fill="currentColor" />
    <circle cx="13.5" cy="10.5" r="0.8" fill="currentColor" />
    <path d="M11 14.5h2" />
  </svg>
);
