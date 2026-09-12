import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Rocket,
  Coins,
  Globe,
  Zap,
  TrendingUp,
  Layers,
  Bot,
  HelpCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { CurrencyCode, SUPPORTED_CURRENCIES } from "../../utils/currency";
import { ModalOverlay } from "../common/ModalOverlay";

export interface OnboardingData {
  firstName: string;
  lastName: string;
  currency: CurrencyCode;
}

const ONBOARDING_STORAGE_KEY = "mansa-onboarding-profile";
export const TOUR_COMPLETED_STORAGE_KEY = "mansa_creator_tour_completed";
export const LEGACY_TOUR_COMPLETED_STORAGE_KEY = "whop_creator_tour_completed";

export type TourContext =
  | "accueil"
  | "produits"
  | "paiements"
  | "clients"
  | "communaute"
  | "decouvrir"
  | "applications"
  | "telegram_app"
  | "discord_app"
  | "parametres_entreprise"
  | "affilies"
  | "assistance"
  | "projets";

export function getTourCompletedStorageKey(context: string): string {
  return `mansa_tour_completed_${context}`;
}

export function isCreatorTourCompleted(): boolean {
  if (typeof window === "undefined") return false;
  let val = localStorage.getItem(TOUR_COMPLETED_STORAGE_KEY);
  if (!val) {
    val = localStorage.getItem(LEGACY_TOUR_COMPLETED_STORAGE_KEY);
    if (val === "true") {
      localStorage.setItem(TOUR_COMPLETED_STORAGE_KEY, "true");
    }
  }
  return val === "true";
}
const CURRENCY_OPTIONS = Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[];

export interface TourStep {
  id: string;
  targetSelector: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  icon: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "center";
  targetTab?: string;
  highlightPadding?: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "step-workspaces",
    targetSelector: "#tour-workspace-switcher",
    titleFr: "Vos espaces de travail",
    titleEn: "Your workspaces",
    descriptionFr: "Passez de votre espace personnel à l'une de vos entreprises. Le bouton + permet de créer une nouvelle entreprise.",
    descriptionEn: "Switch between your personal space and your companies. The + button creates a new company.",
    icon: <Layers className="size-5 text-cyan-400" />,
    position: "bottom",
    targetTab: "accueil",
    highlightPadding: 8,
  },
  {
    id: "step-balance",
    targetSelector: "#tour-balance-chart",
    titleFr: "Solde & Encaissements en temps réel",
    titleEn: "Real-time Balance & Payouts",
    descriptionFr:
      "Suivez vos revenus nets en direct, consultez la courbe de croissance financière et transférez vos fonds vers votre compte bancaire via Stripe Connect.",
    descriptionEn:
      "Track your net revenue in real-time, view your growth curve, and transfer earnings to your bank account via Stripe Connect.",
    icon: <Coins className="size-5 text-[#00D26A]" />,
    position: "bottom",
    targetTab: "accueil",
    highlightPadding: 12,
  },
  {
    id: "step-currency",
    targetSelector: "#tour-currency-selector",
    titleFr: "Affichage Multi-Devises (USD, EUR, FCFA...)",
    titleEn: "Multi-Currency Display (USD, EUR, XAF...)",
    descriptionFr:
      "Basculez instantanément l'ensemble de votre tableau de bord dans votre devise favorite avec actualisation automatique des taux de change.",
    descriptionEn:
      "Instantly switch your entire dashboard display into your preferred currency with real-time exchange rates.",
    icon: <Globe className="size-5 text-teal-400" />,
    position: "bottom",
    targetTab: "accueil",
    highlightPadding: 8,
  },
  {
    id: "step-pulse",
    targetSelector: "#tour-pulse-feed",
    titleFr: "Pouls & Activités en Direct",
    titleEn: "Pulse & Live Network Feed",
    descriptionFr:
      "Visualisez en continu les ventes, ad spend et transactions qui animent le réseau mondial des créateurs Mansa.",
    descriptionEn:
      "Watch live sales, advertising spend, and community transactions happening across the global Mansa network.",
    icon: <Zap className="size-5 text-amber-400" />,
    position: "left",
    targetTab: "accueil",
    highlightPadding: 10,
  },
  {
    id: "step-analytics",
    targetSelector: "#tour-revenue-analytics",
    titleFr: "Analyses de Revenus & Export CSV",
    titleEn: "Revenue Analytics & CSV Export",
    descriptionFr:
      "Analysez vos ventes par produit (Discord, Notion, Masterclass, SaaS), comparez vos performances journalières et téléchargez vos rapports en CSV.",
    descriptionEn:
      "Analyze your sales by product category, compare daily performance, and export detailed CSV reports for your accounting.",
    icon: <TrendingUp className="size-5 text-emerald-400" />,
    position: "top",
    targetTab: "accueil",
    highlightPadding: 12,
  },
  {
    id: "step-sidebar",
    targetSelector: "#tour-sidebar-navigation",
    titleFr: "Menu de Gestion & Espaces de Travail",
    titleEn: "Management Menu & Workspaces",
    descriptionFr:
      "Accédez à vos produits, clients, passerelles de paiement, affiliés et entreprises en ligne depuis cette barre latérale dédiée.",
    descriptionEn:
      "Access your products, customers, payout gateways, affiliate program, and storefronts from this sidebar.",
    icon: <Layers className="size-5 text-cyan-400" />,
    position: "right",
    targetTab: "accueil",
    highlightPadding: 8,
  },
  {
    id: "step-ai",
    targetSelector: "#tour-ai-sparkles",
    titleFr: "Assistant IA & Mansa Automation",
    titleEn: "AI Assistant & Mansa Automation",
    descriptionFr:
      "Générez vos offres, rédigez vos pages de vente à fort taux de conversion et automatisez vos processus créateur grâce à l'IA.",
    descriptionEn:
      "Generate new offers, write high-converting sales copies, and automate creator workflows using built-in AI tools.",
    icon: <Bot className="size-5 text-[#00D26A]" />,
    position: "bottom",
    targetTab: "accueil",
    highlightPadding: 8,
  },
];

const PAGE_TOUR_STEPS: Record<Exclude<TourContext, "accueil">, TourStep[]> = {
  produits: [
    { id: "products-header", targetSelector: "#tour-products-header", titleFr: "Votre catalogue de produits", titleEn: "Your product catalog", descriptionFr: "Créez, publiez et gérez vos offres numériques depuis cet espace.", descriptionEn: "Create, publish, and manage your digital offers here.", icon: <Layers className="size-5 text-[#00D26A]" />, position: "bottom", targetTab: "produits" },
    { id: "products-create", targetSelector: "#tour-products-create", titleFr: "Créer une offre", titleEn: "Create an offer", descriptionFr: "Ouvrez le Studio Produit pour définir le prix, la facturation et les fonctionnalités Telegram ou Discord.", descriptionEn: "Open Product Studio to define pricing, billing, and Telegram or Discord features.", icon: <Sparkles className="size-5 text-[#00D26A]" />, position: "bottom", targetTab: "produits" },
    { id: "products-table", targetSelector: "#tour-products-table", titleFr: "Suivre vos produits", titleEn: "Manage your products", descriptionFr: "Consultez la visibilité, copiez le lien public et modifiez vos offres depuis le tableau.", descriptionEn: "Review visibility, copy public links, and edit offers from the table.", icon: <TrendingUp className="size-5 text-emerald-400" />, position: "top", targetTab: "produits" },
  ],
  paiements: [
    { id: "payments-page", targetSelector: "#tour-payments-page", titleFr: "Paiements et trésorerie", titleEn: "Payments and treasury", descriptionFr: "Retrouvez vos encaissements, transactions et indicateurs de trésorerie au même endroit.", descriptionEn: "Review collections, transactions, and treasury indicators in one place.", icon: <Coins className="size-5 text-[#00D26A]" />, position: "bottom", targetTab: "paiements" },
  ],
  clients: [
    { id: "clients-page", targetSelector: "#tour-clients-page", titleFr: "Clients et membres", titleEn: "Customers and members", descriptionFr: "Recherchez vos clients, consultez leurs achats et suivez leurs abonnements.", descriptionEn: "Search customers, review purchases, and track subscriptions.", icon: <Layers className="size-5 text-blue-400" />, position: "bottom", targetTab: "clients" },
  ],
  communaute: [
    { id: "community-header", targetSelector: "#tour-community-page", titleFr: "Votre espace communauté", titleEn: "Your community space", descriptionFr: "Retrouvez l'identité de l'entreprise, ses accès et les fonctionnalités disponibles pour votre abonnement.", descriptionEn: "Review the company identity, access, and features included in your membership.", icon: <Globe className="size-5 text-[#00D26A]" />, position: "bottom", targetTab: "communaute" },
    { id: "community-products", targetSelector: "#tour-community-products", titleFr: "Produits et fonctionnalités", titleEn: "Products and features", descriptionFr: "Les éléments verrouillés peuvent être sélectionnés pour ouvrir directement la page de l'offre correspondante.", descriptionEn: "Locked items can be selected to open the corresponding offer page.", icon: <Layers className="size-5 text-amber-400" />, position: "right", targetTab: "communaute" },
  ],
  decouvrir: [
    { id: "discover-page", targetSelector: "#tour-discover-page", titleFr: "Découvrir les entreprises", titleEn: "Discover companies", descriptionFr: "Explorez les entreprises, comparez leurs offres et visitez une communauté avant de la rejoindre.", descriptionEn: "Explore companies, compare offers, and visit a community before joining.", icon: <Globe className="size-5 text-cyan-400" />, position: "bottom", targetTab: "decouvrir" },
  ],
  applications: [
    { id: "apps-page", targetSelector: "#tour-applications-page", titleFr: "Applications connectées", titleEn: "Connected applications", descriptionFr: "Gérez les applications utilisées par votre espace et ajoutez de nouvelles intégrations.", descriptionEn: "Manage apps used by your workspace and add new integrations.", icon: <Bot className="size-5 text-[#00D26A]" />, position: "bottom", targetTab: "applications" },
  ],
  telegram_app: [
    { id: "telegram-page", targetSelector: "#tour-telegram-page", titleFr: "Automatisation Telegram", titleEn: "Telegram automation", descriptionFr: "Configurez le bot, les canaux et les accès automatiques associés à vos produits.", descriptionEn: "Configure the bot, channels, and automatic access linked to your products.", icon: <Zap className="size-5 text-sky-400" />, position: "bottom", targetTab: "telegram_app" },
  ],
  discord_app: [
    { id: "discord-page", targetSelector: "#tour-discord-page", titleFr: "Automatisation Discord", titleEn: "Discord automation", descriptionFr: "Connectez votre serveur et automatisez les rôles et invitations des membres.", descriptionEn: "Connect your server and automate member roles and invitations.", icon: <Bot className="size-5 text-indigo-400" />, position: "bottom", targetTab: "discord_app" },
  ],
  parametres_entreprise: [
    { id: "company-settings-page", targetSelector: "#tour-company-settings-page", titleFr: "Paramètres de l'entreprise", titleEn: "Company settings", descriptionFr: "Définissez le nom, l'identité visuelle, la description et les informations visibles par vos membres.", descriptionEn: "Set the name, visual identity, description, and information visible to members.", icon: <Layers className="size-5 text-emerald-400" />, position: "bottom", targetTab: "parametres_entreprise" },
  ],
  affilies: [
    { id: "affiliates-page", targetSelector: "#tour-affiliates-page", titleFr: "Programme d'affiliation", titleEn: "Affiliate program", descriptionFr: "Activez vos commissions et suivez les ventes générées par vos partenaires.", descriptionEn: "Set commissions and track sales generated by partners.", icon: <TrendingUp className="size-5 text-amber-400" />, position: "bottom", targetTab: "affilies" },
  ],
  assistance: [
    { id: "support-page", targetSelector: "#tour-support-page", titleFr: "Assistance", titleEn: "Support", descriptionFr: "Centralisez les demandes de vos clients et répondez depuis un espace unique.", descriptionEn: "Centralize customer requests and respond from one workspace.", icon: <HelpCircle className="size-5 text-blue-400" />, position: "bottom", targetTab: "assistance" },
  ],
  projets: [
    { id: "projects-page", targetSelector: "#tour-projects-page", titleFr: "Projets et communautés", titleEn: "Projects and communities", descriptionFr: "Organisez vos projets, communautés et offres numériques depuis cet espace.", descriptionEn: "Organize your projects, communities, and digital offers here.", icon: <Sparkles className="size-5 text-[#00D26A]" />, position: "bottom", targetTab: "projets" },
  ],
};

export function getTourSteps(context: TourContext): TourStep[] {
  return context === "accueil" ? TOUR_STEPS : PAGE_TOUR_STEPS[context];
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: string) => void;
  lang?: "fr" | "en";
  onCompleteTour?: () => void;
  onOnboardingComplete?: (data: OnboardingData) => void;
  tourId?: TourContext;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  lang = "fr",
  onCompleteTour,
  onOnboardingComplete,
  tourId = "accueil" as TourContext,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingData>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<OnboardingData>;
          if (
            typeof parsed.firstName === "string" &&
            typeof parsed.lastName === "string" &&
            parsed.currency &&
            parsed.currency in SUPPORTED_CURRENCIES
          ) {
            return {
              firstName: parsed.firstName,
              lastName: parsed.lastName,
              currency: parsed.currency as CurrencyCode,
            };
          }
        }
      } catch {
        // Ignore malformed local onboarding data and use the defaults.
      }
    }

    return { firstName: "", lastName: "", currency: "USD" };
  });
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const highlightRequestRef = useRef(0);
  const highlightFrameRef = useRef<number | null>(null);

  const steps = getTourSteps(tourId);
  const step = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setIsCompletedModalOpen(false);
      setOnboardingError(null);
    }
  }, [isOpen, tourId]);

  // Switch tab if target step requires a specific tab
  useEffect(() => {
    if (isOpen && step?.targetTab && onSelectTab) {
      onSelectTab(step.targetTab);
    }
  }, [isOpen, currentStepIndex, step?.targetTab, onSelectTab]);

  // Measure targets in viewport coordinates because the overlay is position: fixed.
  // The active tab uses a short skeleton transition, so the first measurement must
  // happen after the DOM has settled. We also use an instant scroll to avoid reading
  // an intermediate rectangle while a smooth scroll is still running.
  const updateHighlight = useCallback(() => {
    const requestId = ++highlightRequestRef.current;

    if (highlightFrameRef.current !== null) {
      cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }

    if (!isOpen || isCompletedModalOpen || !step) {
      setHighlightRect(null);
      return;
    }

    const targetEl = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!targetEl || !targetEl.isConnected) {
      setHighlightRect(null);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const isPartiallyOffscreen =
      rect.top < 70 || rect.bottom > window.innerHeight - 20 || rect.left < 0 || rect.right > window.innerWidth;

    if (isPartiallyOffscreen) {
      targetEl.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }

    // Let the active tab, its scroll container, and layout settle. The request
    // token prevents an older scroll event from overwriting the current step.
    highlightFrameRef.current = requestAnimationFrame(() => {
      highlightFrameRef.current = requestAnimationFrame(() => {
        highlightFrameRef.current = null;
        if (requestId !== highlightRequestRef.current) return;

        const updatedRect = targetEl.getBoundingClientRect();
        if (updatedRect.width === 0 || updatedRect.height === 0) {
          setHighlightRect(null);
          return;
        }

        const padding = step.highlightPadding || 8;
        setHighlightRect({
          top: updatedRect.top - padding,
          left: updatedRect.left - padding,
          width: updatedRect.width + padding * 2,
          height: updatedRect.height + padding * 2,
          visible: true,
        });
      });
    });
  }, [isOpen, isCompletedModalOpen, step]);

  // Recalculate after the tab transition, then keep the fixed overlay aligned
  // with the same viewport coordinates on resize and on either scroll container.
  useEffect(() => {
    if (!isOpen) return;

    const initialTimer = window.setTimeout(updateHighlight, 450);
    const settlingTimer = window.setTimeout(updateHighlight, 700);
    const handleResize = () => updateHighlight();
    const handleScroll = () => updateHighlight();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(settlingTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, currentStepIndex, updateHighlight]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (isLastStep) {
      setIsCompletedModalOpen(true);
      localStorage.setItem(getTourCompletedStorageKey(tourId), "true");
      if (onCompleteTour) onCompleteTour();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(getTourCompletedStorageKey(tourId), "true");
    onClose();
  };

  const handleFinishAll = () => {
    const firstName = onboarding.firstName.trim();
    const lastName = onboarding.lastName.trim();

    if (!firstName || !lastName) {
      setOnboardingError(
        lang === "fr" ? "Renseignez votre prénom et votre nom pour continuer." : "Enter your first and last name to continue."
      );
      return;
    }

    const data: OnboardingData = {
      firstName,
      lastName,
      currency: onboarding.currency,
    };

    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(TOUR_COMPLETED_STORAGE_KEY, "true");
    onOnboardingComplete?.(data);
    setIsCompletedModalOpen(false);
    onClose();
  };

  const handleRestart = () => {
    setIsCompletedModalOpen(false);
    setCurrentStepIndex(0);
  };

  if (!isOpen) return null;

  // Calculate tooltip placement styles
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect || !highlightRect.visible) {
      // Center placement fallback
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "460px",
        width: "90vw",
        zIndex: 10001,
      };
    }

    const margin = 14;
    const tooltipWidth = Math.min(420, window.innerWidth - 32);
    let top = 0;
    let left = 0;

    const pos = step.position || "bottom";

    if (pos === "bottom") {
      top = highlightRect.top + highlightRect.height + margin;
      left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;

      // Bound check vertical
      if (top + 220 > window.innerHeight) {
        top = Math.max(20, highlightRect.top - 240);
      }
    } else if (pos === "top") {
      top = highlightRect.top - 230;
      left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;

      if (top < 70) {
        top = highlightRect.top + highlightRect.height + margin;
      }
    } else if (pos === "right") {
      top = highlightRect.top + highlightRect.height / 2 - 100;
      left = highlightRect.left + highlightRect.width + margin;

      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 20;
      }
    } else if (pos === "left") {
      top = highlightRect.top + highlightRect.height / 2 - 100;
      left = highlightRect.left - tooltipWidth - margin;

      if (left < 20) {
        left = 20;
      }
    }

    // Horizontal bound checks
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    // Clamp top within viewport
    if (top < 70) top = 70;
    if (top > window.innerHeight - 260) top = window.innerHeight - 260;

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 10001,
    };
  };

  const spotlightPanels = highlightRect && highlightRect.visible
    ? (() => {
        // All measurements are viewport-relative (getBoundingClientRect), just like
        // the fixed overlay. Four panels leave a true transparent hole in the middle:
        // unlike backdrop-filter on a full-screen element, no blur can reach the target.
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const left = Math.max(0, Math.min(viewportWidth, highlightRect.left));
        const top = Math.max(0, Math.min(viewportHeight, highlightRect.top));
        const right = Math.max(left, Math.min(viewportWidth, highlightRect.left + highlightRect.width));
        const bottom = Math.max(top, Math.min(viewportHeight, highlightRect.top + highlightRect.height));
        const middleHeight = Math.max(0, bottom - top);

        return [
          { top: 0, left: 0, width: viewportWidth, height: top },
          { top: bottom, left: 0, width: viewportWidth, height: Math.max(0, viewportHeight - bottom) },
          { top, left: 0, width: left, height: middleHeight },
          { top, left: right, width: Math.max(0, viewportWidth - right), height: middleHeight },
        ];
      })()
    : null;

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-auto">
      {/* 1. Backdrop split into panels so the spotlight hole stays sharp */}
      {spotlightPanels ? (
        spotlightPanels.map((panel, index) => (
          <div
            key={index}
            className="absolute bg-black/75 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
            style={{
              top: `${panel.top}px`,
              left: `${panel.left}px`,
              width: `${panel.width}px`,
              height: `${panel.height}px`,
            }}
          />
        ))
      ) : (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto" />
      )}

      {/* The cutout itself has no backdrop-filter and is therefore completely sharp. */}
      {highlightRect && highlightRect.visible && (
        <div
          className="absolute rounded-2xl transition-all duration-300 pointer-events-none"
          style={{
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
            border: "2px solid rgba(0, 210, 106, 0.8)",
            boxShadow: "0 0 25px 2px rgba(0, 210, 106, 0.45)",
          }}
        >
          {/* Animated Pulse Border */}
          <span className="absolute -inset-1 rounded-2xl border border-[#00D26A]/40 animate-ping opacity-40" />
        </div>
      )}

      {/* 2. Completion Modal if finished */}
      {isCompletedModalOpen ? (
        <ModalOverlay
          isOpen={isCompletedModalOpen}
          onClose={handleFinishAll}
          contentClassName="max-w-md mx-auto"
        >
          <div className="w-full rounded-2xl border border-white/10 bg-[#141519] p-6 shadow-2xl space-y-5 text-center relative">
            <button
              onClick={handleFinishAll}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#00D26A]/15 border border-[#00D26A]/40 text-[#00D26A]">
              <Rocket className="size-8 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">
                Bienvenue sur Mansa
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Finalisez votre profil pour personnaliser votre espace créateur.
              </p>
            </div>

            {/* Onboarding profile form */}
            <div className="space-y-3 text-left pt-1">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Prénom
                  </span>
                  <input
                    type="text"
                    value={onboarding.firstName}
                    onChange={(event) => {
                      setOnboardingError(null);
                      setOnboarding((current) => ({ ...current, firstName: event.target.value }));
                    }}
                    placeholder="Johan"
                    autoComplete="given-name"
                    className="w-full rounded-xl border border-white/10 bg-[#0b0c0f] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#00D26A]/70 focus:ring-1 focus:ring-[#00D26A]/30"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Nom
                  </span>
                  <input
                    type="text"
                    value={onboarding.lastName}
                    onChange={(event) => {
                      setOnboardingError(null);
                      setOnboarding((current) => ({ ...current, lastName: event.target.value }));
                    }}
                    placeholder="Désiré"
                    autoComplete="family-name"
                    className="w-full rounded-xl border border-white/10 bg-[#0b0c0f] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#00D26A]/70 focus:ring-1 focus:ring-[#00D26A]/30"
                  />
                </label>
              </div>

              <label className="space-y-1.5 block">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Devise principale
                </span>
                <div className="relative">
                  <Coins className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#00D26A]" />
                  <select
                    value={onboarding.currency}
                    onChange={(event) => {
                      setOnboardingError(null);
                      setOnboarding((current) => ({
                        ...current,
                        currency: event.target.value as CurrencyCode,
                      }));
                    }}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0b0c0f] px-10 py-2.5 text-xs text-white outline-none transition-colors focus:border-[#00D26A]/70 focus:ring-1 focus:ring-[#00D26A]/30"
                  >
                    {CURRENCY_OPTIONS.map((code) => {
                      const config = SUPPORTED_CURRENCIES[code];
                      return (
                        <option key={code} value={code} className="bg-[#141519]">
                          {config.flag} {code} — {config.nameFr.split(" - ")[0]}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </label>

              {onboardingError && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] leading-relaxed text-red-300">
                  {onboardingError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/10 bg-[#1c1e24] hover:bg-[#252830] text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Revoir la visite</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAll}
                className="flex-1 mansa-btn-green py-2.5 text-xs font-bold justify-center cursor-pointer shadow-sm"
              >
                <span>Valider</span>
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </ModalOverlay>
      ) : (
        /* 3. Step Tooltip Card */
        <div
          ref={tooltipRef}
          style={getTooltipStyle()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guided-tour-title"
          aria-describedby="guided-tour-description"
          className="rounded-2xl border border-[#00D26A]/40 bg-[#14161c]/98 backdrop-blur-xl p-5 shadow-2xl text-white space-y-4 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header with Step Counter & Close */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-xl bg-[#00D26A]/15 border border-[#00D26A]/30">
                {step.icon}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-[#00D26A]">
                  Étape {currentStepIndex + 1} sur {steps.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Passer la visite"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-1.5">
            <h4 id="guided-tour-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
              {step.titleFr}
            </h4>
            <p id="guided-tour-description" className="text-xs text-zinc-300 leading-relaxed">
              {step.descriptionFr}
            </p>
          </div>

          {/* Step Progress Dots */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  aria-label={`Aller à l'étape ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? "w-6 bg-[#00D26A]"
                      : idx < currentStepIndex
                      ? "w-2 bg-[#00D26A]/60"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                  title={`Étape ${idx + 1}`}
                />
              ))}
            </div>

            <span className="text-[10px] font-mono text-zinc-400">
              Raccourcis : ◀ ▶ Échap
            </span>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-medium px-2 py-1 cursor-pointer"
            >
              Passer
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-[#1a1c22] hover:bg-[#232630] text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Précédent</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 mansa-btn-green px-4 py-1.5 text-xs font-bold cursor-pointer shadow-sm"
              >
                <span>{isLastStep ? "Terminer" : "Suivant"}</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
