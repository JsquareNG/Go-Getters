import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  LayoutGrid,
  FileSearch,
  Wallet,
  User,
  Bell,
  LogOut,
  Columns3Cog,
  Circle,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./DropdownMenu";

import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { ScrollArea } from "../primitives/Scroll-area";
import { Avatar, AvatarFallback, Button } from "../primitives";

import dbslogo from "@/assets/dbslogo.png";

import { useDispatch, useSelector } from "react-redux";
import { selectUser, logout } from "@/store/authSlice";

import {
  getAllNotifications,
  getUnreadNotifications,
  readOneApplication,
  readAllApplication,
} from "../../../api/notificationsApi";

const LandingNavBar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector(selectUser);
  const userRole = user?.role;

  // recipientId is the same as user (your redux stores user_id)
  const recipientId = user?.user_id;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifError, setNotifError] = useState(null);

  // Tracks which applicationIds are currently being marked read (to avoid double clicks)
  const [updatingAppIds, setUpdatingAppIds] = useState(() => new Set());
  const [markingAll, setMarkingAll] = useState(false);

  const toTitle = useCallback((n) => {
    if (n?.from_status && n?.to_status)
      return `Status Update: ${n.from_status} → ${n.to_status}`;
    if (n?.to_status) return `Status Update: ${n.to_status}`;
    return "Notification";
  }, []);

  const timeAgo = useCallback((isoString) => {
    if (!isoString) return "";
    const t = new Date(isoString).getTime();
    if (Number.isNaN(t)) return "";

    const diffMs = Date.now() - t;
    const sec = Math.max(1, Math.floor(diffMs / 1000));
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${day}d ago`;
  }, []);

  const mapApiNotificationToUi = useCallback(
    (n) => ({
      id: n.notification_id,
      title: toTitle(n),
      message: n.message,
      time: timeAgo(n.created_at),
      read: !!n.is_read,

      applicationId: n.application_id,
      fromStatus: n.from_status,
      toStatus: n.to_status,
      createdAt: n.created_at,
    }),
    [timeAgo, toTitle],
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!recipientId) return;

    try {
      const data = await getUnreadNotifications(recipientId);
      const count = Number(data?.total ?? 0);
      setUnreadCount(Number.isFinite(count) ? count : 0);
    } catch (e) {
      // optional: keep old count, don't hard fail
    }
  }, [recipientId]);

  const fetchAllNotifications = useCallback(async () => {
    if (!recipientId) return;

    setLoadingNotifs(true);
    setNotifError(null);

    try {
      const data = await getAllNotifications(recipientId);
      const ui = (data?.notifications || []).map(mapApiNotificationToUi);
      ui.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(ui);

      // fallback sync for badge
      const unreadFromAll = Number(data?.unread);
      if (Number.isFinite(unreadFromAll)) setUnreadCount(unreadFromAll);
    } catch (e) {
      setNotifError("Failed to load notifications");
    } finally {
      setLoadingNotifs(false);
    }
  }, [recipientId, mapApiNotificationToUi]);

  useEffect(() => {
    if (!recipientId) return;
    fetchUnreadCount();
    fetchAllNotifications();
  }, [recipientId, fetchUnreadCount, fetchAllNotifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications],
  );

  const readNotifications = useMemo(
    () => notifications.filter((n) => n.read),
    [notifications],
  );

  /**
   * ✅ Mark ONE notification/application as read, THEN navigate to details page
   * Backend endpoint is /bell/read-one/:applicationId
   */
  const handleMarkOneReadAndGo = useCallback(
    async (notif) => {
      const applicationId = notif?.applicationId;
      if (!applicationId) return;

      // prevent spam clicks
      if (updatingAppIds.has(applicationId) || markingAll) return;

      const wasUnread = !notif.read;
      const prevNotifications = notifications;

      // optimistic UI update (only if unread)
      if (wasUnread) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.applicationId === applicationId ? { ...n, read: true } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      setUpdatingAppIds((prev) => {
        const next = new Set(prev);
        next.add(applicationId);
        return next;
      });

      try {
        if (wasUnread) {
          await readOneApplication(applicationId);
          await Promise.all([fetchUnreadCount(), fetchAllNotifications()]);
        }
      } catch (e) {
        if (wasUnread) setNotifications(prevNotifications);
        await Promise.all([fetchUnreadCount(), fetchAllNotifications()]);
      } finally {
        setUpdatingAppIds((prev) => {
          const next = new Set(prev);
          next.delete(applicationId);
          return next;
        });

        // ✅ navigate to the application detail page for this applicationId
        // Change the route below if your route differs.
        navigate(`/landingpage/${applicationId}`);
      }
    },
    [
      notifications,
      updatingAppIds,
      markingAll,
      fetchUnreadCount,
      fetchAllNotifications,
      navigate,
    ],
  );

  /**
   * ✅ Mark ALL as read (backend + UI)
   * Backend endpoint is /bell/read-all/:recipientId
   */
  const handleMarkAllRead = useCallback(async () => {
    if (!recipientId) return;
    if (markingAll) return;

    // optimistic UI update
    const prevNotifications = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    setMarkingAll(true);

    try {
      await readAllApplication(recipientId);
      await Promise.all([fetchUnreadCount(), fetchAllNotifications()]);
    } catch (e) {
      // rollback optimistic update
      setNotifications(prevNotifications);
      await Promise.all([fetchUnreadCount(), fetchAllNotifications()]);
    } finally {
      setMarkingAll(false);
    }
  }, [
    recipientId,
    markingAll,
    notifications,
    fetchUnreadCount,
    fetchAllNotifications,
  ]);

  const navItems = [
    {
      icon: FileSearch,
      label: "Staff Landing",
      to: "/staff-landingpage",
      roles: ["STAFF"],
    },
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      to: "/dashboard",
      roles: ["STAFF"],
    },
    {
      icon: Columns3Cog,
      label: "Admin Config",
      to: "/admin-config",
      roles: ["STAFF"],
    },
    {
      icon: LayoutGrid,
      label: "Applications",
      to: "/landingpage",
      roles: ["SME"],
    },
    {
      icon: Wallet,
      label: "Accounts",
      to: "/accountspage",
      roles: ["SME"],
    },
  ];

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const getInitials = () => {
    if (!user?.first_name) return "U";
    const firstInitial = user.first_name.charAt(0);
    const lastInitial = user.last_name ? user.last_name.charAt(0) : "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <img src={dbslogo} alt="DBS SME Logo" className="h-6 w-auto" />

          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-2">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-green-600 bg-green-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative inline-flex items-center justify-center rounded-md px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="Notifications"
                    onClick={() => {
                      fetchUnreadCount();
                      fetchAllNotifications();
                    }}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  className="w-80 max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Notifications
                    </h4>

                    {unreadCount > 0 && !loadingNotifs && !notifError && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-green-600 hover:underline disabled:opacity-50"
                        type="button"
                        disabled={markingAll}
                      >
                        {markingAll ? "Marking..." : "Mark all as read"}
                      </button>
                    )}
                  </div>

                  {loadingNotifs ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      Loading notifications...
                    </p>
                  ) : notifError ? (
                    <div className="p-4 text-sm text-center">
                      <p className="text-destructive">{notifError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          fetchUnreadCount();
                          fetchAllNotifications();
                        }}
                        className="mt-2 text-xs text-green-600 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      No notifications
                    </p>
                  ) : (
                    <ScrollArea className="h-80">
                      <div>
                        {unreadNotifications.length > 0 && (
                          <div className="bg-gray-50/60">
                            <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Unread
                            </p>

                            {unreadNotifications.map((n) => {
                              const isUpdating =
                                markingAll ||
                                updatingAppIds.has(n.applicationId);

                              return (
                                <button
                                  key={n.id}
                                  onClick={() => handleMarkOneReadAndGo(n)}
                                  type="button"
                                  disabled={isUpdating}
                                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                                    isUpdating
                                      ? "opacity-60 cursor-not-allowed"
                                      : "bg-green-50 hover:bg-green-100/60"
                                  }`}
                                >
                                  <Circle className="mt-1 h-2 w-2 shrink-0 fill-green-600 text-green-600" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">
                                      {n.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground whitespace-normal break-words">
                                      {n.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {n.time}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {readNotifications.length > 0 && (
                          <div>
                            <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider border-t border-border">
                              Earlier
                            </p>

                            {readNotifications.map((n) => (
                              <div
                                key={n.id}
                                className="flex w-full items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="mt-1 h-2 w-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground opacity-70">
                                    {n.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground whitespace-normal break-words">
                                    {n.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {n.time}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-3 px-2 hover:bg-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-bold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm font-semibold text-gray-700 md:inline-block">
                        {user?.first_name} {user?.last_name || ""}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <button
                      onClick={() => navigate("/profile")}
                      className="nav-item text-muted-foreground hover:text-foreground"
                      type="button"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <button
                      onClick={handleLogout}
                      className="nav-item text-muted-foreground hover:text-foreground"
                      type="button"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export { LandingNavBar };