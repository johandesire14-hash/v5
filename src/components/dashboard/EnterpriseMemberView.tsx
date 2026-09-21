import React, { useState } from "react";
import {
  Home,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  HelpCircle,
  Clock,
  Zap,
  Lock,
  Download,
  Users,
  Send,
  AlertCircle,
  Radio,
  Share2,
  Bell,
  Link2,
  MapPin,
  User,
  MoreHorizontal,
  Pin,
  Heart,
  MessageCircle,
  Star,
  Calendar,
  ThumbsUp,
  FileText,
  SlidersHorizontal,
  Menu,
  X,
  Bookmark,
  Search,
  RefreshCw,
  Compass,
  Plus,
  ShoppingBag,
  Package,
  Camera,
  Building2,
  MoreVertical,
  Flag,
  BookOpen,
  GraduationCap,
  Eye,
  EyeOff,
  TrendingUp,
  Layers,
  PenLine,
  Image as ImageIcon,
  Smile,
  BarChart3,
  DollarSign,
  Video,
  LayoutDashboard,
} from "lucide-react";
import { EnterpriseSubscription, TelegramChannelItem, DiscordChannelItem } from "../../types";
import { TelegramIcon, DiscordIcon } from "./ConnectedAppsView";
import { OfferCheckoutModal, CreatorPlatformOffer } from "./OfferCheckoutModal";
import { PLATFORM_CREATOR_OFFERS } from "./DiscoverCreatorsView";
import {
  saveSubscription,
  updateSubscriptionBranding,
  removeSubscription,
  cancelActiveSubscription,
} from "../../utils/subscriptionsStorage";
import {
  getMemberAuthorizedTelegramChannels,
  getMemberAuthorizedDiscordChannels,
  getMemberAuthorizedEbooks,
  getMemberAuthorizedCourses,
  getOffersForCompany,
  normalizeUnlockedOfferIds,
  verifyMemberResourceAccess,
  EbookResourceItem,
  CourseResourceItem,
} from "../../utils/rightsAccessEngine";
import { updateCompanyBranding } from "../../utils/companyStorage";
import { EnterpriseBrandingModal } from "./EnterpriseBrandingModal";
import { ManageMembershipModal } from "./ManageMembershipModal";
import { ReportEnterpriseModal } from "./ReportEnterpriseModal";
import logoImg from "../../assets/images/afhub_logo_africa_1787956612844.jpg";

interface EnterpriseMemberViewProps {
  subscription: EnterpriseSubscription;
  lang: "fr" | "en";
  onBackToPersonal?: () => void;
  allSubscriptions?: EnterpriseSubscription[];
  onSelectSubscription?: (subId: string) => void;
  creatorCompanies?: any[];
  onSelectCreatorCompany?: (comp: any) => void;
  user?: { uid?: string; name: string; email: string; avatarInitials?: string };
  onOpenMarketplace?: () => void;
  onSeedSimulationData?: () => void;
  onOpenCreatorDashboard?: () => void;
  onCreateProduct?: () => void;
  onOpenCreatorApplications?: () => void;
}

export const EnterpriseMemberView: React.FC<EnterpriseMemberViewProps> = ({
  subscription,
  lang,
  onBackToPersonal,
  allSubscriptions = [],
  onSelectSubscription,
  creatorCompanies = [],
  onSelectCreatorCompany,
  user = { name: "Johan Désiré", email: "johan@afhub.app", avatarInitials: "JD" },
  onOpenMarketplace,
  onSeedSimulationData,
  onOpenCreatorDashboard,
  onCreateProduct,
  onOpenCreatorApplications,
}) => {
  // Navigation inside the enterprise hub - defaults to "accueil" for company home view
  const [activeTab, setActiveTab] = useState<"accueil" | "support" | "telegram" | "discord">("accueil");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Dynamic access state based on user's active apps & subscriptions
  const [currentIncludedApps, setCurrentIncludedApps] = useState<string[]>(
    subscription.includedApps || ["dashboard", "support"]
  );

  const isInitiallyPaid = subscription.hasPaidOffer !== undefined
    ? Boolean(subscription.hasPaidOffer)
    : (subscription.includedApps || []).some((a) =>
        ["telegram", "discord", "cours", "vip"].some((kw) => a.toLowerCase().includes(kw))
      );

  const [hasPaidOffer, setHasPaidOffer] = useState<boolean>(isInitiallyPaid);
  const [unlockedProductIds, setUnlockedProductIds] = useState<string[]>(
    subscription.unlockedProductIds || []
  );

  React.useEffect(() => {
    setCurrentIncludedApps(subscription.includedApps || ["dashboard", "support"]);
    const isPaid = subscription.hasPaidOffer !== undefined
      ? Boolean(subscription.hasPaidOffer)
      : (subscription.includedApps || []).some((a) =>
          ["telegram", "discord", "cours", "vip"].some((kw) => a.toLowerCase().includes(kw))
        );
    setHasPaidOffer(isPaid);
    setUnlockedProductIds(subscription.unlockedProductIds || []);
  }, [subscription.id, subscription.includedApps, subscription.hasPaidOffer, subscription.unlockedProductIds]);

  const [checkoutModalOffer, setCheckoutModalOffer] = useState<CreatorPlatformOffer | null>(null);

  // Enterprise branding state (Banner & Profile Photo customization)
  const [currentSub, setCurrentSub] = useState<EnterpriseSubscription>(subscription);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [selectedMemberProductId, setSelectedMemberProductId] = useState<string | null>(
    subscription.productId || null
  );

  React.useEffect(() => {
    setCurrentSub(subscription);
  }, [subscription]);

  const companyId = currentSub.companyId || currentSub.id;

  // Chaque entreprise possède son propre état de navigation et de vérification.
  // Un changement d'entreprise ne doit jamais conserver Telegram, Discord ou un QR/code de l'entreprise précédente.
  React.useEffect(() => {
    setActiveTab("accueil");
    setCompanyTab("accueil");
    setTelegramFlowStep("channels_list");
    setDiscordFlowStep("channels_list");
    setCheckoutModalOffer(null);
    setPreviewMode("admin");
    setIsPreviewMenuOpen(false);
    setIsPostComposerOpen(false);
    setSelectedMemberProductId(subscription.productId || null);
  }, [companyId, subscription.productId]);

  // Identifiants réels des offres débloquées par ce membre
  const memberUnlockedOfferIds = React.useMemo(() => {
    return normalizeUnlockedOfferIds(currentSub);
  }, [currentSub]);

  const scopedMemberUnlockedOfferIds = React.useMemo(() => {
    if (!selectedMemberProductId) return memberUnlockedOfferIds;
    return memberUnlockedOfferIds.filter(
      (offerId) => offerId.toLowerCase() === selectedMemberProductId.toLowerCase()
    );
  }, [memberUnlockedOfferIds, selectedMemberProductId]);

  // Ressources strictement autorisées pour ce membre et cette entreprise
  const authorizedTelegramChannels = React.useMemo(() => {
    return getMemberAuthorizedTelegramChannels(companyId, scopedMemberUnlockedOfferIds);
  }, [companyId, scopedMemberUnlockedOfferIds]);

  const authorizedDiscordChannels = React.useMemo(() => {
    return getMemberAuthorizedDiscordChannels(companyId, scopedMemberUnlockedOfferIds);
  }, [companyId, scopedMemberUnlockedOfferIds]);

  const authorizedEbooks = React.useMemo(() => {
    return getMemberAuthorizedEbooks(companyId, scopedMemberUnlockedOfferIds);
  }, [companyId, scopedMemberUnlockedOfferIds]);

  const authorizedCourses = React.useMemo(() => {
    return getMemberAuthorizedCourses(companyId, scopedMemberUnlockedOfferIds);
  }, [companyId, scopedMemberUnlockedOfferIds]);

  // Vérification d'accès stricte : débloqué uniquement si l'offre achetée accorde la ressource précise
  const hasTelegramAccess = authorizedTelegramChannels.length > 0;
  const hasDiscordAccess = authorizedDiscordChannels.length > 0;
  const isTelegramUnlocked = authorizedTelegramChannels.length > 0;
  const isDiscordUnlocked = authorizedDiscordChannels.length > 0;
  const isEbookUnlocked = authorizedEbooks.length > 0;
  const isCourseUnlocked = authorizedCourses.length > 0;
  
  // Company internal tabs: "Accueil" (default & active with blue underline indicator), "Produits", "Avis"
  const [companyTab, setCompanyTab] = useState<"accueil" | "produits" | "avis">("accueil");

  // Security Check: ONLY the true creator owner of this company can modify its branding and elements
  const isCompanyOwner = React.useMemo(() => {
    // 1. Direct owner check if ownerId or creatorEmail is attached to subscription
    const subOwnerId = (currentSub as any).ownerId;
    const subCreatorEmail = (currentSub as any).creatorEmail;
    if (user) {
      if (subOwnerId && (subOwnerId === (user as any).uid || subOwnerId === user.email)) {
        return true;
      }
      if (subCreatorEmail && subCreatorEmail === user.email) {
        return true;
      }
    }
    // 2. Check if current companyId exists in the user's creator companies list
    if (creatorCompanies && creatorCompanies.length > 0) {
      return creatorCompanies.some(
        (c: any) => c && (c.id === currentSub.companyId || c.id === currentSub.id)
      );
    }
    return false;
  }, [creatorCompanies, currentSub.companyId, currentSub.id, (currentSub as any).ownerId, (currentSub as any).creatorEmail, user]);

  const handlePublishPost = () => {
    if (!postText.trim()) return;
    setPostText("");
    setIsPostComposerOpen(false);
  };

  // Listen to external branding updates
  React.useEffect(() => {
    const handleBrandingChange = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.companyId === currentSub.companyId || detail.id === currentSub.companyId)) {
        setCurrentSub((prev) => ({
          ...prev,
          companyName: detail.companyName || detail.name || prev.companyName,
          companyBanner: detail.companyBanner || prev.companyBanner,
          companyLogo: detail.companyLogo || prev.companyLogo,
        }));
      }
    };
    window.addEventListener("mansa_subscription_updated", handleBrandingChange);
    window.addEventListener("mansa_company_branding_changed", handleBrandingChange);
    return () => {
      window.removeEventListener("mansa_subscription_updated", handleBrandingChange);
      window.removeEventListener("mansa_company_branding_changed", handleBrandingChange);
    };
  }, [currentSub.companyId]);

  const handleSaveBranding = (branding: {
    name: string;
    description: string;
    companyBanner: string;
    companyLogo: string;
  }) => {
    // Strict ownership verification: block non-creators
    if (!isCompanyOwner) {
      console.warn("Opération interdite : Seul le créateur propriétaire peut modifier son entreprise.");
      return;
    }

    const userKey = user?.email || "default";
    updateSubscriptionBranding(userKey, currentSub.companyId, {
      companyName: branding.name,
      companyBanner: branding.companyBanner,
      companyLogo: branding.companyLogo,
    });
    updateCompanyBranding(userKey, currentSub.companyId, {
      name: branding.name,
      description: branding.description,
      companyBanner: branding.companyBanner,
      companyLogo: branding.companyLogo,
    });
    setCurrentSub((prev) => ({
      ...prev,
      companyName: branding.name,
      companyBanner: branding.companyBanner,
      companyLogo: branding.companyLogo,
    }));
  };

  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Post likes and interaction states for newsfeed
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({
    "post-pinned": false,
    "post-2": false,
    "post-3": false,
  });
  const [likesCounts, setLikesCounts] = useState<Record<string, number>>({
    "post-pinned": 64,
    "post-2": 42,
    "post-3": 38,
  });
  const [copiedProfileShare, setCopiedProfileShare] = useState(false);
  const [isNotifSubscribed, setIsNotifSubscribed] = useState(true);
  const [optionsDropdownOpen, setOptionsDropdownOpen] = useState(false);
  const [isManageMembershipModalOpen, setIsManageMembershipModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [copiedLinkToast, setCopiedLinkToast] = useState(false);
  const [expandedCommentPosts, setExpandedCommentPosts] = useState<Record<string, boolean>>({});
  const [isEbookModalOpen, setIsEbookModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const optionsMenuRef = React.useRef<HTMLDivElement>(null);

  const commentReplies: Record<string, Array<{ author: string; text: string; time: string }>> = {
    "post-pinned": [
      { author: "Membre Premium", text: "Merci pour la mise à jour, c'est très clair.", time: "Il y a 20 min" },
      { author: currentSub.companyName, text: "Merci pour votre retour. Nous restons disponibles.", time: "Il y a 12 min" },
    ],
    "post-2": [
      { author: "Aïcha", text: "La synchronisation est-elle déjà active pour tous les membres ?", time: "Il y a 1 h" },
      { author: currentSub.companyName, text: "Oui, le déploiement est terminé.", time: "Il y a 45 min" },
    ],
    "post-3": [
      { author: "Membre Premium", text: "Le fichier est bien téléchargé, merci.", time: "Il y a 2 h" },
      { author: currentSub.companyName, text: "Parfait, bonne lecture !", time: "Il y a 1 h" },
    ],
  };

  const renderCommentReplies = (postId: string) => {
    if (!expandedCommentPosts[postId]) return null;
    if (!hasPaidOffer && !isCompanyOwner) {
      return (
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
          Les réponses sont disponibles après l'achat d'un produit.
        </div>
      );
    }
    return (
      <div className="mt-2 space-y-2 rounded-xl border border-white/5 bg-black/10 p-3">
        {commentReplies[postId].map((reply, index) => (
          <div key={`${postId}-reply-${index}`} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-white">{reply.author}</span>
              <span className="text-[10px] text-zinc-500">{reply.time}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{reply.text}</p>
          </div>
        ))}
      </div>
    );
  };

  // Click outside listener for menu ⋮
  React.useEffect(() => {
    if (!optionsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setOptionsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [optionsDropdownOpen]);

  // Handler: Cancel active subscription while remaining a member of the enterprise
  const handleCancelActiveSubscription = () => {
    const userKey = user?.email || "default";
    cancelActiveSubscription(userKey, currentSub.id);
    setHasPaidOffer(false);
    setCurrentIncludedApps(["dashboard", "support"]);
    setUnlockedProductIds([]);
    setCurrentSub((prev) => ({
      ...prev,
      hasPaidOffer: false,
      status: "canceled",
      productName: "Adhésion Simple (Gratuit)",
      priceDisplay: "0 FCFA",
      includedApps: ["dashboard", "support"],
      unlockedProductIds: [],
    }));
  };

  // Handler: Leave the enterprise completely
  const handleLeaveEnterprise = () => {
    // Une prévisualisation ou un accès visiteur ne constitue pas une adhésion.
    // Le clic est volontairement silencieux : aucune suppression ni notification n'est déclenchée.
    if (currentSub.hasJoined !== true) return;
    const userKey = user?.email || "default";
    removeSubscription(userKey, currentSub.id);
    if (onBackToPersonal) {
      onBackToPersonal();
    }
  };

  // 1. Offres réelles de l'entreprise : récupérées depuis rightsAccessEngine / PLATFORM_CREATOR_OFFERS
  const enterpriseOffers = React.useMemo<CreatorPlatformOffer[]>(() => {
    const compId = currentSub.companyId || currentSub.id;
    const configured = getOffersForCompany(compId);
    if (configured.length > 0) {
      return configured;
    }
    const registered = PLATFORM_CREATOR_OFFERS.filter(
      (o) => o.companyId === compId || o.companyId === currentSub.id
    );
    if (registered.length > 0) {
      return registered;
    }
    return [];
  }, [currentSub.companyId, currentSub.id]);

  type PreviewMode = "admin" | "public" | "hidden" | `product:${string}`;
  const [previewMode, setPreviewMode] = useState<PreviewMode>("admin");
  const [isPreviewMenuOpen, setIsPreviewMenuOpen] = useState(false);
  const selectedPreviewOfferId = previewMode.startsWith("product:")
    ? previewMode.slice("product:".length)
    : null;
  const selectedPreviewOffer = selectedPreviewOfferId
    ? enterpriseOffers.find((offer) => offer.id === selectedPreviewOfferId)
    : undefined;

  type CreatorAppId = "telegram" | "discord" | "courses" | "files";
  const [creatorAppStep, setCreatorAppStep] = useState<"closed" | "choose" | "link" | "content">("closed");
  const [selectedCreatorApp, setSelectedCreatorApp] = useState<CreatorAppId | null>(null);
  const [linkedCreatorProductIds, setLinkedCreatorProductIds] = useState<string[]>([]);
  const [creatorCourseName, setCreatorCourseName] = useState("");
  const [creatorCourseDescription, setCreatorCourseDescription] = useState("");
  const [creatorChapterNames, setCreatorChapterNames] = useState<string[]>(["Introduction"]);
  const [creatorNewChapterName, setCreatorNewChapterName] = useState("");
  const [creatorFileName, setCreatorFileName] = useState("");

  const creatorAppMeta: Record<CreatorAppId, { title: string; description: string; icon: string }> = {
    telegram: { title: "Telegram", description: "Canal ou groupe Telegram lié à un ou plusieurs produits.", icon: "✈️" },
    discord: { title: "Discord", description: "Serveur Discord et accès membres par produit.", icon: "🎮" },
    courses: { title: "Cours & vidéos", description: "Cours, coaching et formations avec chapitres.", icon: "🎓" },
    files: { title: "Fichier", description: "Fichiers, téléchargements instantanés et e-books.", icon: "📁" },
  };

  const openCreatorAppWorkflow = () => {
    setSelectedCreatorApp(null);
    setLinkedCreatorProductIds(selectedPreviewOfferId ? [selectedPreviewOfferId] : []);
    setCreatorAppStep("choose");
  };

  const chooseCreatorApp = (appId: CreatorAppId) => {
    setSelectedCreatorApp(appId);
    setCreatorAppStep("link");
  };

  const continueCreatorAppContent = () => {
    if (!selectedCreatorApp || linkedCreatorProductIds.length === 0) return;
    setCreatorAppStep("content");
  };

  const finishCreatorAppWorkflow = () => {
    if (!selectedCreatorApp) return;
    const storageKey = `mansa_creator_apps_${companyId}`;
    const currentApps = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const nextApp = {
      appId: selectedCreatorApp,
      productIds: linkedCreatorProductIds,
      title: selectedCreatorApp === "courses" ? creatorCourseName : creatorFileName,
      description: creatorCourseDescription,
      chapters: creatorChapterNames,
      updatedAt: new Date().toISOString(),
    };
    const withoutCurrent = Array.isArray(currentApps)
      ? currentApps.filter((app: { appId?: string }) => app.appId !== selectedCreatorApp)
      : [];
    localStorage.setItem(storageKey, JSON.stringify([...withoutCurrent, nextApp]));
    setCreatorAppStep("closed");
    setSelectedCreatorApp(null);
  };

  // Le mode compact est automatique sur les écrans étroits et complet sur desktop.
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleViewportChange = (event: MediaQueryListEvent) => setIsCompact(event.matches);

    setIsCompact(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  // Helper pour récupérer l'offre réelle correspondante
  const getOfferForFeature = (featureKey: string): CreatorPlatformOffer => {
    const matched = enterpriseOffers.find(
      (o) =>
        o.includedApps?.some((a) => a.toLowerCase().includes(featureKey)) ||
        o.type === featureKey ||
        o.title.toLowerCase().includes(featureKey)
    );
    if (matched) return matched;
    return enterpriseOffers[0] || {
      id: `offer-${featureKey}-${currentSub.companyId || currentSub.id}`,
      title: `Offre ${currentSub.companyName}`,
      companyId: currentSub.companyId || currentSub.id,
      companyName: currentSub.companyName,
      companyInitials: currentSub.companyInitials,
      category: "membership",
      type: "membership",
      priceDisplay: currentSub.priceDisplay || "19 000 FCFA / mois",
      priceAmount: 19000,
      currency: "XOF",
      pricingType: "paid",
      billingCycle: "monthly",
      description: `Accédez aux services officiels proposés par ${currentSub.companyName}.`,
      imageUrl: currentSub.companyBanner || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
      includedApps: ["dashboard", "support", featureKey],
    };
  };

  // Construction STRICTE des fonctionnalités réelles de l'entreprise (UNIQUEMENT ce qui existe dans ses offres réelles)
  const ecosystemFeatures = React.useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      icon: React.ReactNode;
      isAccessible: boolean;
      featureKey: string;
      productName: string;
      matchingOffer?: CreatorPlatformOffer;
      authorizedCount?: number;
    }> = [];

    // 1. Telegram (uniquement si configuré pour l'entreprise)
    const tgOffer = enterpriseOffers.find((o) =>
      Boolean(
        (o.telegramChannels && o.telegramChannels.length > 0) ||
        o.includedApps?.some((a) => a.toLowerCase().includes("telegram")) ||
        o.title.toLowerCase().includes("telegram")
      )
    );
    if (tgOffer || (currentSub.telegramChannels && currentSub.telegramChannels.length > 0)) {
      items.push({
        id: "telegram",
        title: "Telegram",
        description: "Canaux privés, alertes en temps réel et synthèses exclusives de marché.",
        icon: <TelegramIcon className="size-4 text-[#229ED9]" />,
        isAccessible: isTelegramUnlocked,
        featureKey: "telegram",
        productName: authorizedTelegramChannels[0]?.name || tgOffer?.title || "Canaux Telegram VIP",
        matchingOffer: tgOffer || getOfferForFeature("telegram"),
        authorizedCount: authorizedTelegramChannels.length,
      });
    }

    // 2. Discord (uniquement si configuré pour l'entreprise)
    const dcOffer = enterpriseOffers.find((o) =>
      Boolean(
        (o.discordChannels && o.discordChannels.length > 0) ||
        o.discordInvite ||
        o.includedApps?.some((a) => a.toLowerCase().includes("discord")) ||
        o.title.toLowerCase().includes("discord")
      )
    );
    if (dcOffer || (currentSub.discordChannels && currentSub.discordChannels.length > 0) || currentSub.discordInvite) {
      items.push({
        id: "discord",
        title: "Discord",
        description: "Salons d'échange stratégiques, vocaux et communauté d'entraide.",
        icon: <DiscordIcon className="size-4 text-[#5865F2]" />,
        isAccessible: isDiscordUnlocked,
        featureKey: "discord",
        productName: authorizedDiscordChannels[0]?.name || dcOffer?.title || "Serveur Discord VIP",
        matchingOffer: dcOffer || getOfferForFeature("discord"),
        authorizedCount: authorizedDiscordChannels.length,
      });
    }

    // 3. E-book (uniquement si configuré pour l'entreprise)
    const ebOffer = enterpriseOffers.find((o) =>
      Boolean(
        (o.ebooks && o.ebooks.length > 0) ||
        o.type === "ebook" ||
        o.includedApps?.some((a) => ["ebook", "guide", "pdf", "livre"].some((k) => a.toLowerCase().includes(k))) ||
        o.title.toLowerCase().includes("ebook")
      )
    );
    if (ebOffer || (currentSub.ebooks && currentSub.ebooks.length > 0)) {
      items.push({
        id: "ebook",
        title: "E-book",
        description: "Guides stratégiques téléchargeables, règles méthodologiques et fiches mémo.",
        icon: <BookOpen className="size-4 text-emerald-400" />,
        isAccessible: isEbookUnlocked,
        featureKey: "ebook",
        productName: authorizedEbooks[0]?.title || ebOffer?.title || "Pack E-books & Guides",
        matchingOffer: ebOffer || getOfferForFeature("ebook"),
        authorizedCount: authorizedEbooks.length,
      });
    }

    // 4. Formation (uniquement si configurée pour l'entreprise)
    const coOffer = enterpriseOffers.find((o) =>
      Boolean(
        (o.courses && o.courses.length > 0) ||
        o.type === "course" ||
        o.includedApps?.some((a) => ["cours", "formation", "masterclass", "course"].some((k) => a.toLowerCase().includes(k))) ||
        o.title.toLowerCase().includes("formation")
      )
    );
    if (coOffer || (currentSub.courses && currentSub.courses.length > 0)) {
      items.push({
        id: "course",
        title: "Formation",
        description: "Cursus vidéo complets pas à pas, replays exclusifs et études de cas pratiques.",
        icon: <GraduationCap className="size-4 text-indigo-400" />,
        isAccessible: isCourseUnlocked,
        featureKey: "course",
        productName: authorizedCourses[0]?.title || coOffer?.title || "Formation Vidéo",
        matchingOffer: coOffer || getOfferForFeature("course"),
        authorizedCount: authorizedCourses.length,
      });
    }

    return items;
  }, [
    enterpriseOffers,
    currentSub,
    isTelegramUnlocked,
    isDiscordUnlocked,
    isEbookUnlocked,
    isCourseUnlocked,
    authorizedTelegramChannels,
    authorizedDiscordChannels,
    authorizedEbooks,
    authorizedCourses,
  ]);

  const visibleEcosystemFeatures = React.useMemo(() => {
    if (!isCompanyOwner || previewMode === "admin" || previewMode === "public") {
      return ecosystemFeatures;
    }
    if (previewMode === "hidden") return [];
    if (!selectedPreviewOffer) return ecosystemFeatures;

    return ecosystemFeatures.filter((feature) => {
      if (feature.matchingOffer?.id === selectedPreviewOffer.id) return true;
      if (selectedPreviewOffer.includedApps?.some((app) => app.toLowerCase().includes(feature.featureKey))) return true;
      if (feature.featureKey === "ebook" && (selectedPreviewOffer.ebooks?.length || 0) > 0) return true;
      if (feature.featureKey === "course" && (selectedPreviewOffer.courses?.length || 0) > 0) return true;
      if (feature.featureKey === "resource" && (selectedPreviewOffer.customResources?.length || 0) > 0) return true;
      return false;
    });
  }, [ecosystemFeatures, isCompanyOwner, previewMode, selectedPreviewOffer]);

  const handleEcosystemFeatureClick = (
    feat: (typeof ecosystemFeatures)[0],
    isMobile: boolean = false
  ) => {
    if (isMobile) setIsMobileSidebarOpen(false);

    if (feat.isAccessible) {
      if (feat.id === "telegram") {
        setActiveTab("telegram");
        setTelegramFlowStep("channels_list");
      } else if (feat.id === "discord") {
        setActiveTab("discord");
        setDiscordFlowStep("channels_list");
      } else if (feat.id === "ebook") {
        setIsEbookModalOpen(true);
      } else if (feat.id === "course") {
        setIsCourseModalOpen(true);
      }
    } else {
      // Fonctionnalité non achetée : 🔒 Verrouillé
      // Redirection immédiate vers la page produit / offre correspondante avec ouverture du checkout
      setActiveTab("accueil");
      setCompanyTab("produits");
      const offer = feat.matchingOffer || getOfferForFeature(feat.featureKey);
      setCheckoutModalOffer(offer);
    }
  };
  
  // Telegram multi-step access architecture
  // Step 1: Channels list with Top Header & Central Content Card
  // Step 2: Claim access & QR Code
  // Step 3: Verified Gateway & Join channel
  const [telegramFlowStep, setTelegramFlowStep] = useState<"channels_list" | "claim_qr" | "telegram_gateway">("channels_list");
  
  // Discord multi-step access architecture
  const [discordFlowStep, setDiscordFlowStep] = useState<"channels_list" | "claim_qr" | "discord_gateway">("channels_list");

  // Canaux Telegram STRICTEMENT autorisés pour ce membre selon son offre achetée
  const channelsList: TelegramChannelItem[] = authorizedTelegramChannels;

  // Serveurs / Salons Discord STRICTEMENT autorisés pour ce membre selon son offre achetée
  const discordChannelsList: DiscordChannelItem[] = authorizedDiscordChannels;

  // Canaux Telegram d'autres offres de la même entreprise (non débloqués par ce membre)
  const otherCompanyTelegramChannels = React.useMemo(() => {
    const allChannels: Array<{ channel: TelegramChannelItem; requiredOffer: CreatorPlatformOffer }> = [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.telegramChannels || []).forEach((ch) => {
          if (!channelsList.some((c) => c.id === ch.id)) {
            allChannels.push({ channel: ch, requiredOffer: offer });
          }
        });
      }
    });
    return allChannels;
  }, [enterpriseOffers, memberUnlockedOfferIds, channelsList]);

  // Serveurs / Salons Discord d'autres offres de la même entreprise (non débloqués par ce membre)
  const otherCompanyDiscordChannels = React.useMemo(() => {
    const allChannels: Array<{ channel: DiscordChannelItem; requiredOffer: CreatorPlatformOffer }> = [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.discordChannels || []).forEach((ch) => {
          if (!discordChannelsList.some((c) => c.id === ch.id)) {
            allChannels.push({ channel: ch, requiredOffer: offer });
          }
        });
      }
    });
    return allChannels;
  }, [enterpriseOffers, memberUnlockedOfferIds, discordChannelsList]);

  // E-books d'autres offres de la même entreprise (non débloqués par ce membre)
  const otherCompanyEbooks = React.useMemo(() => {
    const list: Array<{ ebook: EbookResourceItem; requiredOffer: CreatorPlatformOffer }> = [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.ebooks || []).forEach((eb) => {
          if (!authorizedEbooks.some((e) => e.id === eb.id)) {
            list.push({ ebook: eb, requiredOffer: offer });
          }
        });
      }
    });
    return list;
  }, [enterpriseOffers, memberUnlockedOfferIds, authorizedEbooks]);

  // Formations d'autres offres de la même entreprise (non débloquées par ce membre)
  const otherCompanyCourses = React.useMemo(() => {
    const list: Array<{ course: CourseResourceItem; requiredOffer: CreatorPlatformOffer }> = [];
    enterpriseOffers.forEach((offer) => {
      if (!memberUnlockedOfferIds.includes(offer.id)) {
        (offer.courses || []).forEach((co) => {
          if (!authorizedCourses.some((c) => c.id === co.id)) {
            list.push({ course: co, requiredOffer: offer });
          }
        });
      }
    });
    return list;
  }, [enterpriseOffers, memberUnlockedOfferIds, authorizedCourses]);

  const [ebookDownloadToast, setEbookDownloadToast] = useState<string | null>(null);
  const [courseAccessToast, setCourseAccessToast] = useState<string | null>(null);

  const handleDownloadEbook = async (ebook: EbookResourceItem) => {
    try {
      const res = await fetch("/api/ebooks/request-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          ebookId: ebook.id,
          unlockedOfferIds: scopedMemberUnlockedOfferIds,
          userEmail: user?.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setEbookDownloadToast(`Téléchargement autorisé : ${ebook.title}`);
        setTimeout(() => setEbookDownloadToast(null), 3500);
      } else {
        setAccessDeniedToast(
          data.error ||
            `Accès refusé. Vous devez posséder l'offre associée pour télécharger cet e-book.`
        );
        setTimeout(() => setAccessDeniedToast(null), 4000);
      }
    } catch {
      setEbookDownloadToast(`Téléchargement de ${ebook.title} démarré.`);
      setTimeout(() => setEbookDownloadToast(null), 3500);
    }
  };

  const handleAccessCourse = async (course: CourseResourceItem) => {
    try {
      const res = await fetch("/api/courses/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          courseId: course.id,
          unlockedOfferIds: scopedMemberUnlockedOfferIds,
          userEmail: user?.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setCourseAccessToast(`Module débloqué : ${course.title}`);
        setTimeout(() => setCourseAccessToast(null), 3500);
      } else {
        setAccessDeniedToast(
          data.error ||
            `Accès refusé. Vous devez posséder l'offre associée pour suivre cette formation.`
        );
        setTimeout(() => setAccessDeniedToast(null), 4000);
      }
    } catch {
      setCourseAccessToast(`Accès validé : ${course.title}`);
      setTimeout(() => setCourseAccessToast(null), 3500);
    }
  };

  const [selectedChannel, setSelectedChannel] = useState<TelegramChannelItem | null>(() => {
    return authorizedTelegramChannels[0] || null;
  });
  const [selectedDiscordChannel, setSelectedDiscordChannel] = useState<DiscordChannelItem | null>(() => {
    return authorizedDiscordChannels[0] || null;
  });

  React.useEffect(() => {
    if (!selectedChannel && authorizedTelegramChannels.length > 0) {
      setSelectedChannel(authorizedTelegramChannels[0]);
    } else if (selectedChannel && !authorizedTelegramChannels.some((c) => c.id === selectedChannel.id)) {
      setSelectedChannel(authorizedTelegramChannels[0] || null);
    }
  }, [authorizedTelegramChannels]);

  React.useEffect(() => {
    if (!selectedDiscordChannel && authorizedDiscordChannels.length > 0) {
      setSelectedDiscordChannel(authorizedDiscordChannels[0]);
    } else if (selectedDiscordChannel && !authorizedDiscordChannels.some((c) => c.id === selectedDiscordChannel.id)) {
      setSelectedDiscordChannel(authorizedDiscordChannels[0] || null);
    }
  }, [authorizedDiscordChannels]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShareToast, setCopiedShareToast] = useState(false);
  const [activeMembersTooltip, setActiveMembersTooltip] = useState(false);
  const [activeNotifTooltip, setActiveNotifTooltip] = useState(false);

  const [copiedDiscordLink, setCopiedDiscordLink] = useState(false);
  const [copiedDiscordShareToast, setCopiedDiscordShareToast] = useState(false);
  const [activeDiscordMembersTooltip, setActiveDiscordMembersTooltip] = useState(false);
  const [activeDiscordNotifTooltip, setActiveDiscordNotifTooltip] = useState(false);

  const [claimToast, setClaimToast] = useState(false);
  const [discordClaimToast, setDiscordClaimToast] = useState(false);
  const [accessDeniedToast, setAccessDeniedToast] = useState<string | null>(null);

  const [supportMessage, setSupportMessage] = useState("");
  const [supportChatList, setSupportChatList] = useState<Array<{
    id: string;
    sender: "user" | "creator";
    text: string;
    time: string;
  }>>([
    {
      id: "msg-1",
      sender: "creator",
      text: `Bienvenue dans l'espace membre officiel de ${subscription.companyName} ! Votre abonnement est actif. Si vous avez besoin d'aide pour vos accès Telegram, Discord ou vos services inclus, écrivez-nous ici.`,
      time: "10:15",
    },
  ]);

  const handleSelectChannelToClaim = (channel: TelegramChannelItem) => {
    setSelectedChannel(channel);
    setTelegramFlowStep("claim_qr");
  };

  const handleProceedToGateway = () => {
    setTelegramFlowStep("telegram_gateway");
  };

  const handleCopyLink = () => {
    if (selectedChannel?.inviteLink) {
      navigator.clipboard.writeText(selectedChannel.inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShareToast(true);
    setTimeout(() => setCopiedShareToast(false), 2500);
  };

  const handleOpenTelegram = async () => {
    if (selectedChannel) {
      await handleClaimTelegramInvite(selectedChannel);
    }
  };

  const handleClaimTelegramInvite = async (channel?: TelegramChannelItem) => {
    const target = channel || selectedChannel;
    if (!target) return;

    // Validation stricte côté serveur et locale
    try {
      const resp = await fetch("/api/telegram/request-channel-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          channelId: target.id,
          unlockedOfferIds: scopedMemberUnlockedOfferIds,
          userEmail: user?.email,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.authorized) {
        setAccessDeniedToast(data.error || "Accès non autorisé : ce canal Telegram requiert l'offre correspondante.");
        setTimeout(() => setAccessDeniedToast(null), 5000);
        return;
      }
      const verifiedUrl = data.inviteLink || target.inviteLink;
      if (verifiedUrl) {
        window.open(verifiedUrl, "_blank", "noopener,noreferrer");
        setClaimToast(true);
        setTimeout(() => setClaimToast(false), 3500);
      }
    } catch {
      // Fallback local avec le moteur de droits d'accès
      const localCheck = verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: scopedMemberUnlockedOfferIds,
        resourceType: "telegram",
        resourceId: target.id,
      });
      if (localCheck.isAuthorized && target.inviteLink) {
        window.open(target.inviteLink, "_blank", "noopener,noreferrer");
        setClaimToast(true);
        setTimeout(() => setClaimToast(false), 3500);
      } else {
        setAccessDeniedToast("Accès refusé pour ce canal Telegram.");
        setTimeout(() => setAccessDeniedToast(null), 5000);
      }
    }
  };

  // Discord Handlers
  const handleSelectDiscordToClaim = (channel: DiscordChannelItem) => {
    setSelectedDiscordChannel(channel);
    setDiscordFlowStep("claim_qr");
  };

  const handleProceedToDiscordGateway = () => {
    setDiscordFlowStep("discord_gateway");
  };

  const handleCopyDiscordLink = () => {
    if (selectedDiscordChannel?.inviteLink) {
      navigator.clipboard.writeText(selectedDiscordChannel.inviteLink);
      setCopiedDiscordLink(true);
      setTimeout(() => setCopiedDiscordLink(false), 2500);
    }
  };

  const handleCopyDiscordShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedDiscordShareToast(true);
    setTimeout(() => setCopiedDiscordShareToast(false), 2500);
  };

  const handleOpenDiscord = async () => {
    if (selectedDiscordChannel) {
      await handleClaimDiscordInvite(selectedDiscordChannel);
    }
  };

  const handleClaimDiscordInvite = async (channel?: DiscordChannelItem) => {
    const target = channel || selectedDiscordChannel;
    if (!target) return;

    try {
      const resp = await fetch("/api/discord/request-server-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          channelId: target.id,
          unlockedOfferIds: scopedMemberUnlockedOfferIds,
          userEmail: user?.email,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.authorized) {
        setAccessDeniedToast(data.error || "Accès non autorisé : ce serveur Discord requiert l'offre correspondante.");
        setTimeout(() => setAccessDeniedToast(null), 5000);
        return;
      }
      const verifiedUrl = data.inviteLink || target.inviteLink;
      if (verifiedUrl) {
        window.open(verifiedUrl, "_blank", "noopener,noreferrer");
        setDiscordClaimToast(true);
        setTimeout(() => setDiscordClaimToast(false), 3500);
      }
    } catch {
      const localCheck = verifyMemberResourceAccess({
        companyId,
        unlockedOfferIds: scopedMemberUnlockedOfferIds,
        resourceType: "discord",
        resourceId: target.id,
      });
      if (localCheck.isAuthorized && target.inviteLink) {
        window.open(target.inviteLink, "_blank", "noopener,noreferrer");
        setDiscordClaimToast(true);
        setTimeout(() => setDiscordClaimToast(false), 3500);
      } else {
        setAccessDeniedToast("Accès refusé pour ce serveur Discord.");
        setTimeout(() => setAccessDeniedToast(null), 5000);
      }
    }
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    const textToSend = supportMessage.trim();
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: "user" as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setSupportChatList((prev) => [...prev, newMsg]);
    setSupportMessage("");

    // Broadcast to creator's Assistance page
    window.dispatchEvent(
      new CustomEvent("mansa_member_assistance_sent", {
        detail: {
          companyId: subscription.companyId || subscription.id,
          memberName: user?.name || "Membre",
          memberEmail: user?.email || "membre@mansa.app",
          message: textToSend,
        },
      })
    );

    // Auto-reply acknowledgment from support if no creator is active
    setTimeout(() => {
      setSupportChatList((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: "creator",
          text: `Message bien reçu. L'équipe d'assistance de ${subscription.companyName} est notifiée et vous répondra dans les plus brefs délais.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1200);
  };

  const totalChannels = channelsList.length;

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full w-full">
      <div className="p-3.5 space-y-4 flex-1 overflow-y-auto">
        {/* Top Mini Card of Enterprise matching screenshot */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#14161b] border border-white/5 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative size-9 rounded-xl bg-gradient-to-br from-indigo-950 via-purple-900 to-black border border-white/15 flex items-center justify-center text-xs font-black text-white shrink-0 overflow-hidden shadow-inner">
              {subscription.companyLogo ? (
                <img src={subscription.companyLogo} alt={subscription.companyName} className="size-full object-cover" />
              ) : (
                <span>{subscription.companyInitials || subscription.companyName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white truncate tracking-tight">{subscription.companyName}</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>en ligne</span>
              </div>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              title="Fermer le menu"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {isCompanyOwner && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPreviewMenuOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#14161b] px-3.5 py-2.5 text-left hover:border-white/20 transition-colors"
              aria-expanded={isPreviewMenuOpen}
              aria-haspopup="menu"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Aperçu en tant que</div>
                <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-white truncate">
                  {previewMode === "admin" && <Eye className="size-3.5 text-blue-400 shrink-0" />}
                  {previewMode === "public" && <Users className="size-3.5 text-emerald-400 shrink-0" />}
                  {previewMode === "hidden" && <EyeOff className="size-3.5 text-zinc-400 shrink-0" />}
                  {previewMode.startsWith("product:") && <Package className="size-3.5 text-amber-400 shrink-0" />}
                  <span className="truncate">
                    {previewMode === "admin"
                      ? "Administrateur"
                      : previewMode === "public"
                      ? "Public"
                      : previewMode === "hidden"
                      ? "Masqué"
                      : selectedPreviewOffer?.title || "Produit"}
                  </span>
                </div>
              </div>
              <ChevronDown className={`size-4 text-zinc-400 transition-transform ${isPreviewMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {isPreviewMenuOpen && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#17191e] p-1.5 shadow-2xl">
                <button
                  type="button"
                  onClick={() => { setPreviewMode("admin"); setIsPreviewMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${previewMode === "admin" ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                  <Eye className="size-3.5 text-blue-400" /> Administrateur
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewMode("public"); setIsPreviewMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${previewMode === "public" ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                  <Users className="size-3.5 text-emerald-400" /> Public
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewMode("hidden"); setIsPreviewMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${previewMode === "hidden" ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                >
                  <EyeOff className="size-3.5 text-zinc-400" /> Masqué
                </button>

                <div className="my-1.5 border-t border-white/10 pt-1.5">
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Produits</div>
                  {enterpriseOffers.length === 0 ? (
                    <div className="px-2.5 py-2 text-[11px] text-zinc-500">Aucun produit créé</div>
                  ) : (
                    enterpriseOffers.map((offer) => (
                      <button
                        type="button"
                        key={offer.id}
                        onClick={() => { setPreviewMode(`product:${offer.id}`); setIsPreviewMenuOpen(false); }}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${selectedPreviewOfferId === offer.id ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5"}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Package className="size-3.5 shrink-0 text-amber-400" />
                          <span className="truncate">{offer.title}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-zinc-500">{offer.subscribersCount || "0"}</span>
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => { setIsPreviewMenuOpen(false); onCreateProduct?.(); }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-2.5 pt-2 text-xs text-zinc-300 hover:text-white"
                  >
                    <Plus className="size-3.5" /> Nouveau produit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!isCompanyOwner && (
          <div className="rounded-xl border border-white/10 bg-[#14161b] p-1.5">
            <button
              type="button"
              onClick={() => setIsPreviewMenuOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-white hover:bg-white/5 transition-colors"
              aria-expanded={isPreviewMenuOpen}
              aria-haspopup="menu"
            >
              <span className="flex items-center gap-2">
                <Package className="size-3.5 text-amber-400" />
                Produits
              </span>
              <ChevronDown className={`size-3.5 text-zinc-400 transition-transform ${isPreviewMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {isPreviewMenuOpen && (
              <div className="mt-1 border-t border-white/10 pt-1">
                {enterpriseOffers.length === 0 ? (
                  <div className="px-2.5 py-2 text-[11px] text-zinc-500">Aucun produit disponible</div>
                ) : (
                  enterpriseOffers.map((offer) => (
                    <button
                      type="button"
                      key={offer.id}
                      onClick={() => {
                        const hasProductAccess = memberUnlockedOfferIds.some(
                          (offerId) => offerId.toLowerCase() === offer.id.toLowerCase()
                        );
                        if (hasProductAccess) {
                          setSelectedMemberProductId(offer.id);
                          setCompanyTab("accueil");
                          setActiveTab("accueil");
                        } else {
                          setCompanyTab("produits");
                          setActiveTab("accueil");
                          setCheckoutModalOffer(offer);
                        }
                        setIsPreviewMenuOpen(false);
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${selectedMemberProductId === offer.id ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"}`}
                    >
                      <span className="truncate">{offer.title}</span>
                      <span className="shrink-0 text-[10px] text-zinc-500">{offer.subscribersCount || "0"}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation Items (En haut) : Accueil, Assistance, etc. */}
        <nav className="space-y-1 text-xs font-medium">
          {/* Tableau de bord : visible uniquement pour le créateur propriétaire */}
          {isCompanyOwner && (
            <button
              onClick={() => {
                if (onOpenCreatorDashboard) {
                  onOpenCreatorDashboard();
                } else {
                  setActiveTab("accueil");
                  setCompanyTab("accueil");
                }
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <LayoutDashboard className="size-4 text-blue-400" />
              <span>Tableau de bord</span>
            </button>
          )}

          {/* Accueil */}
          <button
            onClick={() => {
              setActiveTab("accueil");
              setCompanyTab("accueil");
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === "accueil" && companyTab === "accueil"
                ? "bg-[#181a20] text-white font-semibold border border-white/10 shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <Home className="size-4 text-zinc-300" />
            <span>Accueil</span>
          </button>

          {/* Assistance */}
          <button
            onClick={() => {
              setActiveTab("support");
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              activeTab === "support"
                ? "bg-[#181a20] text-white font-semibold border border-white/10 shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="size-4 text-zinc-300" />
            <span>Assistance</span>
          </button>
          {isCompanyOwner && (
            <button
              onClick={() => {
                openCreatorAppWorkflow();
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <Plus className="size-4 text-blue-400" />
              <span>Ajouter une application</span>
            </button>
          )}
        </nav>

        {/* Section inférieure : Produits et fonctionnalités réels de l’entreprise */}
        {visibleEcosystemFeatures.length > 0 && (
          <div className="pt-3 border-t border-white/[0.08] space-y-1.5">
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Produits & Fonctionnalités
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {visibleEcosystemFeatures.filter((f) => f.isAccessible).length}/
                {visibleEcosystemFeatures.length}
              </span>
            </div>

            <div className="space-y-1">
              {visibleEcosystemFeatures.map((item) => {
                const isAccessible = item.isAccessible;
                const isCurrentActive =
                  (item.id === "telegram" && activeTab === "telegram") ||
                  (item.id === "discord" && activeTab === "discord");

                return (
                  <button
                    key={item.id}
                    onClick={() => handleEcosystemFeatureClick(item, isMobile)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer min-h-[44px] text-left group ${
                      isCurrentActive
                        ? "bg-[#181a20] text-white font-semibold border border-white/10 shadow-sm"
                        : isAccessible
                        ? "text-zinc-300 hover:bg-white/5 hover:text-white"
                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                    }`}
                    title={
                      isAccessible
                        ? `Accéder à ${item.title}`
                        : `Débloquer ${item.title} (Accéder à l'offre)`
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-4 shrink-0 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <span className="truncate text-xs font-medium group-hover:text-white">
                        {item.title}
                      </span>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isAccessible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          <span>🔓 Accessible</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                          <Lock className="size-2.5 shrink-0" />
                          <span>Verrouillé</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isMobile && onBackToPersonal && (
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => {
                setIsMobileSidebarOpen(false);
                onBackToPersonal();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
            >
              <ChevronLeft className="size-4 text-zinc-400" />
              <span>Mon Espace Personnel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // List of enterprise rail items ("les cases entreprise sur le cote comme sur l'image")
  const defaultRailCompanies = [
    {
      id: subscription.id,
      name: subscription.companyName,
      type: "active",
      initials: subscription.companyInitials || "FF",
      logo: subscription.companyLogo,
    },
    {
      id: "sub-bs-syndicate",
      name: "BS Syndicate",
      type: "text",
      initials: "BS",
    },
    {
      id: "sub-gs-trading",
      name: "GS Global Scalping",
      type: "text",
      initials: "GS",
    },
    {
      id: "sub-devkreativ",
      name: "Whop Alpha / DevKreativ",
      type: "whop_yellow",
      initials: "W",
    },
    {
      id: "sub-ecommerce-mastery",
      name: "Green Capital Scalper",
      type: "green_stripes",
      initials: "GC",
    },
    {
      id: "sub-alpha-bets",
      name: "Alpha Bets Club Pro",
      type: "avatar",
      avatarUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=120&q=80",
    },
    {
      id: "sub-victory-odds",
      name: "Victory Odds VIP",
      type: "purple_shield",
      initials: "VO",
    },
    {
      id: "sub-profitic",
      name: "Nexus Growth VIP",
      type: "green_icon",
      initials: "NG",
    },
  ];

  // Deduplicated list of member companies for the left rail
  const railItems = React.useMemo(() => {
    const rawList = allSubscriptions && allSubscriptions.length > 0 ? allSubscriptions : defaultRailCompanies;
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of rawList) {
      if (!item) continue;
      const key = item.id || item.companyId;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique;
  }, [allSubscriptions, defaultRailCompanies]);

  return (
    <div className="flex h-full w-full flex-1 overflow-hidden relative select-none bg-[#08090b] text-[#eeeeee] font-sans antialiased">
      {/* 1. LEFTMOST RAIL: Enterprise Squares ("les cases entreprise sur le cote comme sur l'image") */}
      <div className="w-[72px] shrink-0 bg-[#08090a] border-r border-white/5 flex flex-col items-center py-3 gap-2 overflow-y-auto no-scrollbar select-none z-10">
          
          {/* 1. Return to Personal Workspace */}
          {onBackToPersonal && (
            <div className="relative group flex items-center justify-center w-full px-2">
              <button
                onClick={onBackToPersonal}
                className="size-11 rounded-2xl bg-[#16171b] hover:bg-white/10 hover:text-white text-zinc-400 border border-white/10 flex items-center justify-center transition-all cursor-pointer"
                title="Espace Personnel"
              >
                <User className="size-5" />
              </button>
              <div className="absolute left-[72px] z-50 px-2.5 py-1 rounded-lg bg-[#181a22] text-xs font-semibold text-white border border-white/10 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
                Espace Personnel
              </div>
            </div>
          )}

          {/* DÉMARCATION 1 : MES ENTREPRISES (CRÉATEUR) */}
          <div className="w-full flex flex-col items-center gap-1.5 pt-1">
            <span
              className="text-[9px] font-black uppercase tracking-wider text-emerald-400/90 px-1 select-none flex items-center gap-0.5 cursor-default"
              title="Mes Entreprises (Créateur)"
            >
              👑
            </span>

            {/* Owned creator companies */}
            {(creatorCompanies.length > 0 ? creatorCompanies : [
              { id: "comp-cadre-financier", name: "Cadre financier", logoInitials: "FF", colorGradient: "from-emerald-950 via-slate-900 to-black" }
            ]).map((comp: any) => {
              const isOwnerActive = subscription.companyId === comp.id || subscription.id === comp.id;
              return (
                <div key={comp.id} className="relative group flex items-center justify-center w-full px-2">
                  {isOwnerActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-emerald-400 rounded-r-full shadow-sm shadow-emerald-400/50" />
                  )}

                  <button
                    onClick={() => {
                      if (onSelectCreatorCompany) {
                        onSelectCreatorCompany(comp);
                      } else if (onSelectSubscription) {
                        onSelectSubscription(comp.id);
                      }
                    }}
                    className={`size-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative overflow-hidden select-none ${
                      isOwnerActive
                        ? "ring-2 ring-emerald-400 scale-105 shadow-lg shadow-emerald-500/20"
                        : "border border-white/10 hover:border-emerald-400/50 hover:scale-105 opacity-85 hover:opacity-100"
                    }`}
                    title={`Mon Entreprise : ${comp.name}`}
                  >
                    <div
                      className={`size-full bg-gradient-to-br ${
                        comp.colorGradient || "from-emerald-950 via-slate-900 to-black"
                      } flex items-center justify-center text-[10px] font-black text-white font-mono`}
                    >
                      <span>{comp.logoInitials || comp.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  </button>

                  <div className="absolute left-[72px] z-50 px-2.5 py-1 rounded-lg bg-[#181a22] text-xs font-semibold text-white border border-white/10 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
                    👑 Créateur : {comp.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SÉPARATEUR VISUEL CLAIR (DÉMARCATION) */}
          <div className="w-8 h-px bg-white/15 my-1.5 shrink-0 flex items-center justify-center relative">
            <span className="absolute bg-[#08090a] px-1 text-[8px] text-zinc-500 font-mono">•••</span>
          </div>

          {/* DÉMARCATION 2 : ENTREPRISES MEMBRE (ADHÉSIONS) */}
          <div className="w-full flex flex-col items-center gap-1.5 flex-1">
            <span
              className="text-[9px] font-black uppercase tracking-wider text-blue-400/90 px-1 select-none flex items-center gap-0.5 cursor-default"
              title="Entreprises Membre (Adhésions)"
            >
              🛡️
            </span>

            {/* Member companies */}
            {railItems.map((item: any, idx: number) => {
              const isActive = item.id === subscription.id || item.companyId === subscription.companyId || (idx === 0 && !railItems.some(c => c.id === subscription.id && c !== item));
              return (
                <div key={`rail-${item.id || item.companyId || idx}-${idx}`} className="relative group flex items-center justify-center w-full px-2">
                  {/* Left vertical indicator pill */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-blue-500 rounded-r-full shadow-sm shadow-blue-500/50" />
                  )}

                  <button
                    onClick={() => {
                      if (onSelectSubscription) {
                        onSelectSubscription(item.id);
                      }
                    }}
                    className={`size-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative overflow-hidden select-none ${
                      isActive
                        ? "ring-2 ring-blue-500 scale-105 shadow-lg shadow-blue-500/20"
                        : "border border-white/10 hover:border-blue-400/50 hover:scale-105 opacity-85 hover:opacity-100"
                    }`}
                    title={`Espace Membre : ${item.companyName || item.name}`}
                  >
                    {item.companyLogo || item.logo ? (
                      <img src={item.companyLogo || item.logo} alt={item.companyName || item.name} className="size-full object-cover" />
                    ) : item.type === "whop_yellow" ? (
                      <div className="size-full bg-[#D8FF3F] text-black font-black text-lg flex items-center justify-center">W</div>
                    ) : item.type === "green_stripes" ? (
                      <div className="size-full bg-[#0b1712] border border-emerald-500/30 text-emerald-400 flex flex-col items-center justify-center gap-0.5">
                        <span className="w-5 h-1 bg-emerald-400 rounded-full" />
                        <span className="w-3.5 h-1 bg-emerald-400/70 rounded-full" />
                      </div>
                    ) : item.type === "purple_shield" ? (
                      <div className="size-full bg-[#13111f] border border-purple-500/30 text-purple-400 flex items-center justify-center">
                        <ShieldCheck className="size-5" />
                      </div>
                    ) : (
                      <div
                        className={`size-full bg-gradient-to-br ${
                          item.companyGradient || "from-blue-950 via-indigo-950 to-black"
                        } flex items-center justify-center text-[10px] font-black text-white font-mono`}
                      >
                        <span>{item.companyInitials || item.initials || (item.companyName || item.name || "EM").substring(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                  </button>

                  {/* Tooltip on hover */}
                  <div className="absolute left-[72px] z-50 px-2.5 py-1 rounded-lg bg-[#181a22] text-xs font-semibold text-white border border-white/10 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
                    🛡️ Membre : {item.companyName || item.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plus button to discover more */}
          <div className="relative group flex items-center justify-center w-full px-2 pt-2 border-t border-white/10 shrink-0">
            <button
              onClick={onOpenMarketplace}
              className="size-11 rounded-2xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-zinc-400 border border-dashed border-white/20 hover:border-emerald-400 flex items-center justify-center transition-all cursor-pointer"
              title="Découvrir d'autres entreprises"
            >
              <Plus className="size-5" />
            </button>
            <div className="absolute left-[72px] z-50 px-2.5 py-1 rounded-lg bg-[#181a22] text-xs font-semibold text-white border border-white/10 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150">
              Découvrir de nouvelles offres
            </div>
          </div>
        </div>

        {/* SECONDARY ENTERPRISE SIDEBAR (Desktop Fixed) */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/[0.08] bg-[#0e1014] flex-col justify-between select-none">
          {renderSidebarContent(false)}
        </aside>

        {/* MOBILE / TABLET SLIDING DRAWER */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside
              onClick={(e) => e.stopPropagation()}
              className="relative w-72 max-w-[85vw] bg-[#0c0d10] border-r border-white/10 shadow-2xl flex flex-col justify-between select-none z-10 animate-in slide-in-from-left duration-200 overflow-y-auto"
            >
              {renderSidebarContent(true)}
            </aside>
          </div>
        )}

        {/* MAIN WORKSPACE CONTENT */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#08090b] select-text">
        
        {/* ============================================================ */}
        {/* VIEW 1: VUE D'ACCUEIL DE L'ENTREPRISE (DARK MODE HAUT DE GAMME) */}
        {/* ============================================================ */}
        {activeTab === "accueil" && (
          <div className="w-full flex-1 flex flex-col pb-16 animate-in fade-in duration-150">
            
            {/* 1. EN-TÊTE VISUEL SELON LE MODE (COMPACT SANS BANNIÈRE OU STANDARD AVEC BANNIÈRE) */}
            {isCompact ? (
              /* ============================================================ */
              /* EN-TÊTE COMPACT (SANS BANNIÈRE ENCOMBRANTE)                  */
              /* Déterminé automatiquement selon la quantité/type d'éléments  */
              /* Préserve 100% des fonctionnalités sans perte d'espace        */
              /* ============================================================ */
              <div className="w-full bg-[#0d0f14] border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg select-none">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Boutons mobiles */}
                  <div className="lg:hidden flex items-center gap-1.5">
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-white min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Menu entreprise"
                    >
                      <Menu className="size-4" />
                    </button>
                    {onBackToPersonal && (
                      <button
                        onClick={onBackToPersonal}
                        className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 min-h-[36px] flex items-center gap-1 text-xs cursor-pointer"
                        title="Retour"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Logo compact */}
                  <div
                    onClick={() => isCompanyOwner && setIsBrandingModalOpen(true)}
                    className={`relative size-11 sm:size-12 rounded-xl border border-white/15 bg-[#14161f] shadow-md overflow-hidden shrink-0 ${
                      isCompanyOwner ? "cursor-pointer group" : "cursor-default"
                    }`}
                    title={isCompanyOwner ? "Modifier le logo" : currentSub.companyName}
                  >
                    {currentSub.companyLogo ? (
                      <img
                        src={currentSub.companyLogo}
                        alt={currentSub.companyName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full bg-gradient-to-br from-indigo-950 to-black flex items-center justify-center text-sm font-black text-white">
                        {currentSub.companyInitials || currentSub.companyName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {isCompanyOwner && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="size-3.5 text-emerald-400" />
                      </div>
                    )}
                  </div>

                  {/* Titre */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                        {currentSub.companyName}
                      </h1>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span>3 480 membres</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-mono">1 420 en ligne</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Branding button pour créateur propriétaire */}
                  {isCompanyOwner && (
                    <button
                      onClick={() => setIsBrandingModalOpen(true)}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-emerald-400 transition-all cursor-pointer"
                      title="Modifier la bannière et le logo"
                    >
                      <Camera className="size-4" />
                    </button>
                  )}

                  {/* Partage */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopiedProfileShare(true);
                      setTimeout(() => setCopiedProfileShare(false), 2500);
                    }}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                    title="Partager"
                  >
                    <Share2 className="size-4" />
                  </button>

                  {/* Notifications */}
                  <button
                    onClick={() => setIsNotifSubscribed(!isNotifSubscribed)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isNotifSubscribed
                        ? "bg-blue-600/15 border-blue-500/30 text-blue-400"
                        : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                    title="Notifications"
                  >
                    <Bell className="size-4" />
                  </button>

                  {/* Options Menu ⋮ */}
                  <div className="relative" ref={optionsMenuRef}>
                    <button
                      onClick={() => setOptionsDropdownOpen(!optionsDropdownOpen)}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Options"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {optionsDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#14161f] border border-white/10 shadow-2xl p-1.5 z-30 space-y-0.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopiedLinkToast(true);
                            setOptionsDropdownOpen(false);
                            setTimeout(() => setCopiedLinkToast(false), 3000);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-white/10 text-left"
                        >
                          <Share2 className="size-3.5 text-zinc-400" />
                          <span>COPIER LE LIEN</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsReportModalOpen(true);
                            setOptionsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-rose-500/10 hover:text-rose-300 text-left"
                        >
                          <Flag className="size-3.5 text-rose-400" />
                          <span>SIGNALER</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsManageMembershipModalOpen(true);
                            setOptionsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-white/10 text-left"
                        >
                          <ShieldCheck className="size-3.5 text-indigo-400" />
                          <span>GÉRER L’ADHÉSION</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Primary VIP Pass button */}
                  {hasPaidOffer ? (
                    <button
                      onClick={() => {
                        if (hasTelegramAccess) {
                          setActiveTab("telegram");
                          setTelegramFlowStep("channels_list");
                        } else if (hasDiscordAccess) {
                          setActiveTab("discord");
                          setDiscordFlowStep("channels_list");
                        } else {
                          setCompanyTab("produits");
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#0055ff] hover:bg-[#0047d6] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Accès VIP</span>
                      <ChevronRight className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setCompanyTab("produits")}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="size-3.5 text-black" />
                      <span>Offres</span>
                      <ChevronRight className="size-3.5 text-black" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* ============================================================ */
              /* EN-TÊTE STANDARD (AVEC GRANDE BANNIÈRE VISUELLE)             */
              /* ============================================================ */
              <>
                <div className="relative w-full h-44 sm:h-64 md:h-72 lg:h-80 overflow-hidden bg-[#111216] select-none group">
                  <img
                    src={currentSub.companyBanner || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=85"}
                    alt={`Bannière ${currentSub.companyName}`}
                    className="w-full h-full object-cover object-center"
                  />
                  {/* Subtle gradient vignette to seamlessly transition to the dark canvas */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0d] via-[#0a0b0d]/30 to-transparent pointer-events-none" />

                  {/* Bouton de configuration de la bannière */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                    {isCompanyOwner && (
                      <button
                        onClick={() => setIsBrandingModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer active:scale-95"
                        title="Modifier la bannière et la photo de profil de l'entreprise"
                      >
                        <Camera className="size-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Configurer la bannière & logo</span>
                        <span className="sm:hidden">Bannière</span>
                      </button>
                    )}
                  </div>

                  {/* Mobile / Tablet Top Navigation Bar over Banner */}
                  <div className="absolute top-3 left-3 right-48 z-20 flex items-center justify-between lg:hidden pointer-events-auto">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center gap-1.5 shadow-lg min-h-[40px] min-w-[40px] justify-center cursor-pointer active:scale-95 transition-all"
                    title="Ouvrir le menu de l'entreprise"
                  >
                    <Menu className="size-4" />
                    <span className="text-xs font-semibold pr-1">Menu</span>
                  </button>
                  {onBackToPersonal && (
                    <button
                      onClick={onBackToPersonal}
                      className="px-2.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-zinc-300 hover:text-white flex items-center gap-1 text-xs font-medium shadow-lg min-h-[40px] cursor-pointer active:scale-95 transition-all"
                      title="Retour à mon espace"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span className="hidden sm:inline">Mon Espace</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Toast for profile link sharing */}
              {copiedProfileShare && (
                <div className="absolute top-14 right-3 z-20 px-3.5 py-2 rounded-xl bg-[#14151a] border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                  <Check className="size-3.5 text-emerald-400" />
                  <span>Lien copié !</span>
                </div>
              )}
            </div>

            {/* 2. BLOC D'INFORMATIONS */}
            <div className="px-4 sm:px-8 lg:px-10 relative">
              {/* Photo de profil carrée aux coins arrondis superposée sur le coin inférieur gauche de la bannière */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 -mt-12 sm:-mt-18 md:-mt-22 mb-4">
                <div className="flex items-end gap-3 sm:gap-5">
                  <div
                    onClick={() => isCompanyOwner && setIsBrandingModalOpen(true)}
                    className={`relative size-24 sm:size-36 md:size-40 rounded-2xl sm:rounded-3xl border-4 border-[#0a0b0d] bg-[#14161f] shadow-2xl overflow-hidden shrink-0 ${
                      isCompanyOwner ? "group cursor-pointer" : "cursor-default select-none"
                    }`}
                    title={isCompanyOwner ? "Cliquer pour configurer la photo de profil / logo et la bannière" : currentSub.companyName}
                  >
                    {currentSub.companyLogo ? (
                      <img
                        src={currentSub.companyLogo}
                        alt={currentSub.companyName}
                        className={`size-full object-cover ${isCompanyOwner ? "group-hover:scale-105" : ""} transition-transform duration-300`}
                      />
                    ) : (
                      <div className="size-full bg-gradient-to-br from-indigo-950 via-slate-900 to-black flex items-center justify-center text-3xl sm:text-4xl font-black text-white">
                        {currentSub.companyInitials || currentSub.companyName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Hover overlay with Camera to edit - Uniquement pour le créateur propriétaire */}
                    {isCompanyOwner && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 select-none">
                        <Camera className="size-6 text-emerald-400" />
                        <span className="text-[11px] font-bold text-center px-1">Modifier logo</span>
                      </div>
                    )}
                    {/* Online status indicator */}
                    <span
                      className="absolute bottom-2 sm:bottom-2.5 right-2 sm:right-2.5 size-3 sm:size-4 rounded-full bg-emerald-400 ring-4 ring-[#0a0b0d]"
                      title="Espace d'entreprise actif"
                    />
                  </div>
                </div>

                {/* Des icônes d'action et de gestion alignées à l'extrême droite */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start sm:self-end pt-1 sm:pt-0">
                  {/* Notifications bell */}
                  <button
                    onClick={() => setIsNotifSubscribed(!isNotifSubscribed)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm relative ${
                      isNotifSubscribed
                        ? "bg-blue-600/15 border-blue-500/30 text-blue-400 hover:bg-blue-600/25"
                        : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                    }`}
                    title={isNotifSubscribed ? "Notifications activées" : "Activer les notifications"}
                  >
                    <Bell className="size-4" />
                    {isNotifSubscribed && (
                      <span className="absolute top-2 right-2 size-1.5 rounded-full bg-blue-400" />
                    )}
                  </button>

                  {/* Menu « ⋮ » de la page d'accueil de l'entreprise */}
                  <div className="relative" ref={optionsMenuRef}>
                    <button
                      onClick={() => setOptionsDropdownOpen(!optionsDropdownOpen)}
                      className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                      title="Options de l'entreprise"
                    >
                      <MoreVertical className="size-4" />
                    </button>

                    {optionsDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#14161f] border border-white/10 shadow-2xl p-1.5 z-30 space-y-0.5 animate-in fade-in duration-150">
                        {/* Action 1 : COPIER LE LIEN */}
                        <button
                          onClick={() => {
                            const publicUrl = window.location.href;
                            navigator.clipboard.writeText(publicUrl);
                            setCopiedLinkToast(true);
                            setOptionsDropdownOpen(false);
                            setTimeout(() => setCopiedLinkToast(false), 3000);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
                        >
                          <Share2 className="size-3.5 text-zinc-400" />
                          <span>COPIER LE LIEN</span>
                        </button>

                        {/* Action 2 : SIGNALER */}
                        <button
                          onClick={() => {
                            setIsReportModalOpen(true);
                            setOptionsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left cursor-pointer"
                        >
                          <Flag className="size-3.5 text-rose-400" />
                          <span>SIGNALER</span>
                        </button>

                        {/* Action 3 : GÉRER L'ADHÉSION */}
                        <button
                          onClick={() => {
                            setIsManageMembershipModalOpen(true);
                            setOptionsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
                        >
                          <ShieldCheck className="size-3.5 text-indigo-400" />
                          <span>GÉRER L’ADHÉSION</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Primary Member Pass Action Button */}
                  {hasPaidOffer ? (
                    <button
                      onClick={() => {
                        if (hasTelegramAccess) {
                          setActiveTab("telegram");
                          setTelegramFlowStep("channels_list");
                        } else if (hasDiscordAccess) {
                          setActiveTab("discord");
                          setDiscordFlowStep("channels_list");
                        } else {
                          setCompanyTab("produits");
                        }
                      }}
                      className="ml-1 px-4 py-2.5 rounded-xl bg-[#0055ff] hover:bg-[#0047d6] active:scale-[0.99] text-white text-xs font-bold tracking-wide flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/25"
                    >
                      <span>Accès Membre VIP</span>
                      <ChevronRight className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setCompanyTab("produits")}
                      className="ml-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-black text-xs font-bold tracking-wide flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/25"
                    >
                      <Sparkles className="size-3.5 text-black" />
                      <span>Rejoindre</span>
                      <ChevronRight className="size-3.5 text-black" />
                    </button>
                  )}
                </div>
              </div>

              {/* Informations textuelles & Métadonnées */}
              <div className="space-y-3 pt-1">
                {/* Le nom de l'entreprise affiché en gros caractères */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                    {currentSub.companyName}
                  </h1>
                </div>

                {/* Une ligne de métadonnées indiquant la localisation et le créateur */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-zinc-500 shrink-0" />
                    <span>Paris, France</span>
                  </div>
                  <span className="text-zinc-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-zinc-500 shrink-0" />
                    <span>
                      Créé par <strong className="text-zinc-200 font-semibold">{subscription.companyName} Labs</strong>
                    </span>
                  </div>
                  <span className="text-zinc-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-zinc-500 shrink-0" />
                    <span>Membre depuis {subscription.subscribedAt || "Septembre 2026"}</span>
                  </div>
                </div>

                {/* Un compteur de membres accompagné des avatars circulaires superposés des derniers inscrits */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex -space-x-2 overflow-hidden shrink-0">
                    {[
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
                      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
                      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80",
                    ].map((avatarUrl, idx) => (
                      <img
                        key={idx}
                        src={avatarUrl}
                        alt="Membre inscrit"
                        className="inline-block size-7 sm:size-8 rounded-full ring-2 ring-[#0a0b0d] object-cover"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="font-bold text-white tracking-tight">3 480</span>
                    <span className="text-zinc-400">membres</span>
                    <span className="text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5 ml-1">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{subscription.onlineMembersCount || 1420} en ligne</span>
                    </span>
                  </div>
                </div>

                {/* Preview vs Joined Notice Banner */}
                {subscription.isCommunityPreview && !subscription.hasJoined ? (
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 via-zinc-900/70 to-transparent border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-150">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="size-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                        <Users className="size-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white">
                          <span>Visite de l'entreprise {subscription.companyName}</span>
                        </div>
                        <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                          Vous explorez cette entreprise depuis l'onglet Découvrir. Si vous quittez sans rejoindre, elle disparaîtra de votre Communauté.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          const userKey = user?.email || "default";
                          const joinedSub: EnterpriseSubscription = {
                            ...subscription,
                            hasJoined: true,
                            isCommunityPreview: false,
                            productName: "Membre Officiel",
                          };
                          saveSubscription(userKey, joinedSub);
                          window.dispatchEvent(new CustomEvent("mansa_subscription_updated"));
                          window.dispatchEvent(
                            new CustomEvent("mansa_community_joined", { detail: { subId: subscription.id } })
                          );
                        }}
                        className="mansa-btn-green px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Rejoindre gratuitement</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            </>
            )}

            {/* 3. NAVIGATION INTERNE : BARRE D'ONGLETS HORIZONTALE */}
            {/* Comprenant "Accueil" (actif avec indicateur souligné en bleu), "Produits" et "Avis" */}
            <div className="mt-6 sm:mt-8 border-b border-white/[0.08] px-4 sm:px-8 lg:px-10 bg-[#0a0b0d] overflow-x-auto no-scrollbar">
              <nav className="flex items-center gap-6 sm:gap-8 -mb-px min-w-max">
                {/* Onglet Accueil (actif par défaut avec indicateur souligné en bleu) */}
                <button
                  onClick={() => setCompanyTab("accueil")}
                  className={`py-3.5 text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 relative ${
                    companyTab === "accueil"
                      ? "text-white border-b-2 border-blue-500 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent"
                  }`}
                >
                  <Home className="size-4" />
                  <span>Accueil</span>
                </button>

                {/* Onglet Produits */}
                <button
                  onClick={() => setCompanyTab("produits")}
                  className={`py-3.5 text-sm transition-all cursor-pointer flex items-center gap-2 relative ${
                    companyTab === "produits"
                      ? "text-white border-b-2 border-blue-500 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent"
                  }`}
                >
                  <FileText className="size-4" />
                  <span>Produits</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[11px] text-zinc-400 font-mono">
                    {enterpriseOffers.length}
                  </span>
                </button>

                {/* Onglet Avis */}
                <button
                  onClick={() => setCompanyTab("avis")}
                  className={`py-3.5 text-sm transition-all cursor-pointer flex items-center gap-2 relative ${
                    companyTab === "avis"
                      ? "text-white border-b-2 border-blue-500 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent"
                  }`}
                >
                  <Star className="size-4 text-amber-400 fill-amber-400/20" />
                  <span>Avis</span>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    (142)
                  </span>
                </button>
              </nav>
            </div>

            {/* 4. ZONE DE CONTENU */}
            <div className="px-4 sm:px-8 lg:px-10 py-5 sm:py-8">
              
              {/* VUE CONTENU : ONGLET ACCUEIL (Flux de publications ou d'actualités épuré) */}
              {companyTab === "accueil" && (
                <div className="max-w-4xl space-y-6 animate-in fade-in duration-150">
                  {/* Section Fil d'actualité & Publications */}
                  <div id="company-newsfeed" className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Actualités & Publications officielles
                      </h4>
                      <span className="text-xs text-zinc-500">Mises à jour récentes</span>
                    </div>
                  </div>

                    {/* Publication Épinglée */}
                    <div className="rounded-2xl border border-white/[0.09] bg-[#111318] p-5 sm:p-6 space-y-4 hover:border-white/15 transition-all shadow-lg shadow-black/40">
                      
                      {/* En-tête de la publication */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-[#181a22] border border-white/10 overflow-hidden shrink-0">
                            {subscription.companyLogo ? (
                              <img
                                src={subscription.companyLogo}
                                alt={subscription.companyName}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-xs font-black text-white bg-indigo-950">
                                {subscription.companyInitials || "VIP"}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{subscription.companyName}</span>
                              <span className="size-1 rounded-full bg-zinc-600" />
                              <span className="text-[11px] text-zinc-400 font-medium">Il y a 2h</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                              <span className="inline-flex items-center gap-1 text-blue-400 font-semibold">
                                <Pin className="size-3" />
                                <span>Publication Épinglée</span>
                              </span>
                              <span>•</span>
                              <span>Annonce Officielle VIP</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contenu textuel de la publication */}
                      <div className="space-y-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          🎯 Point de Marché Hebdomadaire & Alertes Algorithmiques
                        </h3>
                        <p>
                          Bienvenue à tous les nouveaux membres de la communauté ! Les analyses techniques détaillées et les ordres protégés sont en ligne dans vos canaux Telegram respectifs.
                        </p>
                        <p className="text-zinc-400">
                          Rappel essentiel : respectez rigoureusement votre gestion du risque (1 à 2% de bankroll par position). Notre équipe reste à votre écoute sur le salon support pour toute question.
                        </p>
                      </div>

                      {/* Encadré de performance / métrique intégrée au flux */}
                      <div className="p-4 rounded-xl bg-[#161820] border border-white/5 grid grid-cols-3 gap-3 text-center">
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-zinc-400">Ratio Hebdo</div>
                          <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">+18.4%</div>
                        </div>
                        <div className="space-y-0.5 border-x border-white/5">
                          <div className="text-[11px] text-zinc-400">Taux Réussite</div>
                          <div className="text-base sm:text-lg font-bold text-white font-mono">87.5%</div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-zinc-400">Signaux Actifs</div>
                          <div className="text-base sm:text-lg font-bold text-blue-400 font-mono">6 En cours</div>
                        </div>
                      </div>

                      {/* Barre d'interaction sociale sous la publication */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-400">
                        <div className="flex items-center gap-4">
                          {/* Like button */}
                          <button
                            onClick={() => {
                              const isLiked = likedPosts["post-pinned"];
                              setLikedPosts((prev) => ({ ...prev, "post-pinned": !isLiked }));
                              setLikesCounts((prev) => ({
                                ...prev,
                                "post-pinned": isLiked ? prev["post-pinned"] - 1 : prev["post-pinned"] + 1,
                              }));
                            }}
                            className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg ${
                              likedPosts["post-pinned"]
                                ? "text-rose-400 bg-rose-500/10 font-bold"
                                : "hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <Heart className={`size-3.5 ${likedPosts["post-pinned"] ? "fill-rose-400" : ""}`} />
                            <span>{likesCounts["post-pinned"]}</span>
                          </button>

                          {/* Comments counter */}
                          <button
                            type="button"
                            onClick={() => setExpandedCommentPosts((prev) => ({ ...prev, "post-pinned": !prev["post-pinned"] }))}
                            className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <MessageCircle className="size-3.5" />
                            <span>18 commentaires</span>
                          </button>
                        </div>

                        {/* Share */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopiedProfileShare(true);
                            setTimeout(() => setCopiedProfileShare(false), 2500);
                          }}
                          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5"
                        >
                          <Share2 className="size-3.5" />
                          <span>Partager</span>
                        </button>
                      </div>
                      {renderCommentReplies("post-pinned")}
                    </div>

                    {/* Deuxième Publication : Mise à jour technique */}
                    <div className="rounded-2xl border border-white/[0.09] bg-[#111318] p-5 sm:p-6 space-y-4 hover:border-white/15 transition-all shadow-lg shadow-black/40">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-[#181a22] border border-white/10 overflow-hidden shrink-0">
                            {subscription.companyLogo ? (
                              <img
                                src={subscription.companyLogo}
                                alt={subscription.companyName}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-xs font-black text-white bg-indigo-950">
                                {subscription.companyInitials || "VIP"}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{subscription.companyName}</span>
                              <span className="size-1 rounded-full bg-zinc-600" />
                              <span className="text-[11px] text-zinc-400 font-medium">Il y a 6h</span>
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              Mise à jour d'infrastructure
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          ⚡ Déploiement des Bots Telegram & Discord v2.4
                        </h4>
                        <p>
                          La latence d'envoi de nos alertes instantanées est désormais réduite sous la barre des 250ms. Tous les salons vocaux et rôles ont été synchronisés avec succès.
                        </p>
                      </div>

                      {/* Interaction bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-400">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => {
                              const isLiked = likedPosts["post-2"];
                              setLikedPosts((prev) => ({ ...prev, "post-2": !isLiked }));
                              setLikesCounts((prev) => ({
                                ...prev,
                                "post-2": isLiked ? prev["post-2"] - 1 : prev["post-2"] + 1,
                              }));
                            }}
                            className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg ${
                              likedPosts["post-2"]
                                ? "text-rose-400 bg-rose-500/10 font-bold"
                                : "hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <Heart className={`size-3.5 ${likedPosts["post-2"] ? "fill-rose-400" : ""}`} />
                            <span>{likesCounts["post-2"]}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedCommentPosts((prev) => ({ ...prev, "post-2": !prev["post-2"] }))}
                            className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <MessageCircle className="size-3.5" />
                            <span>9 commentaires</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopiedProfileShare(true);
                            setTimeout(() => setCopiedProfileShare(false), 2500);
                          }}
                          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5"
                        >
                          <Share2 className="size-3.5" />
                          <span>Partager</span>
                        </button>
                      </div>
                      {renderCommentReplies("post-2")}
                    </div>

                    {/* Troisième Publication : Fichier / Ressource */}
                    <div className="rounded-2xl border border-white/[0.09] bg-[#111318] p-5 sm:p-6 space-y-4 hover:border-white/15 transition-all shadow-lg shadow-black/40">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-[#181a22] border border-white/10 overflow-hidden shrink-0">
                            {subscription.companyLogo ? (
                              <img
                                src={subscription.companyLogo}
                                alt={subscription.companyName}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-xs font-black text-white bg-indigo-950">
                                {subscription.companyInitials || "VIP"}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{subscription.companyName}</span>
                              <span className="size-1 rounded-full bg-zinc-600" />
                              <span className="text-[11px] text-zinc-400 font-medium">Hier</span>
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              Ressource Téléchargeable
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          📘 Guide Pratique : Psychologie & Gestion de Bankroll 2026
                        </h4>
                        <p>
                          Le support de formation complet est disponible pour l'ensemble des membres actifs. Retrouvez les 10 principes cardinaux pour maximiser votre espérance de gain.
                        </p>
                      </div>

                      {/* Download box */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#161822] border border-white/5 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-500/10 text-red-400 font-mono font-bold text-[10px]">
                            PDF
                          </div>
                          <div>
                            <div className="font-semibold text-white">Guide_VIP_Gestion_2026.pdf</div>
                            <div className="text-[10px] text-zinc-500">4.2 Mo · Téléchargement instantané</div>
                          </div>
                        </div>
                        <button
                          onClick={() => alert("Téléchargement du Guide VIP...")}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="size-3" />
                          <span>Télécharger</span>
                        </button>
                      </div>

                      {/* Interaction bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-400">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => {
                              const isLiked = likedPosts["post-3"];
                              setLikedPosts((prev) => ({ ...prev, "post-3": !isLiked }));
                              setLikesCounts((prev) => ({
                                ...prev,
                                "post-3": isLiked ? prev["post-3"] - 1 : prev["post-3"] + 1,
                              }));
                            }}
                            className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg ${
                              likedPosts["post-3"]
                                ? "text-rose-400 bg-rose-500/10 font-bold"
                                : "hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <Heart className={`size-3.5 ${likedPosts["post-3"] ? "fill-rose-400" : ""}`} />
                            <span>{likesCounts["post-3"]}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedCommentPosts((prev) => ({ ...prev, "post-3": !prev["post-3"] }))}
                            className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <MessageCircle className="size-3.5" />
                            <span>12 commentaires</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopiedProfileShare(true);
                            setTimeout(() => setCopiedProfileShare(false), 2500);
                          }}
                          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5"
                        >
                          <Share2 className="size-3.5" />
                          <span>Partager</span>
                        </button>
                      </div>
                      {renderCommentReplies("post-3")}
                    </div>

                </div>
              )}

              {/* VUE CONTENU : ONGLET PRODUITS */}
              {companyTab === "produits" && (
                <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {enterpriseOffers.length === 0 ? (
                      <div className="col-span-1 md:col-span-2 py-12 px-6 rounded-2xl border border-white/10 bg-[#111318] text-center space-y-3">
                        <ShoppingBag className="size-10 text-zinc-500 mx-auto" />
                        <h4 className="text-base font-bold text-white">Aucune autre offre disponible</h4>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto">
                          {subscription.companyName} n'a pas d'autres produits ou abonnements configurés pour le moment.
                        </p>
                      </div>
                    ) : (
                      enterpriseOffers.map((offer) => {
                        const isOfferTg =
                          offer.includedApps?.some((a) => a.toLowerCase().includes("telegram")) ||
                          offer.title.toLowerCase().includes("telegram");
                        const isOfferDc =
                          offer.includedApps?.some((a) => a.toLowerCase().includes("discord")) ||
                          offer.title.toLowerCase().includes("discord");
                        const isOfferEb =
                          offer.type === "ebook" ||
                          offer.includedApps?.some((a) => ["ebook", "guide", "pdf"].some((k) => a.toLowerCase().includes(k))) ||
                          offer.title.toLowerCase().includes("ebook");
                        const isOfferCo =
                          offer.type === "course" ||
                          offer.includedApps?.some((a) => ["cours", "formation", "masterclass", "course"].some((k) => a.toLowerCase().includes(k))) ||
                          offer.title.toLowerCase().includes("formation");

                        const isOfferUnlocked =
                          memberUnlockedOfferIds.includes(offer.id) ||
                          memberUnlockedOfferIds.some((id) => id.toLowerCase() === offer.id.toLowerCase());

                        return (
                          <div
                            key={offer.id}
                            className={`rounded-2xl border p-6 space-y-4 relative flex flex-col justify-between transition-all ${
                              isOfferUnlocked
                                ? "border-emerald-500/40 bg-[#12141c] shadow-lg shadow-emerald-500/5"
                                : "border-white/[0.08] bg-[#111318] hover:border-white/15"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                {isOfferTg ? (
                                  <TelegramIcon className="size-5 text-[#229ED9]" />
                                ) : isOfferDc ? (
                                  <DiscordIcon className="size-5 text-[#5865F2]" />
                                ) : isOfferEb ? (
                                  <BookOpen className="size-5 text-emerald-400" />
                                ) : isOfferCo ? (
                                  <GraduationCap className="size-5 text-indigo-400" />
                                ) : (
                                  <Package className="size-5 text-amber-400" />
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-xs font-mono text-zinc-400">
                                {offer.categoryLabel || (isOfferTg ? "Canaux Privés Telegram" : isOfferDc ? "Communauté Discord" : isOfferEb ? "Guides PDF & E-books" : isOfferCo ? "Formation Vidéo" : "Offre Officielle")}
                              </div>
                              <h4 className="text-base font-bold text-white">{offer.title}</h4>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                {offer.description || `Accédez aux services et avantages inclus dans l'offre ${offer.title}.`}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                              <span className="text-sm font-bold text-white font-mono">{offer.priceDisplay}</span>
                              {isOfferUnlocked ? (
                                <button
                                  onClick={() => {
                                    if (isOfferTg) {
                                      setActiveTab("telegram");
                                      setTelegramFlowStep("channels_list");
                                    } else if (isOfferDc) {
                                      setActiveTab("discord");
                                      setDiscordFlowStep("channels_list");
                                    } else if (isOfferEb) {
                                      setIsEbookModalOpen(true);
                                    } else if (isOfferCo) {
                                      setIsCourseModalOpen(true);
                                    } else {
                                      setActiveTab("accueil");
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>Accéder</span>
                                  <ChevronRight className="size-3" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setCheckoutModalOffer(offer)}
                                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/20"
                                >
                                  <span>Débloquer l'accès</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* VUE CONTENU : ONGLET AVIS */}
              {companyTab === "avis" && (
                <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl">
                  {/* Rating summary */}
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111318] p-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center sm:text-left space-y-1">
                      <div className="text-4xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                        <span>4.9</span>
                        <Star className="size-6 text-amber-400 fill-amber-400" />
                      </div>
                      <p className="text-xs text-zinc-400">Basé sur 142 avis vérifiés de membres</p>
                    </div>
                    <div className="flex-1 w-full space-y-1.5 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="w-12">5 étoiles</span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="w-[92%] h-full bg-amber-400 rounded-full" />
                        </div>
                        <span className="w-8 text-right font-mono">92%</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="w-12">4 étoiles</span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="w-[6%] h-full bg-amber-400/80 rounded-full" />
                        </div>
                        <span className="w-8 text-right font-mono">6%</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="w-12">3 étoiles</span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="w-[2%] h-full bg-amber-400/50 rounded-full" />
                        </div>
                        <span className="w-8 text-right font-mono">2%</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual reviews list */}
                  <div className="space-y-4">
                    {[
                      {
                        name: "Marc K.",
                        date: "Il y a 3 jours",
                        rating: 5,
                        text: "Qualité exceptionnelle des analyses et rigueur impressionnante sur la gestion de risque. Les alertes Telegram arrivent avec une réactivité parfaite.",
                        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
                      },
                      {
                        name: "Sarah T.",
                        date: "Il y a 1 semaine",
                        rating: 5,
                        text: "L'interface d'accueil est super propre et la liaison avec le bot Discord s'est faite en un clic. Excellent support réactif.",
                        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
                      },
                      {
                        name: "Ibrahim D.",
                        date: "Il y a 2 semaines",
                        rating: 5,
                        text: "Très bon accompagnement. Les synthèses hebdomadaires et les fiches PDF sont claires et directement exploitables.",
                        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
                      },
                    ].map((rev, i) => (
                      <div key={i} className="p-5 rounded-2xl border border-white/[0.08] bg-[#111318] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img src={rev.avatar} alt={rev.name} className="size-8 rounded-full object-cover" />
                            <div>
                              <div className="text-xs font-bold text-white">{rev.name}</div>
                              <div className="text-[10px] text-zinc-500">{rev.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: rev.rating }).map((_, starIdx) => (
                              <Star key={starIdx} className="size-3.5 text-amber-400 fill-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{rev.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: SUPPORT CHAT                                         */}
        {/* ============================================================ */}
        {activeTab === "support" && (
          <div className="p-3.5 sm:p-6 md:p-8 max-w-3xl mx-auto w-full flex flex-col h-full space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Ouvrir le menu"
                >
                  <Menu className="size-4" />
                </button>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white">Assistance {subscription.companyName}</h1>
                  <p className="text-xs text-zinc-400">Échangez en direct avec l'équipe pour toute question ou aide</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-mono font-medium hidden sm:inline">En ligne</span>
              </div>
            </div>

            {/* Chat message box */}
            <div className="flex-1 rounded-2xl border border-white/10 bg-[#121316] p-4 overflow-y-auto space-y-3 min-h-[340px]">
              {supportChatList.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#0055ff] text-white rounded-br-none"
                        : "bg-[#1c1e24] text-zinc-200 border border-white/5 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 font-mono px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendSupport} className="flex gap-2">
              <input
                type="text"
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Écrivez votre message à l'équipe..."
                className="flex-1 rounded-xl border border-white/10 bg-[#16171b] px-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#0055ff] focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#0055ff] hover:bg-[#0047d6] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Envoyer</span>
              </button>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: TELEGRAM FLOW (Top Header + Central Content Card)     */}
        {/* ============================================================ */}
        {activeTab === "telegram" && (
          !hasTelegramAccess ? (
            <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] text-zinc-100 overflow-y-auto">
              {/* Header bar */}
              <div className="w-full h-14 px-3 sm:px-6 border-b border-white/[0.08] bg-[#0c0d11] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Ouvrir le menu"
                  >
                    <Menu className="size-4" />
                  </button>
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="size-6 flex items-center justify-center text-[#229ED9]">
                      <TelegramIcon className="size-5" />
                    </div>
                    <h1 className="text-sm font-bold text-white tracking-tight">Telegram</h1>
                  </div>
                </div>
              </div>

              {/* Paywall Screen */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6 animate-in fade-in">
                <div className="size-20 rounded-3xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] shadow-2xl shadow-[#229ED9]/10">
                  <Lock className="size-9 text-amber-400" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Canaux Telegram {subscription.companyName}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Vous avez rejoint <strong className="text-white font-medium">{subscription.companyName}</strong> avec accès à l'accueil et au support client. Pour recevoir les alertes de signaux en direct sur Telegram, activez l'option Telegram VIP.
                  </p>
                </div>

                <div className="w-full p-4 rounded-2xl bg-[#12141c] border border-white/10 text-left space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Inclus avec l'accès Telegram VIP :</div>
                  <div className="space-y-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span>Signaux de trading en temps réel et alertes scalping 24/7</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span>Liaison bot Telegram d'onboarding sécurisé afhub</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span>Accès aux replays vidéo et fiches d'analyses privées</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const existingOffer = PLATFORM_CREATOR_OFFERS.find(
                      (o) => o.companyName.toLowerCase() === subscription.companyName.toLowerCase() && o.includedApps.includes("telegram")
                    );
                    setCheckoutModalOffer(
                      existingOffer || {
                        id: `offer-tg-${subscription.companyId}`,
                        title: `${subscription.companyName} · Pass Telegram VIP Scalping`,
                        companyId: subscription.companyId,
                        companyName: subscription.companyName,
                        companyInitials: subscription.companyInitials,
                        category: "trading",
                        type: "membership",
                        priceDisplay: "19 € / mois",
                        priceAmount: 19,
                        currency: "EUR",
                        pricingType: "paid",
                        billingCycle: "monthly",
                        description: `Accès complet aux canaux Telegram VIP et signaux quotidiens de ${subscription.companyName}.`,
                        imageUrl: subscription.companyBanner || "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80",
                        includedApps: ["dashboard", "support", "telegram"],
                      }
                    );
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#229ED9] hover:bg-[#1b8bc2] active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-[#229ED9]/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <TelegramIcon className="size-4" />
                  <span>Débloquer l'accès Telegram VIP (19 € /mois)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] text-zinc-100 overflow-y-auto">
            
            {/* 1. TOP SECTION BAR */}
            <div className="w-full h-14 px-3 sm:px-6 border-b border-white/[0.08] bg-[#0c0d11] flex items-center justify-between shrink-0 select-none">
              
              {/* Left: Mobile Drawer Trigger + Back button "< Retour aux canaux" + Telegram icon + Title "Telegram" */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                  title="Ouvrir le menu"
                >
                  <Menu className="size-4" />
                </button>
                {telegramFlowStep === "claim_qr" && (
                  <button
                    onClick={() => setTelegramFlowStep("channels_list")}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                    title="Retour aux canaux"
                  >
                    <ChevronLeft className="size-4 text-zinc-400 group-hover:text-white transition-transform group-hover:-translate-x-0.5" />
                    <span className="hidden sm:inline">Retour aux canaux</span>
                    <span className="sm:hidden">Retour</span>
                  </button>
                )}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="size-6 flex items-center justify-center text-[#229ED9]">
                    <TelegramIcon className="size-5" />
                  </div>
                  <h1 className="text-sm font-bold text-white tracking-tight">Telegram</h1>
                </div>
              </div>

              {/* Far Right: Utility Icons (Link sharing, Members list, Notifications) */}
              <div className="flex items-center gap-2 text-zinc-400">
                {/* Link Sharing */}
                <div className="relative">
                  <button
                    onClick={handleCopyShareLink}
                    className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                    title="Partager le lien d'accès"
                  >
                    <Share2 className="size-4" />
                  </button>
                  {copiedShareToast && (
                    <div className="absolute right-0 top-full mt-1 px-2.5 py-1 rounded-md bg-white text-black text-[10px] font-bold whitespace-nowrap shadow-lg animate-in fade-in slide-in-from-top-1 z-20">
                      Lien copié !
                    </div>
                  )}
                </div>

                {/* Members List */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMembersTooltip(!activeMembersTooltip)}
                    className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    title="Membres du hub"
                  >
                    <Users className="size-4" />
                  </button>
                  {activeMembersTooltip && (
                    <div className="absolute right-0 top-full mt-1 p-2.5 rounded-xl bg-[#16181f] border border-white/10 text-white text-[11px] whitespace-nowrap shadow-xl z-20 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        <span>{subscription.onlineMembersCount || 248} membres connectés</span>
                      </div>
                      <div className="text-zinc-400 text-[10px]">Accès membre actif {subscription.companyName}</div>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setActiveNotifTooltip(!activeNotifTooltip)}
                    className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer relative"
                    title="Notifications Telegram"
                  >
                    <Bell className="size-4" />
                    <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-blue-500 ring-2 ring-[#0c0d11]" />
                  </button>
                  {activeNotifTooltip && (
                    <div className="absolute right-0 top-full mt-1 p-2.5 rounded-xl bg-[#16181f] border border-white/10 text-white text-[11px] whitespace-nowrap shadow-xl z-20 space-y-1">
                      <div className="font-bold">Notifications actives</div>
                      <div className="text-zinc-400 text-[10px]">Alertes et signaux synchronisés en direct</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MAIN CONTAINER AREA */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
              
              {/* STEP 1: CHANNELS LIST / CENTRAL CONTENT CARD */}
              {telegramFlowStep === "channels_list" && (
                <div className="w-full max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Central Content Card */}
                  <div className="rounded-3xl border border-white/10 bg-[#12141a] p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                    
                    {/* Prominent Telegram Logo at the top */}
                    <div className="flex justify-center">
                      <div className="size-20 rounded-3xl bg-gradient-to-b from-[#28A8EA] to-[#1F87CB] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 p-4.5 transition-transform hover:scale-105 duration-200">
                        <TelegramIcon className="size-full text-white" />
                      </div>
                    </div>

                    {/* Title Text & Sub-link */}
                    <div className="space-y-1.5">
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        Access your Telegram channels
                      </h1>
                      <div>
                        <button
                          onClick={() => setActiveTab("support")}
                          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer inline-block"
                        >
                          Having issues with Telegram?
                        </button>
                      </div>
                    </div>

                    {/* Error Toast */}
                    {accessDeniedToast && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left animate-in fade-in">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{accessDeniedToast}</span>
                      </div>
                    )}

                    {/* Vertical List of Channel Rows */}
                    {channelsList.length > 0 ? (
                      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] divide-y divide-white/5 overflow-hidden text-left shadow-inner">
                        {channelsList.map((channel) => (
                          <div
                            key={channel.id}
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                          >
                            {/* Channel Name on the Left */}
                            <div className="min-w-0 pr-2">
                              <span className="text-xs sm:text-sm font-bold text-white truncate block">
                                {channel.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                  <CheckCircle2 className="size-3" />
                                  <span>Inclus dans votre offre</span>
                                </span>
                                {channel.tag && (
                                  <span className="text-[10px] text-zinc-500 font-medium">
                                    · {channel.tag}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Blue "Create invite" Button Aligned to the Right */}
                            <button
                              onClick={() => handleSelectChannelToClaim(channel)}
                              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                            >
                              Create invite
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl border border-white/10 bg-[#0c0d12] text-center space-y-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                          <Lock className="size-5" />
                        </div>
                        <div className="text-xs font-bold text-white">
                          Aucun canal Telegram débloqué avec votre offre
                        </div>
                        <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                          Votre souscription actuelle ne donne pas accès aux canaux privés Telegram. Vous pouvez débloquer l'offre correspondante ci-dessous.
                        </p>
                      </div>
                    )}

                    {/* Section: Autres canaux Telegram de l'entreprise (non inclus dans l'offre achetée) */}
                    {otherCompanyTelegramChannels.length > 0 && (
                      <div className="space-y-2 text-left pt-2">
                        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                          <Lock className="size-3 text-zinc-500" />
                          <span>Autres canaux Telegram ({subscription.companyName})</span>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12]/60 divide-y divide-white/5 overflow-hidden">
                          {otherCompanyTelegramChannels.map(({ channel, requiredOffer }) => (
                            <div
                              key={channel.id}
                              className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-white/[0.01]"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-semibold text-zinc-300 truncate">
                                  {channel.name}
                                </div>
                                <div className="text-[10px] text-amber-400/90 font-medium mt-0.5 flex items-center gap-1">
                                  <Lock className="size-2.5" />
                                  <span>Requis : {requiredOffer.title} ({requiredOffer.priceDisplay})</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setActiveTab("accueil");
                                  setCompanyTab("produits");
                                  setCheckoutModalOffer(requiredOffer);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
                              >
                                Débloquer
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* STEP 2: CLAIM ACCESS & QR CODE (Modal Card) */}
              {telegramFlowStep === "claim_qr" && selectedChannel && (
                <div className="w-full max-w-md mx-auto space-y-4 sm:space-y-6 text-center animate-in fade-in zoom-in-95 duration-150 px-3 sm:px-0">
                  
                  {/* Central Modal Card */}
                  <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#12141a] p-5 sm:p-8 space-y-4 sm:space-y-6 shadow-2xl text-center">
                    
                    {/* Large Telegram Icon at the top of the card */}
                    <div className="flex justify-center">
                      <div className="size-16 sm:size-20 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#28A8EA] to-[#1F87CB] flex items-center justify-center text-white shadow-xl shadow-blue-500/25 p-3.5 sm:p-4.5 transition-transform hover:scale-105 duration-200">
                        <TelegramIcon className="size-full text-white" />
                      </div>
                    </div>

                    {/* Explanatory Title & Scan Instructions */}
                    <div className="space-y-1.5 sm:space-y-2 text-center">
                      <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
                        Accès à {selectedChannel.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 max-w-[340px] mx-auto leading-relaxed">
                        Scannez ce QR Code avec l'appareil photo de votre téléphone, ou cliquez sur le bouton ci-dessous pour récupérer votre invitation.
                      </p>
                    </div>

                    {/* QR Code Container (Compact and balanced) */}
                    <div
                      onClick={() => handleClaimTelegramInvite(selectedChannel)}
                      className="bg-white p-2.5 sm:p-3.5 rounded-2xl flex items-center justify-center mx-auto size-28 sm:size-36 md:size-40 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all group"
                      title="Cliquer pour réclamer l'invitation directement"
                    >
                      <svg
                        className="size-full aspect-square text-black"
                        viewBox="0 0 100 100"
                        fill="currentColor"
                      >
                        <rect x="0" y="0" width="30" height="30" rx="3" fill="black" />
                        <rect x="4" y="4" width="22" height="22" rx="2" fill="white" />
                        <rect x="8" y="8" width="14" height="14" rx="1" fill="black" />

                        <rect x="70" y="0" width="30" height="30" rx="3" fill="black" />
                        <rect x="74" y="4" width="22" height="22" rx="2" fill="white" />
                        <rect x="78" y="8" width="14" height="14" rx="1" fill="black" />

                        <rect x="0" y="70" width="30" height="30" rx="3" fill="black" />
                        <rect x="4" y="74" width="22" height="22" rx="2" fill="white" />
                        <rect x="8" y="78" width="14" height="14" rx="1" fill="black" />

                        <rect x="36" y="4" width="8" height="8" fill="black" />
                        <rect x="48" y="4" width="8" height="8" fill="black" />
                        <rect x="36" y="16" width="16" height="8" fill="black" />
                        <rect x="56" y="16" width="8" height="14" fill="black" />

                        <rect x="4" y="36" width="8" height="14" fill="black" />
                        <rect x="16" y="36" width="14" height="8" fill="black" />
                        <rect x="36" y="40" width="28" height="20" rx="2" fill="black" />
                        <rect x="40" y="44" width="20" height="12" fill="white" />
                        <rect x="44" y="48" width="12" height="4" fill="black" />

                        <rect x="70" y="36" width="8" height="8" fill="black" />
                        <rect x="84" y="36" width="12" height="8" fill="black" />
                        <rect x="70" y="60" width="8" height="14" fill="black" />
                        <rect x="36" y="66" width="8" height="8" fill="black" />
                        <rect x="48" y="66" width="14" height="14" fill="black" />
                        <rect x="70" y="78" width="14" height="8" fill="black" />
                        <rect x="88" y="78" width="8" height="14" fill="black" />
                      </svg>
                    </div>

                    {/* Main Action Button labeled "Réclamer l'invitation" acting as direct invite link */}
                    <div className="space-y-3 pt-1">
                      <button
                        onClick={() => handleClaimTelegramInvite(selectedChannel)}
                        className="w-full min-h-[46px] py-3 sm:py-3.5 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:brightness-105 active:scale-[0.99]"
                      >
                        <ExternalLink className="size-4" />
                        <span>Réclamer l'invitation</span>
                      </button>

                      {claimToast && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                          <Check className="size-4" />
                          <span>Lien Telegram ouvert dans un nouvel onglet !</span>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* STEP 3: TELEGRAM GATEWAY */}
              {telegramFlowStep === "telegram_gateway" && selectedChannel && (
                <div className="w-full max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Back Navigation Bar */}
                  <div className="flex items-center justify-start text-xs text-zinc-400 px-1">
                    <button
                      onClick={() => setTelegramFlowStep("claim_qr")}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Back to QR code</span>
                    </button>
                  </div>

                  {/* Gateway Card */}
                  <div className="rounded-3xl border border-white/10 bg-[#12141a] p-6 sm:p-8 space-y-6 text-center shadow-2xl">
                    
                    <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-900 to-black border border-white/15 flex items-center justify-center text-white font-bold text-lg mx-auto shadow-inner">
                      {selectedChannel.avatarUrl ? (
                        <img src={selectedChannel.avatarUrl} alt={selectedChannel.name} className="size-full object-cover rounded-2xl" />
                      ) : (
                        <span>{subscription.companyInitials || subscription.companyName.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white">{selectedChannel.name}</h2>
                      {selectedChannel.description && (
                        <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                          {selectedChannel.description}
                        </p>
                      )}
                    </div>

                    {/* Link Box */}
                    {selectedChannel.inviteLink && (
                      <div className="p-3 rounded-xl bg-[#0c0d12] border border-white/5 flex items-center justify-between gap-3 text-left">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">Unique invite link</div>
                          <div className="text-xs font-mono text-zinc-300 truncate">{selectedChannel.inviteLink}</div>
                        </div>
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedLink ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-zinc-400" />}
                          <span>{copiedLink ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={handleOpenTelegram}
                        className="w-full py-3.5 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc0] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
                      >
                        <TelegramIcon className="size-4" />
                        <span>Join Channel on Telegram</span>
                      </button>
                      <p className="text-[11px] text-zinc-500">
                        You are invited to join <strong>{selectedChannel.name}</strong>.
                      </p>
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>
          )
        )}

        {/* ============================================================ */}
        {/* VIEW 4: DISCORD FLOW (Top Header + Central Content Card)       */}
        {/* ============================================================ */}
        {activeTab === "discord" && (
          !hasDiscordAccess ? (
            <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] text-zinc-100 overflow-y-auto">
              {/* Section bar */}
              <div className="w-full h-14 px-3 sm:px-6 border-b border-white/[0.08] bg-[#0c0d11] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Ouvrir le menu"
                  >
                    <Menu className="size-4" />
                  </button>
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="size-6 flex items-center justify-center text-[#5865F2]">
                      <DiscordIcon className="size-5" />
                    </div>
                    <h1 className="text-sm font-bold text-white tracking-tight">Discord</h1>
                  </div>
                </div>
              </div>

              {/* Paywall Screen */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-6 animate-in fade-in">
                <div className="size-20 rounded-3xl bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] shadow-2xl shadow-[#5865F2]/10">
                  <Lock className="size-9 text-amber-400" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Serveur Discord {subscription.companyName}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    L'accès aux salons vocaux quotidiens, analyses de graphiques et au serveur Discord officiel nécessite l'activation de l'option VIP Discord.
                  </p>
                </div>

                <div className="w-full p-4 rounded-2xl bg-[#12141c] border border-white/10 text-left space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Inclus avec l'accès Discord VIP :</div>
                  <div className="space-y-2 text-xs text-zinc-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span>Salons vocaux Live Trading Londres & New York</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span>Attribution automatique du rôle vérifié Discord</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span>Revues d'écrans hebdomadaires et questions/réponses</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const existingOffer = PLATFORM_CREATOR_OFFERS.find(
                      (o) => o.companyName.toLowerCase() === subscription.companyName.toLowerCase() && o.includedApps.includes("discord")
                    );
                    setCheckoutModalOffer(
                      existingOffer || {
                        id: `offer-dc-${subscription.companyId}`,
                        title: `${subscription.companyName} · Pass Discord VIP Voice & Chat`,
                        companyId: subscription.companyId,
                        companyName: subscription.companyName,
                        companyInitials: subscription.companyInitials,
                        category: "trading",
                        type: "membership",
                        priceDisplay: "29 € / mois",
                        priceAmount: 29,
                        currency: "EUR",
                        pricingType: "paid",
                        billingCycle: "monthly",
                        description: `Accès complet aux salons vocaux Discord et analyses en direct de ${subscription.companyName}.`,
                        imageUrl: subscription.companyBanner || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
                        includedApps: ["dashboard", "support", "discord"],
                      }
                    );
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <DiscordIcon className="size-4" />
                  <span>Débloquer l'accès Discord VIP (29 € /mois)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full bg-[#0a0b0e] text-zinc-100 overflow-y-auto">
            
            {/* 1. TOP SECTION BAR */}
            <div className="w-full h-14 px-6 border-b border-white/[0.08] bg-[#0c0d11] flex items-center justify-between shrink-0 select-none">
              
              {/* Left: Back button "< Retour aux canaux" + Discord icon + Title "Discord" */}
              <div className="flex items-center gap-3">
                {discordFlowStep === "claim_qr" && (
                  <button
                    onClick={() => setDiscordFlowStep("channels_list")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                    title="Retour aux canaux"
                  >
                    <ChevronLeft className="size-4 text-zinc-400 group-hover:text-white transition-transform group-hover:-translate-x-0.5" />
                    <span>Retour aux canaux</span>
                  </button>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="size-6 flex items-center justify-center text-[#5865F2]">
                    <DiscordIcon className="size-5" />
                  </div>
                  <h1 className="text-sm font-bold text-white tracking-tight">Discord</h1>
                </div>
              </div>

              {/* Far Right: Utility Icons (Link sharing, Members list, Notifications) */}
              <div className="flex items-center gap-2 text-zinc-400">
                {/* Link Sharing */}
                <div className="relative">
                  <button
                    onClick={handleCopyDiscordShareLink}
                    className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                    title="Share Discord invite link"
                  >
                    <Share2 className="size-4" />
                  </button>
                  {copiedDiscordShareToast && (
                    <div className="absolute right-0 top-full mt-1 px-2.5 py-1 rounded-md bg-white text-black text-[10px] font-bold whitespace-nowrap shadow-lg animate-in fade-in slide-in-from-top-1 z-20">
                      Link copied!
                    </div>
                  )}
                </div>

                {/* Members List */}
                <div className="relative">
                  <button
                    onClick={() => setActiveDiscordMembersTooltip(!activeDiscordMembersTooltip)}
                    className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    title="Hub members online"
                  >
                    <Users className="size-4" />
                  </button>
                  {activeDiscordMembersTooltip && (
                    <div className="absolute right-0 top-full mt-1 p-2.5 rounded-xl bg-[#16181f] border border-white/10 text-white text-[11px] whitespace-nowrap shadow-xl z-20 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        <span>{subscription.onlineMembersCount || 312} members online</span>
                      </div>
                      <div className="text-zinc-400 text-[10px]">Verified {subscription.companyName} role included</div>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setActiveDiscordNotifTooltip(!activeDiscordNotifTooltip)}
                    className="p-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer relative"
                    title="Discord notifications"
                  >
                    <Bell className="size-4" />
                    <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#5865F2] ring-2 ring-[#0c0d11]" />
                  </button>
                  {activeDiscordNotifTooltip && (
                    <div className="absolute right-0 top-full mt-1 p-2.5 rounded-xl bg-[#16181f] border border-white/10 text-white text-[11px] whitespace-nowrap shadow-xl z-20 space-y-1">
                      <div className="font-bold">Discord sync active</div>
                      <div className="text-zinc-400 text-[10px]">Auto-assigned roles and notifications ready</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MAIN CONTAINER AREA */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
              
              {/* STEP 1: CHANNELS LIST / CENTRAL CONTENT CARD */}
              {discordFlowStep === "channels_list" && (
                <div className="w-full max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Central Content Card */}
                  <div className="rounded-3xl border border-white/10 bg-[#12141a] p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
                    
                    {/* Prominent Discord Logo at the top */}
                    <div className="flex justify-center">
                      <div className="size-20 rounded-3xl bg-gradient-to-b from-[#5865F2] to-[#4752c4] flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 p-4.5 transition-transform hover:scale-105 duration-200">
                        <DiscordIcon className="size-full text-white" />
                      </div>
                    </div>

                    {/* Title Text & Sub-link */}
                    <div className="space-y-1.5">
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        Access your Discord channels
                      </h1>
                      <div>
                        <button
                          onClick={() => setActiveTab("support")}
                          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer inline-block"
                        >
                          Having issues with Discord?
                        </button>
                      </div>
                    </div>

                    {/* Error Toast */}
                    {accessDeniedToast && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left animate-in fade-in">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{accessDeniedToast}</span>
                      </div>
                    )}

                    {/* Vertical List of Channel Rows */}
                    {discordChannelsList.length > 0 ? (
                      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] divide-y divide-white/5 overflow-hidden text-left shadow-inner">
                        {discordChannelsList.map((channel) => (
                          <div
                            key={channel.id}
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                          >
                            {/* Channel Name on the Left */}
                            <div className="min-w-0 pr-2">
                              <span className="text-xs sm:text-sm font-bold text-white truncate block">
                                {channel.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                  <CheckCircle2 className="size-3" />
                                  <span>Inclus dans votre offre</span>
                                </span>
                                {channel.role && (
                                  <span className="text-[10px] text-purple-400 font-medium">
                                    · 👑 {channel.role}
                                  </span>
                                )}
                                {channel.subscribersCount && (
                                  <span className="text-[10px] text-zinc-500 font-medium">
                                    · {channel.subscribersCount} members
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Blue / Discord "Create invite" Button Aligned to the Right */}
                            <button
                              onClick={() => handleSelectDiscordToClaim(channel)}
                              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                            >
                              Create invite
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl border border-white/10 bg-[#0c0d12] text-center space-y-3">
                        <div className="size-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                          <Lock className="size-5" />
                        </div>
                        <div className="text-xs font-bold text-white">
                          Aucun salon Discord débloqué avec votre offre
                        </div>
                        <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                          Votre souscription actuelle ne donne pas accès au serveur Discord VIP. Vous pouvez débloquer l'offre correspondante ci-dessous.
                        </p>
                      </div>
                    )}

                    {/* Section: Autres salons Discord de l'entreprise (non inclus dans l'offre achetée) */}
                    {otherCompanyDiscordChannels.length > 0 && (
                      <div className="space-y-2 text-left pt-2">
                        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                          <Lock className="size-3 text-zinc-500" />
                          <span>Autres salons Discord ({subscription.companyName})</span>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12]/60 divide-y divide-white/5 overflow-hidden">
                          {otherCompanyDiscordChannels.map(({ channel, requiredOffer }) => (
                            <div
                              key={channel.id}
                              className="p-3 sm:p-3.5 flex items-center justify-between gap-3 bg-white/[0.01]"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-semibold text-zinc-300 truncate">
                                  {channel.name}
                                </div>
                                <div className="text-[10px] text-amber-400/90 font-medium mt-0.5 flex items-center gap-1">
                                  <Lock className="size-2.5" />
                                  <span>Requis : {requiredOffer.title} ({requiredOffer.priceDisplay})</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setActiveTab("accueil");
                                  setCompanyTab("produits");
                                  setCheckoutModalOffer(requiredOffer);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
                              >
                                Débloquer
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* STEP 2: CLAIM ACCESS & QR CODE (Modal Card) */}
              {discordFlowStep === "claim_qr" && selectedDiscordChannel && (
                <div className="w-full max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Central Modal Card */}
                  <div className="rounded-3xl border border-white/10 bg-[#12141a] p-6 sm:p-8 space-y-6 shadow-2xl text-center">
                    
                    {/* Large Discord Icon at the top of the card */}
                    <div className="flex justify-center">
                      <div className="size-20 rounded-3xl bg-gradient-to-b from-[#5865F2] to-[#4752c4] flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 p-4.5 transition-transform hover:scale-105 duration-200">
                        <DiscordIcon className="size-full text-white" />
                      </div>
                    </div>

                    {/* Explanatory Title & Scan Instructions */}
                    <div className="space-y-2 text-center">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        Accès à {selectedDiscordChannel.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-400 max-w-[340px] mx-auto leading-relaxed">
                        Scannez ce QR Code avec l'appareil photo de votre téléphone, ou cliquez sur le bouton ci-dessous pour récupérer votre invitation.
                      </p>
                    </div>

                    {/* QR Code Container (Compact and balanced) */}
                    <div
                      onClick={() => handleClaimDiscordInvite(selectedDiscordChannel)}
                      className="bg-white p-3 sm:p-3.5 rounded-2xl flex items-center justify-center mx-auto size-36 sm:size-40 shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-all group"
                      title="Cliquer pour réclamer l'invitation directement"
                    >
                      <svg
                        className="size-full aspect-square text-black"
                        viewBox="0 0 100 100"
                        fill="currentColor"
                      >
                        <rect x="0" y="0" width="30" height="30" rx="3" fill="black" />
                        <rect x="4" y="4" width="22" height="22" rx="2" fill="white" />
                        <rect x="8" y="8" width="14" height="14" rx="1" fill="black" />

                        <rect x="70" y="0" width="30" height="30" rx="3" fill="black" />
                        <rect x="74" y="4" width="22" height="22" rx="2" fill="white" />
                        <rect x="78" y="8" width="14" height="14" rx="1" fill="black" />

                        <rect x="0" y="70" width="30" height="30" rx="3" fill="black" />
                        <rect x="4" y="74" width="22" height="22" rx="2" fill="white" />
                        <rect x="8" y="78" width="14" height="14" rx="1" fill="black" />

                        <rect x="36" y="4" width="8" height="8" fill="black" />
                        <rect x="48" y="4" width="8" height="8" fill="black" />
                        <rect x="36" y="16" width="16" height="8" fill="black" />
                        <rect x="56" y="16" width="8" height="14" fill="black" />

                        <rect x="4" y="36" width="8" height="14" fill="black" />
                        <rect x="16" y="36" width="14" height="8" fill="black" />
                        <rect x="36" y="40" width="28" height="20" rx="2" fill="black" />
                        <rect x="40" y="44" width="20" height="12" fill="white" />
                        <rect x="44" y="48" width="12" height="4" fill="black" />

                        <rect x="70" y="36" width="8" height="8" fill="black" />
                        <rect x="84" y="36" width="12" height="8" fill="black" />
                        <rect x="70" y="60" width="8" height="14" fill="black" />
                        <rect x="36" y="66" width="8" height="8" fill="black" />
                        <rect x="48" y="66" width="14" height="14" fill="black" />
                        <rect x="70" y="78" width="14" height="8" fill="black" />
                        <rect x="88" y="78" width="8" height="14" fill="black" />
                      </svg>
                    </div>

                    {/* Main Action Button labeled "Réclamer l'invitation" acting as direct invite link */}
                    <div className="space-y-3 pt-1">
                      <button
                        onClick={() => handleClaimDiscordInvite(selectedDiscordChannel)}
                        className="w-full py-3.5 px-6 rounded-xl sm:rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-white text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:brightness-105 active:scale-[0.99]"
                      >
                        <ExternalLink className="size-4" />
                        <span>Réclamer l'invitation</span>
                      </button>

                      {discordClaimToast && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                          <Check className="size-4" />
                          <span>Lien Discord ouvert dans un nouvel onglet !</span>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* STEP 3: DISCORD GATEWAY */}
              {discordFlowStep === "discord_gateway" && selectedDiscordChannel && (
                <div className="w-full max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Back Navigation Bar */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                    <button
                      onClick={() => setDiscordFlowStep("claim_qr")}
                      className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Back to QR code</span>
                    </button>
                    <span className="text-xs font-mono text-emerald-400 font-bold">Access Ready (3 / 3)</span>
                  </div>

                  {/* Gateway Card */}
                  <div className="rounded-3xl border border-white/10 bg-[#12141a] p-6 sm:p-8 space-y-6 text-center shadow-2xl">
                    
                    <div className="size-16 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#2e3470] border border-white/15 flex items-center justify-center text-white font-bold text-lg mx-auto shadow-inner">
                      {selectedDiscordChannel.avatarUrl ? (
                        <img src={selectedDiscordChannel.avatarUrl} alt={selectedDiscordChannel.name} className="size-full object-cover rounded-2xl" />
                      ) : (
                        <DiscordIcon className="size-8 text-white" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white">{selectedDiscordChannel.name}</h2>
                      {selectedDiscordChannel.description && (
                        <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                          {selectedDiscordChannel.description}
                        </p>
                      )}
                    </div>

                    {/* Link Box */}
                    {selectedDiscordChannel.inviteLink && (
                      <div className="p-3 rounded-xl bg-[#0c0d12] border border-white/5 flex items-center justify-between gap-3 text-left">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">Unique Discord invite</div>
                          <div className="text-xs font-mono text-zinc-300 truncate">{selectedDiscordChannel.inviteLink}</div>
                        </div>
                        <button
                          onClick={handleCopyDiscordLink}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedDiscordLink ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-zinc-400" />}
                          <span>{copiedDiscordLink ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={handleOpenDiscord}
                        className="w-full py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
                      >
                        <DiscordIcon className="size-4" />
                        <span>Join Server on Discord</span>
                      </button>
                      <p className="text-[11px] text-zinc-500">
                        You are invited to join <strong>{selectedDiscordChannel.name}</strong>.
                      </p>
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>
          )
        )}

      </div>

      {/* Creator-only publication composer */}
      {isCompanyOwner && companyTab === "accueil" && (
        <>
          <button
            type="button"
            onClick={() => setIsPostComposerOpen(true)}
            aria-label="Créer une publication"
            title="Créer une publication"
            className="absolute bottom-6 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-950/50 transition-all hover:scale-105 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-[#08090b] cursor-pointer"
          >
            <PenLine className="size-6" />
          </button>

          {isPostComposerOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="post-composer-title"
                className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#252830] text-xs font-bold text-white">
                      {user.avatarInitials || currentSub.companyInitials || "JO"}
                    </div>
                    <div>
                      <h2 id="post-composer-title" className="text-sm font-bold text-white">Créer une publication</h2>
                      <p className="text-[11px] text-zinc-500">Publication officielle de {currentSub.companyName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPostComposerOpen(false)}
                    aria-label="Fermer la fenêtre de publication"
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="p-5">
                  <textarea
                    autoFocus
                    value={postText}
                    onChange={(event) => setPostText(event.target.value)}
                    placeholder="À quoi pensez-vous ?"
                    aria-label="Texte de la publication"
                    className="min-h-[180px] w-full resize-none rounded-xl border border-white/10 bg-[#0b0c0e] p-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-blue-500/70"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-5 py-4">
                  <button type="button" title="Ajouter une image" aria-label="Ajouter une image" className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10 cursor-pointer">
                    <ImageIcon className="size-5" />
                  </button>
                  <button type="button" title="Ajouter un GIF" aria-label="Ajouter un GIF" className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10 cursor-pointer">
                    <span className="text-xs font-black">GIF</span>
                  </button>
                  <button type="button" title="Ajouter un emoji" aria-label="Ajouter un emoji" className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10 cursor-pointer">
                    <Smile className="size-5" />
                  </button>
                  <button type="button" title="Ajouter un sondage ou des statistiques" aria-label="Ajouter un sondage ou des statistiques" className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10 cursor-pointer">
                    <BarChart3 className="size-5" />
                  </button>
                  <button type="button" title="Ajouter une contribution payante" aria-label="Ajouter une contribution payante" className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-400/10 cursor-pointer">
                    <DollarSign className="size-5" />
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPostComposerOpen(false)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-red-500 cursor-pointer"
                    >
                      <Video className="size-4" />
                      <span>Passer en direct</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePublishPost}
                      className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-500 cursor-pointer"
                    >
                      Publier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Checkout Modal if user clicks on locked Telegram / Discord / Product offer */}
      {checkoutModalOffer && (
        <OfferCheckoutModal
          isOpen={!!checkoutModalOffer}
          offer={checkoutModalOffer}
          onClose={() => setCheckoutModalOffer(null)}
          onPaymentSuccess={(newSub) => {
            // Update includedApps and unlockedProductIds for current enterprise
            const updatedApps = Array.from(new Set([...currentIncludedApps, ...(newSub.includedApps || [])]));
            const newOfferIds = [
              ...(newSub.unlockedProductIds || []),
              ...(newSub.purchasedOfferIds || []),
              ...(newSub.productId && !newSub.productId.includes("free") ? [newSub.productId] : []),
            ];
            const updatedUnlockedIds = Array.from(
              new Set([...unlockedProductIds, ...newOfferIds])
            );
            setCurrentIncludedApps(updatedApps);
            setUnlockedProductIds(updatedUnlockedIds);
            setHasPaidOffer(true);
            const userKey = user?.email || "default";
            const updatedSubscription: EnterpriseSubscription = {
              ...currentSub,
              hasPaidOffer: true,
              includedApps: updatedApps,
              unlockedProductIds: updatedUnlockedIds,
              purchasedOfferIds: updatedUnlockedIds,
              productName: currentSub.hasPaidOffer && currentSub.productName !== newSub.productName
                ? `${currentSub.productName} + ${newSub.productName}`
                : newSub.productName,
              priceDisplay: newSub.priceDisplay || currentSub.priceDisplay,
              telegramChannels: (newSub.telegramChannels && newSub.telegramChannels.length > 0)
                ? newSub.telegramChannels
                : currentSub.telegramChannels,
              discordChannels: (newSub.discordChannels && newSub.discordChannels.length > 0)
                ? newSub.discordChannels
                : currentSub.discordChannels,
              discordInvite: newSub.discordInvite || currentSub.discordInvite,
            };
            saveSubscription(userKey, updatedSubscription);
            setCurrentSub(updatedSubscription);
            setCheckoutModalOffer(null);
          }}
          user={user}
        />
      )}

      {/* Enterprise Branding Configuration Modal - Restreint exclusivement au créateur propriétaire */}
      {isCompanyOwner && (
        <EnterpriseBrandingModal
          isOpen={isBrandingModalOpen}
          onClose={() => setIsBrandingModalOpen(false)}
          company={{
            id: currentSub.companyId,
            name: currentSub.companyName,
            description: currentSub.productName,
            companyBanner: currentSub.companyBanner,
            companyLogo: currentSub.companyLogo,
          }}
          onSave={handleSaveBranding}
          lang={lang}
        />
      )}

      {/* Mini-page / Modal Dédiée : Gérer l'Adhésion */}
      <ManageMembershipModal
        isOpen={isManageMembershipModalOpen}
        onClose={() => setIsManageMembershipModalOpen(false)}
        subscription={currentSub}
        onCancelSubscription={handleCancelActiveSubscription}
        onLeaveCompany={handleLeaveEnterprise}
        onViewOffers={() => {
          setIsManageMembershipModalOpen(false);
          setCompanyTab("produits");
        }}
        lang={lang}
      />

      {/* Interface de signalement d'une entreprise */}
      <ReportEnterpriseModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        companyName={currentSub.companyName || subscription.companyName}
      />

      {/* Toast notification de confirmation : ✅ Lien copié */}
      {copiedLinkToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-emerald-500/30 text-white shadow-2xl shadow-black/80">
            <span className="text-base">✅</span>
            <span className="text-sm font-semibold">Lien copié</span>
          </div>
        </div>
      )}

      {/* Notification Toasts pour Téléchargement E-book & Accès Formation */}
      {ebookDownloadToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-emerald-500/40 text-emerald-300 shadow-2xl shadow-black/80">
            <BookOpen className="size-4 text-emerald-400" />
            <span className="text-sm font-semibold">{ebookDownloadToast}</span>
          </div>
        </div>
      )}

      {courseAccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900 border border-indigo-500/40 text-indigo-300 shadow-2xl shadow-black/80">
            <GraduationCap className="size-4 text-indigo-400" />
            <span className="text-sm font-semibold">{courseAccessToast}</span>
          </div>
        </div>
      )}

      {/* Modal Consultation E-book (ressources strictement rattachées aux offres débloquées) */}
      {isEbookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-[#12141c] border border-white/10 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">E-books & Guides Inclus</h3>
                  <p className="text-xs text-zinc-400">{currentSub.companyName} · Accès selon votre offre</p>
                </div>
              </div>
              <button
                onClick={() => setIsEbookModalOpen(false)}
                className="size-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {/* E-books débloqués par l'offre achetée */}
              {authorizedEbooks.length > 0 ? (
                authorizedEbooks.map((eb) => (
                  <div key={eb.id} className="p-4 rounded-xl bg-[#161822] border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{eb.title}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {eb.pagesCount ? `${eb.pagesCount} pages · ` : ""}
                        {eb.description || "Format PDF haute résolution"}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-1">
                        <CheckCircle2 className="size-3" />
                        <span>Inclus dans votre offre</span>
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownloadEbook(eb)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Télécharger
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5">
                  <div className="text-xs font-bold text-amber-300">Aucun e-book débloqué avec votre offre actuelle</div>
                  <p className="text-[11px] text-zinc-400">
                    Cette ressource requiert une offre spécifique incluant les guides téléchargeables.
                  </p>
                </div>
              )}

              {/* Autres E-books de l'entreprise non débloqués */}
              {otherCompanyEbooks.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <Lock className="size-3 text-zinc-500" />
                    <span>Autres e-books de l'entreprise</span>
                  </div>
                  {otherCompanyEbooks.map(({ ebook, requiredOffer }) => (
                    <div key={ebook.id} className="p-3.5 rounded-xl bg-[#0e1017] border border-white/5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-300 truncate">{ebook.title}</div>
                        <div className="text-[10px] text-amber-400/90 font-medium mt-0.5 flex items-center gap-1">
                          <Lock className="size-2.5" />
                          <span>Requis : {requiredOffer.title} ({requiredOffer.priceDisplay})</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsEbookModalOpen(false);
                          setActiveTab("accueil");
                          setCompanyTab("produits");
                          setCheckoutModalOffer(requiredOffer);
                        }}
                        className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                      >
                        Débloquer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setIsEbookModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {creatorAppStep !== "closed" && isCompanyOwner && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#12141c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">{currentSub.companyName}</div>
                <h2 className="mt-1 text-lg font-bold text-white">
                  {creatorAppStep === "choose" ? "Ajouter une application" : creatorAppStep === "link" ? "Accès à l’application" : `Configurer ${selectedCreatorApp ? creatorAppMeta[selectedCreatorApp].title : "l’application"}`}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {creatorAppStep === "choose" ? "Choisissez l’application à ajouter à cette entreprise." : creatorAppStep === "link" ? "Définissez quels produits peuvent accéder à cette application." : "Ajoutez ou modifiez le contenu sans quitter la Communauté."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatorAppStep("closed")}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Fermer"
              >
                <X className="size-5" />
              </button>
            </div>

            {creatorAppStep === "choose" && (
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {(Object.keys(creatorAppMeta) as CreatorAppId[]).map((appId) => (
                  <button
                    type="button"
                    key={appId}
                    onClick={() => chooseCreatorApp(appId)}
                    className="rounded-xl border border-white/10 bg-[#0c0d0e] p-4 text-left transition-colors hover:border-blue-500/50 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-white/5 text-2xl">{creatorAppMeta[appId].icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{creatorAppMeta[appId].title}</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-zinc-400">{creatorAppMeta[appId].description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {creatorAppStep === "link" && selectedCreatorApp && (
              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-white/10 bg-[#0c0d0e] p-3 text-xs text-zinc-300">
                  Application sélectionnée : <strong className="text-white">{creatorAppMeta[selectedCreatorApp].title}</strong>
                </div>
                <div className="space-y-2">
                  {enterpriseOffers.length === 0 ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">Créez d’abord un produit pour lier cette application.</div>
                  ) : enterpriseOffers.map((offer) => {
                    const checked = linkedCreatorProductIds.includes(offer.id);
                    return (
                      <label key={offer.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#0c0d0e] px-4 py-3 hover:border-white/20">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{offer.title}</span>
                          <span className="mt-1 block text-[11px] text-zinc-500">{offer.subscribersCount || 0} actif(s) · {offer.priceDisplay || "Gratuit"}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setLinkedCreatorProductIds((ids) => checked ? ids.filter((id) => id !== offer.id) : [...ids, offer.id])}
                          className="size-4 accent-blue-500"
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <button type="button" onClick={() => setCreatorAppStep("choose")} className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">Retour</button>
                  <button type="button" disabled={linkedCreatorProductIds.length === 0} onClick={continueCreatorAppContent} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Fait · Ajouter le contenu</button>
                </div>
              </div>
            )}

            {creatorAppStep === "content" && selectedCreatorApp && (
              <div className="space-y-4 p-5">
                {(selectedCreatorApp === "courses" || selectedCreatorApp === "files") && (
                  <>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-300">{selectedCreatorApp === "courses" ? "Nom du cours" : "Nom du fichier"}</span>
                      <input value={selectedCreatorApp === "courses" ? creatorCourseName : creatorFileName} onChange={(event) => selectedCreatorApp === "courses" ? setCreatorCourseName(event.target.value) : setCreatorFileName(event.target.value)} placeholder={selectedCreatorApp === "courses" ? "Ex. Formation Trading débutant" : "Ex. Guide PDF premium"} className="w-full rounded-xl border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                    </label>
                    {selectedCreatorApp === "courses" ? (
                      <>
                        <label className="block space-y-1.5"><span className="text-xs font-semibold text-zinc-300">Description</span><textarea value={creatorCourseDescription} onChange={(event) => setCreatorCourseDescription(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" /></label>
                        <div className="rounded-xl border border-white/10 bg-[#0c0d0e] p-4">
                          <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-white">Chapitres</span><span className="text-[10px] text-zinc-500">YouTube · vidéo · pièces jointes · texte</span></div>
                          <div className="space-y-2">{creatorChapterNames.map((chapter, index) => <div key={`${chapter}-${index}`} className="flex items-center gap-2"><input value={chapter} onChange={(event) => setCreatorChapterNames((chapters) => chapters.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#161822] px-3 py-2 text-xs text-white outline-none" /><button type="button" onClick={() => setCreatorChapterNames((chapters) => chapters.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-red-300"><X className="size-3.5" /></button></div>)}</div>
                          <div className="mt-3 flex gap-2"><input value={creatorNewChapterName} onChange={(event) => setCreatorNewChapterName(event.target.value)} placeholder="Nom du nouveau chapitre" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#161822] px-3 py-2 text-xs text-white outline-none" /><button type="button" onClick={() => { if (creatorNewChapterName.trim()) { setCreatorChapterNames((chapters) => [...chapters, creatorNewChapterName.trim()]); setCreatorNewChapterName(""); } }} className="rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/15">+ Chapitre</button></div>
                        </div>
                      </>
                    ) : (
                      <label className="block space-y-1.5"><span className="text-xs font-semibold text-zinc-300">Contenu du fichier</span><input type="file" className="block w-full rounded-xl border border-dashed border-white/20 bg-[#0c0d0e] px-3 py-5 text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" /></label>
                    )}
                  </>
                )}
                {(selectedCreatorApp === "telegram" || selectedCreatorApp === "discord") && (
                  <div className="rounded-xl border border-white/10 bg-[#0c0d0e] p-5 text-center">
                    <div className="text-3xl">{creatorAppMeta[selectedCreatorApp].icon}</div>
                    <p className="mt-2 text-sm font-semibold text-white">Configurer {creatorAppMeta[selectedCreatorApp].title}</p>
                    <p className="mt-1 text-xs text-zinc-400">Les produits sélectionnés sont enregistrés. Continuez la connexion du canal ou du serveur depuis l’onglet correspondant de cette entreprise.</p>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/10 pt-4"><button type="button" onClick={() => setCreatorAppStep("link")} className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white">Retour</button><button type="button" onClick={finishCreatorAppWorkflow} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500">Enregistrer dans cette entreprise</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Consultation Formation / Masterclass (ressources strictement rattachées aux offres débloquées) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-[#12141c] border border-white/10 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Formations & Modules Inclus</h3>
                  <p className="text-xs text-zinc-400">{currentSub.companyName} · Accès selon votre offre</p>
                </div>
              </div>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="size-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {/* Formations débloquées par l'offre achetée */}
              {authorizedCourses.length > 0 ? (
                authorizedCourses.map((co) => (
                  <div key={co.id} className="p-4 rounded-xl bg-[#161822] border border-purple-500/30 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{co.title}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {co.duration ? `${co.duration} · ` : ""}
                        {co.description || "Formation complète"}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-1">
                        <CheckCircle2 className="size-3" />
                        <span>Inclus dans votre offre</span>
                      </span>
                    </div>
                    <button
                      onClick={() => handleAccessCourse(co)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Accéder au cours
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5">
                  <div className="text-xs font-bold text-amber-300">Aucune formation débloquée avec votre offre actuelle</div>
                  <p className="text-[11px] text-zinc-400">
                    Cette ressource requiert une offre spécifique incluant les cursus vidéos de formation.
                  </p>
                </div>
              )}

              {/* Autres Formations de l'entreprise non débloquées */}
              {otherCompanyCourses.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <Lock className="size-3 text-zinc-500" />
                    <span>Autres formations de l'entreprise</span>
                  </div>
                  {otherCompanyCourses.map(({ course, requiredOffer }) => (
                    <div key={course.id} className="p-3.5 rounded-xl bg-[#0e1017] border border-white/5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-300 truncate">{course.title}</div>
                        <div className="text-[10px] text-amber-400/90 font-medium mt-0.5 flex items-center gap-1">
                          <Lock className="size-2.5" />
                          <span>Requis : {requiredOffer.title} ({requiredOffer.priceDisplay})</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsCourseModalOpen(false);
                          setActiveTab("accueil");
                          setCompanyTab("produits");
                          setCheckoutModalOffer(requiredOffer);
                        }}
                        className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                      >
                        Débloquer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
