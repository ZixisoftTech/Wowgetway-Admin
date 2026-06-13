import React from 'react';

// Modern, minimalist vector illustration representing Check-in Receptionist/Key Desk
export function CheckinIllustration() {
  return (
    <svg 
      width="64" 
      height="64" 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-14 h-14 group-hover:scale-105 transition-transform duration-300 flex-shrink-0"
    >
      <defs>
        <linearGradient id="checkinGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF" />
          <stop offset="100%" stopColor="#FFE4E6" />
        </linearGradient>
        <linearGradient id="primaryAccent" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      
      {/* Background soft disk */}
      <circle cx="32" cy="32" r="28" fill="url(#checkinGrad)" stroke="#FFE4E6" strokeWidth="1.5" />
      
      {/* Front Desk / counter ledge */}
      <path d="M16 44H48" stroke="#FDA4AF" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Reception bell */}
      <path d="M26 44C26 38.5 38 38.5 38 44H26Z" fill="url(#primaryAccent)" />
      <circle cx="32" cy="36" r="2.5" fill="#FFF" />
      <rect x="31" y="33" width="2" height="3" fill="#FFF" />
      
      {/* Little check-in card */}
      <rect x="36" y="22" width="14" height="18" rx="2" fill="#FFF" stroke="#E11D48" strokeWidth="1.5" transform="rotate(10 43 31)" />
      <path d="M40 28H46M40 32H44" stroke="#FDA4AF" strokeWidth="1.5" strokeLinecap="round" transform="rotate(10 43 31)" />
      
      {/* Checkmark badge */}
      <circle cx="48" cy="20" r="6.5" fill="#10B981" />
      <path d="M46 20L47.5 21.5L50 18.5" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Modern, minimalist vector illustration representing Key drop/check-out
export function CheckoutIllustration() {
  return (
    <svg 
      width="64" 
      height="64" 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-14 h-14 group-hover:scale-105 transition-transform duration-300 flex-shrink-0"
    >
      <defs>
        <linearGradient id="checkoutGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF" />
          <stop offset="100%" stopColor="#FFEDD5" />
        </linearGradient>
        <linearGradient id="orangeAccent" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      
      {/* Background soft disk */}
      <circle cx="32" cy="32" r="28" fill="url(#checkoutGrad)" stroke="#FFEDD5" strokeWidth="1.5" />
      
      {/* Key illustration */}
      <path 
        d="M22 38L27 33M27 33L25 31M27 33L29 35" 
        stroke="url(#orangeAccent)" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="36" cy="28" r="6" stroke="url(#orangeAccent)" strokeWidth="2.5" />
      <circle cx="36" cy="28" r="2" fill="#EA580C" />
      
      {/* Key tag */}
      <rect x="36" y="32" width="12" height="18" rx="2" fill="#FFF" stroke="#EA580C" strokeWidth="1.5" transform="rotate(-15 42 41)" />
      <circle cx="42" cy="37" r="1.5" fill="#EA580C" transform="rotate(-15 42 41)" />
      
      {/* Exit Door outline */}
      <path d="M16 20V44H24" stroke="#FED7AA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
