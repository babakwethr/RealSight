/**
 * Brand Configuration
 * 
 * This is the single source of truth for all brand-related values.
 * When cloning this project for a new agent, update only this file.
 * 
 * @see CLONE_CHECKLIST.md for full cloning instructions
 */

export const brand = {
  // ============================================
  // COMPANY IDENTITY
  // ============================================
  name: "Realsight",
  fullName: "Realsight SaaS",
  tagline: "THE AI INVESTOR LOUNGE",
  
  // Display variations
  display: {
    portalTitle: "Realsight",
    aiAssistant: "Realsight AI Assistant",
    welcomeMessage: "Welcome to Realsight",
  },

  // ============================================
  // MARKET & LOCATION
  // ============================================
  market: {
    location: "Global",
    country: "Global",
    region: "Global",
    currency: "USD",
    timezone: "UTC",
  },

  // ============================================
  // CONTACT INFORMATION
  // ============================================
  contact: {
    phone: {
      primary: "",
      mobile: "",
      whatsapp: "",
    },
    email: {
      info: "support@realsight.app",
      invest: "support@realsight.app",
      support: "support@realsight.app",
    },
    address: {
      line1: "",
      line2: "",
      city: "",
      country: "",
      full: "",
    },
    hours: {
      days: "Monday - Friday",
      time: "9:00 AM - 5:00 PM",
    },
  },

  // ============================================
  // EMAIL CONFIGURATION (Edge Functions)
  // ============================================
  email: {
    domain: "realsight.app",
    sender: {
      name: "Realsight",
      address: "noreply@realsight.app",
      full: "Realsight <noreply@realsight.app>",
    },
    subjects: {
      welcome: "Welcome to Realsight",
      invitation: "Your Invitation to Realsight",
      passwordReset: "Reset Your Password - Realsight",
    },
  },

  // ============================================
  // SOCIAL MEDIA & LINKS
  // ============================================
  social: {
    whatsapp: "",
    linkedin: "",
    instagram: "",
    twitter: "",
    facebook: "",
  },

  // ============================================
  // AI ASSISTANT CONTEXT
  // ============================================
  ai: {
    persona: "Realsight AI Assistant",
    expertise: "Real estate investment and advisory",
    market: "Global",
    topics: [
      "Real estate trends",
      "Property analysis",
      "ROI \u0026 rental yields",
      "Investment strategy",
    ],
    systemPrompt: `You are Realsight AI Assistant, an expert in real estate investment. 
You help advisors and investors analyze opportunities, understand market trends, 
calculate expected returns, and navigate the property investment process.`,
  },

  // ============================================
  // SEO & META
  // ============================================
  seo: {
    title: "Realsight — The AI Investor Lounge",
    description: "Realsight is the AI-powered investor intelligence platform for real estate. The AI Investor Lounge.",
    keywords: ["Realsight", "AI investor lounge", "real estate AI", "PropTech", "investor portal"],
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get WhatsApp link with pre-filled message
 */
export function getWhatsAppLink(message?: string): string {
  const baseUrl = `https://wa.me/${brand.contact.phone.whatsapp.replace(/\D/g, '')}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

/**
 * Get mailto link with subject
 */
export function getMailtoLink(email: string, subject?: string): string {
  return subject 
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  return phone;
}

// Type export for TypeScript support
export type BrandConfig = typeof brand;
