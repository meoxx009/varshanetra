"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  MapPin,
  Activity,
  Bell,
  BellRing,
  User,
  LogOut,
  ChevronDown,
  IdCard,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Users,
  FileText,
  ServerCrash,
  Radio,
  Download,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useDistrictLocation } from "@/hooks/use-district-location";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { LocationSelectorDialog } from "@/components/layout/location-selector-dialog";
import { NotificationItem, NotificationEventType } from "@/types/notifications";
import { SeverityLevel } from "@/types";
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslations, useLocale } from "@/lib/i18n/context";

interface TopNavigationProps {
  onMenuClick: () => void;
}

export function TopNavigation({ onMenuClick }: TopNavigationProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const { profile, logout } = useAuth();
  const { location } = useDistrictLocation();
  const { isInstallable, triggerInstall } = useNetworkStatus();
  const tCommon = useTranslations("common");
  const tNav = useTranslations("navigation");
  const tNotif = useTranslations("notifications");

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  // Live Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  // Keyboard accessibility: Close open dropdowns with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch live notifications
  const fetchLiveNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=6");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.warn("[VarshaNetra] Error fetching header notifications:", err);
    }
  }, []);

  useEffect(() => {
    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [fetchLiveNotifications]);

  // Check browser Notification API permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === "granted") {
          new Notification("VarshaNetra Emergency Alerts", {
            body: "Desktop operational notifications enabled.",
            icon: "/icons/icon-192x192.png",
          });
        }
      } catch (e) {
        console.warn("Could not request notification permission:", e);
      }
    }
  };

  const handleMarkItemRead = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await fetch(`/api/notifications/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.warn("Failed to mark notification read:", err);
      }
    }
    setShowNotifications(false);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    }
  };

  const officerName = profile?.full_name || "Dr. Rajesh Sharma, IAS";
  const officerGovId = profile?.government_id || "MH-REV-2024-889";
  const officerRole = profile?.role || "Incident Commander";

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getEventIcon = (type: NotificationEventType) => {
    switch (type) {
      case "ALERT_ISSUED":
        return <ShieldAlert className="w-3.5 h-3.5 text-red-600" />;
      case "INCIDENT_ASSIGNED":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case "RESPONSE_TEAM_ASSIGNMENT":
        return <Users className="w-3.5 h-3.5 text-blue-600" />;
      case "NEW_FIELD_REPORT":
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case "CRITICAL_DATA_SOURCE_FAILURE":
        return <ServerCrash className="w-3.5 h-3.5 text-rose-700" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case "CRITICAL":
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            {locale === "hi" ? "गंभीर" : "CRITICAL"}
          </span>
        );
      case "ALERT":
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            {locale === "hi" ? "अलर्ट" : "ALERT"}
          </span>
        );
      case "ADVISORY":
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            {locale === "hi" ? "सलाह" : "ADVISORY"}
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            {locale === "hi" ? "सामान्य" : "NORMAL"}
          </span>
        );
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shadow-xs">
        {/* Left: Mobile hamburger & Interactive Location Context Selector */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            aria-label="Open mobile navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Interactive Operational Location Selector */}
          <button
            onClick={() => setShowLocationDialog(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs transition group cursor-pointer text-left min-h-[44px]"
            aria-label={locale === "hi" ? "परिचालन ज़िला स्थान बदलें" : "Change operational district location"}
          >
            <MapPin className="w-3.5 h-3.5 text-[#2563EB] group-hover:scale-110 transition-transform shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-tight min-w-0">
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[180px]">
                {location.shortName}
              </span>
              <span className="text-slate-400 hidden md:inline">|</span>
              <span className="text-slate-500 dark:text-slate-400 hidden md:inline font-mono text-xs">
                {location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
          </button>
        </div>

        {/* Right Controls: Telemetry Health, Utilities, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Telemetry / Simulation Status Indicator */}
          {pathname === "/replay" ? (
            <Tooltip
              content={
                locale === "hi"
                  ? "ऐतिहासिक घटना पुनःप्रदर्शन सक्रिय: मौसम पैरामीटर और बाढ़ सिमुलेशन संग्रहीत घटना डेटा को दर्शाते हैं, लाइव टेलीमेट्री नहीं।"
                  : "Historical Replay active: Meteorological parameters and flood simulations reflect archived event data, not live telemetry."
              }
            >
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 dark:bg-amber-950/50 border border-amber-400 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-200 font-semibold cursor-help">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" aria-hidden="true" />
                <span>{tCommon("simulationReplay")}</span>
              </div>
            </Tooltip>
          ) : (
            <Tooltip
              content={
                locale === "hi"
                  ? "ओपन-मेटियो, ओएसएम और स्थानीय ज़िला सेंसर टेलीमेट्री चालू हैं।"
                  : "Real-time Open-Meteo, OSM, and local district sensor telemetry are operational."
              }
            >
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 cursor-help">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true" />
                <span className="font-semibold">{tCommon("liveTelemetry")}</span>
              </div>
            </Tooltip>
          )}

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block" aria-hidden="true" />

          {/* Preferences Cluster: Language & Theme */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" aria-hidden="true" />

          {/* Notifications Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="h-10 w-10 min-w-[40px] min-h-[40px] relative text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              aria-haspopup="true"
              aria-expanded={showNotifications}
              aria-label={`View emergency notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse" aria-hidden="true">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 animate-in fade-in-50 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-[#0F3D66] dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {tNotif("title")} {unreadCount > 0 ? `(${unreadCount})` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-0.5"
                        title={tNotif("markAllRead")}
                      >
                        <CheckCheck className="w-3 h-3" />
                        {tNotif("markAllRead")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="py-2 space-y-1.5 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {tNotif("noNotifications")}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.deep_link || "/notifications"}
                        onClick={() => handleMarkItemRead(n)}
                        className={`block p-2 rounded-lg border transition text-xs ${
                          !n.read
                            ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                            : "bg-slate-50/40 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="mt-0.5 shrink-0">{getEventIcon(n.event_type)}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {getSeverityBadge(n.severity)}
                                <span
                                  className={`font-bold truncate text-[11px] ${
                                    !n.read
                                      ? "text-slate-900 dark:text-white"
                                      : "text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  {n.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 text-[10px] text-slate-400">
                            <span>{getRelativeTime(n.created_at)}</span>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1" />
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {pushPermission !== "granted" ? (
                    <button
                      onClick={requestBrowserPermission}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Radio className="w-3 h-3 text-purple-600" />
                      <span>{locale === "hi" ? "वेब पुश सक्षम करें" : "Enable Web Push"}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <Radio className="w-3 h-3" /> {locale === "hi" ? "वेब पुश सक्रिय" : "Web Push Active"}
                    </span>
                  )}

                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    <span>{locale === "hi" ? "अधिसूचना केंद्र" : "Notification Center"}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu with Name, Government ID, and Sign Out */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-haspopup="true"
              aria-expanded={showUserMenu}
              aria-label={locale === "hi" ? "अधिकारी प्रोफ़ाइल मेनू" : "Officer Profile menu"}
            >
              <div className="w-8 h-8 rounded-full bg-[#0F3D66] text-white flex items-center justify-center font-bold text-xs">
                {getInitials(officerName)}
              </div>
              <div className="hidden xl:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {officerName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                  {officerGovId}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2.5 z-50 animate-in fade-in-50 duration-150 text-xs">
                {/* Profile Card Summary */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white leading-tight">
                    {officerName}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                    <IdCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>{officerGovId}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded font-medium">
                      {officerRole}
                    </span>
                    <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded font-medium">
                      {locale === "hi" ? "स्व-घोषित आईडी" : "Self-Declared ID"}
                    </span>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="py-1 space-y-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{tNav("profile")}</span>
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Bell className="w-4 h-4 text-slate-500" />
                    <span>{tNav("notifications")}</span>
                  </Link>
                  <Link
                    href="/data-sources"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Activity className="w-4 h-4 text-slate-500" />
                    <span>{tNav("dataSources")}</span>
                  </Link>

                  {isInstallable && (
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await triggerInstall();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition font-bold text-left cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{locale === "hi" ? "वर्षानेत्र ऐप इंस्टॉल करें" : "Install VarshaNetra App"}</span>
                    </button>
                  )}
                </div>

                {/* Sign Out Action */}
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={async () => {
                      setShowUserMenu(false);
                      await logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-left font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{tNav("signOut")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Location Selector Modal */}
      <LocationSelectorDialog
        isOpen={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
      />
    </>
  );
}
