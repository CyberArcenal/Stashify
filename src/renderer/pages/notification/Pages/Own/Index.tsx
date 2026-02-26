// pages/NotificationsPage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  ChevronDown,
  Search,
  Shield,
  Truck,
  Box,
  User,
  UserCheck,
  AlertTriangle,
  Database,
  RefreshCw,
  ShoppingBag,
  Warehouse,
  UserCog,
  TrendingDown,
  ShoppingCart,
  Package,
  AlertCircle,
  Info,
} from "lucide-react";
import notificationAPI, {
  NotificationData,
  NotificationStats,
} from "@/renderer/api/notifications";

// Icon mapping based on notification type key
const NOTIFICATION_ICONS: Record<string, React.ComponentType<any>> = {
  // Inventory related
  inventory: Warehouse,
  inventory_update: Database,
  low_stock: TrendingDown,
  out_of_stock: AlertTriangle,
  auto_reorder_triggered: RefreshCw,

  // Order related
  order: ShoppingBag,
  new_order: ShoppingCart,
  order_alert: ShoppingCart,
  order_status_alert: ShoppingCart,
  purchase_alert: ShoppingCart,

  // Security related
  security: Shield,
  security_alert: Shield,

  // System related
  system_alert: AlertCircle,

  // Product related
  product: Box,
  product_notification: Package,

  // Supplier related
  supplier_update: Truck,
  supplier_alert: Truck,

  // Account related
  account: User,
  verification: UserCheck,
  profile: UserCog,

  // Default
  default: Bell,
};

// Color mapping based on notification type
const NOTIFICATION_COLORS: Record<string, { text: string; bg: string }> = {
  // Critical alerts
  out_of_stock: {
    text: "text-[var(--danger-color)]",
    bg: "bg-[var(--danger-color)]",
  },
  security_alert: {
    text: "text-[var(--danger-color)]",
    bg: "bg-[var(--danger-color)]",
  },
  system_alert: {
    text: "text-[var(--danger-color)]",
    bg: "bg-[var(--danger-color)]",
  },

  // Warnings
  low_stock: {
    text: "text-[var(--warning-color)]",
    bg: "bg-[var(--warning-color)]",
  },
  inventory: {
    text: "text-[var(--warning-color)]",
    bg: "bg-[var(--warning-color)]",
  },
  inventory_update: {
    text: "text-[var(--warning-color)]",
    bg: "bg-[var(--warning-color)]",
  },

  // Success/Info
  order: {
    text: "text-[var(--success-color)]",
    bg: "bg-[var(--success-color)]",
  },
  new_order: {
    text: "text-[var(--success-color)]",
    bg: "bg-[var(--success-color)]",
  },
  purchase_alert: {
    text: "text-[var(--success-color)]",
    bg: "bg-[var(--success-color)]",
  },

  // Supplier
  supplier_update: {
    text: "text-[var(--accent-purple)]",
    bg: "bg-[var(--accent-purple)]",
  },
  supplier_alert: {
    text: "text-[var(--accent-purple)]",
    bg: "bg-[var(--accent-purple)]",
  },

  // Account
  account: { text: "text-[var(--accent-teal)]", bg: "bg-[var(--accent-teal)]" },
  verification: {
    text: "text-[var(--accent-teal)]",
    bg: "bg-[var(--accent-teal)]",
  },
  profile: { text: "text-[var(--accent-teal)]", bg: "bg-[var(--accent-teal)]" },

  // Default
  default: { text: "text-[var(--accent-blue)]", bg: "bg-[var(--accent-blue)]" },
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const pageSize = 20;

  useEffect(() => {
    searchRef.current?.focus();
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadNotifications();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadStats = async () => {
    try {
      const statsData = await notificationAPI.getStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load notification stats:", error);
    }
  };

  const loadNotifications = async (
    page: number = 1,
    append: boolean = false,
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const filters: any = {};
      if (filter === "unread") filters.is_read = false;
      if (filter === "read") filters.is_read = true;
      if (searchQuery) filters.search = searchQuery;

      const response = await notificationAPI.findPage(pageSize, page, filters);

      if (append) {
        setNotifications((prev) => [...prev, ...response.data]);
      } else {
        setNotifications(response.data);
      }

      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
      loadStats();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true })),
      );
      loadStats();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleFilterChange = (newFilter: "all" | "unread" | "read") => {
    setFilter(newFilter);
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    if (pagination && currentPage < pagination.total_pages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadNotifications(nextPage, true);
    }
  };

  const getNotificationIcon = (notification: NotificationData) => {
    const typeName = notification.notification_type_name?.toLowerCase() || "";
    const keys = Object.keys(NOTIFICATION_ICONS);

    for (const key of keys) {
      if (
        typeName.includes(key.toLowerCase()) ||
        notification.notification_type_name
          ?.toLowerCase()
          .includes(key.toLowerCase())
      ) {
        return NOTIFICATION_ICONS[key];
      }
    }

    return NOTIFICATION_ICONS.default;
  };

  const getNotificationColor = (notification: NotificationData) => {
    const typeName = notification.notification_type_name?.toLowerCase() || "";
    const keys = Object.keys(NOTIFICATION_COLORS);

    for (const key of keys) {
      if (
        typeName.includes(key.toLowerCase()) ||
        notification.notification_type_name
          ?.toLowerCase()
          .includes(key.toLowerCase())
      ) {
        return NOTIFICATION_COLORS[key];
      }
    }

    return NOTIFICATION_COLORS.default;
  };

  const getNotificationRoute = (
    notification: NotificationData,
  ): string | null => {
    const type = notification.notification_type_name?.toLowerCase();
    const productSku = notification.product_sku;

    // Product-related notifications
    if (
      type?.includes("product") ||
      type?.includes("stock") ||
      type?.includes("inventory")
    ) {
      if (productSku) {
        // Navigate to product detail if we have SKU
        return `/products/view/${notification.productId || ""}`;
      } else if (type?.includes("low_stock")) {
        return "/products/low-stock";
      } else if (type?.includes("out_of_stock")) {
        return "/products/out-of-stock";
      }
      return "/products";
    }

    // Order-related notifications
    if (type?.includes("order")) {
      if (type?.includes("new_order")) {
        return "/orders/pending";
      }
      return "/orders";
    }

    // Purchase-related notifications
    if (type?.includes("purchase")) {
      return "/purchases";
    }

    // Security and account notifications
    if (
      type?.includes("security") ||
      type?.includes("account") ||
      type?.includes("verification")
    ) {
      return "/myprofile";
    }

    // System alerts - go to dashboard
    if (type?.includes("system")) {
      return "/dashboard";
    }

    // Supplier notifications
    if (type?.includes("supplier")) {
      return "/suppliers";
    }

    return null;
  };

  const handleNotificationClick = (notification: NotificationData) => {
    const route = getNotificationRoute(notification);

    // Mark as read when clicked
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to relevant page if route exists
    if (route) {
      navigate(route);
    }
  };

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getGroupTitle = (notification: NotificationData, index: number) => {
    const date = new Date(notification.created_at);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return "This Week";
    if (diffInDays < 30) return "This Month";
    return "Older";
  };

  const shouldShowGroupTitle = (
    notification: NotificationData,
    index: number,
  ) => {
    if (index === 0) return true;

    const currentDate = new Date(notification.created_at);
    const prevDate = new Date(notifications[index - 1].created_at);

    const currentGroup = getGroupTitle(notification, index);
    const prevGroup = getGroupTitle(notifications[index - 1], index - 1);

    return currentGroup !== prevGroup;
  };

  const displayNotifications = notifications;

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] compact-card">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-[var(--card-secondary-bg)] rounded w-1/4 m-base"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-[var(--card-bg)] rounded-lg compact-card m-sm"
              >
                <div className="flex gap-md">
                  <div className="w-10 h-10 bg-[var(--card-secondary-bg)] rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-[var(--card-secondary-bg)] rounded w-3/4 m-sm"></div>
                    <div className="h-3 bg-[var(--card-secondary-bg)] rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)] compact-card">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="m-lg">
          <div className="flex items-center justify-between m-base">
            <div className="flex items-center gap-base">
              <Link
                to="/"
                className="flex items-center gap-sm text-[var(--sidebar-text)] hover:text-[var(--primary-color)] transition-colors"
              >
                <ArrowLeft className="icon-sm" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 bg-[var(--primary-color)] rounded-lg flex items-center justify-center">
                  <Bell className="icon-lg text-[var(--sidebar-text)]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--sidebar-text)]">
                    Notifications
                  </h1>
                  <p className="text-[var(--sidebar-text)] text-sm">
                    {stats
                      ? `${stats.total} total notifications`
                      : "Loading..."}
                  </p>
                </div>
              </div>
            </div>

            {stats && stats.unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="compact-button bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--sidebar-text)] rounded-lg font-medium transition-colors flex items-center gap-sm"
              >
                <CheckCircle2 className="icon-sm" />
                Mark All as Read
              </button>
            )}
          </div>

          {/* Stats and Filters */}
          <div className="bg-[var(--sidebar-bg)] rounded-lg compact-card shadow-sm border border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-base">
              <div className="flex items-center gap-xl">
                <div className="text-center">
                  <div className="text-xl font-bold text-[var(--sidebar-text)]">
                    {stats?.total || 0}
                  </div>
                  <div className="text-sm text-[var(--sidebar-text)]">
                    Total
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[var(--primary-color)]">
                    {stats?.unread || 0}
                  </div>
                  <div className="text-sm text-[var(--sidebar-text)]">
                    Unread
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[var(--accent-blue)]">
                    {stats?.recent_7d || 0}
                  </div>
                  <div className="text-sm text-[var(--sidebar-text)]">
                    This Week
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-md">
                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                  <div className="ml-1 absolute inset-y-0 left-0 flex items-center pl-md pointer-events-none">
                    <Search className="icon-sm text-[var(--sidebar-text)]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    ref={searchRef}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="compact-input pl-xl border border-[var(--border-color)] rounded-lg bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] placeholder-[var(--sidebar-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent"
                  />
                </form>

                {/* Filter Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-sm compact-button border border-[var(--border-color)] rounded-lg bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] hover:bg-[var(--background-color)] transition-colors"
                  >
                    <Filter className="icon-sm" />
                    <span className="capitalize text-sm">{filter}</span>
                    <ChevronDown
                      className={`icon-sm transition-transform ${showFilterDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute top-full right-0 m-xs w-48 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg shadow-lg z-10">
                      {(["all", "unread", "read"] as const).map(
                        (filterOption) => (
                          <button
                            key={filterOption}
                            onClick={() => handleFilterChange(filterOption)}
                            className={`w-full text-left compact-button hover:bg-[var(--background-color)] transition-colors first:rounded-t-lg last:rounded-b-lg capitalize text-sm ${
                              filter === filterOption
                                ? "bg-[var(--primary-color)] text-[var(--sidebar-text)] hover:bg-[var(--primary-hover)]"
                                : "text-[var(--sidebar-text)]"
                            }`}
                          >
                            {filterOption}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-xl">
          {displayNotifications.length === 0 ? (
            <div className="bg-[var(--sidebar-bg)] rounded-lg p-xl text-center border border-[var(--border-color)]">
              <Bell className="icon-xl text-[var(--border-color)] mx-auto m-base" />
              <h3 className="text-base font-semibold text-[var(--sidebar-text)] m-sm">
                No notifications found
              </h3>
              <p className="text-[var(--sidebar-text)] text-sm">
                {filter === "all"
                  ? "You're all caught up! No notifications to display."
                  : `No ${filter} notifications found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-xs">
              {displayNotifications.map((notification, index) => {
                const Icon = getNotificationIcon(notification);
                const notificationColor = getNotificationColor(notification);
                const showGroup = shouldShowGroupTitle(notification, index);
                const hasRoute = getNotificationRoute(notification) !== null;

                return (
                  <React.Fragment key={notification.id}>
                    {showGroup && (
                      <div className="flex items-center gap-base m-xl">
                        <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                        <span className="text-sm font-medium text-[var(--sidebar-text)] px-base py-xs bg-[var(--sidebar-bg)] rounded-full">
                          {getGroupTitle(notification, index)}
                        </span>
                        <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                      </div>
                    )}

                    {/* Palitan ang buong notification item div */}
                    {/* Palitan ang buong notification item div - COMPLETE REWRITE */}
                    <div
                      className={`mt-1 rounded-lg border transition-all duration-200 group hover:shadow-md ${
                        notification.is_read
                          ? "bg-[var(--notification-read-bg)] border-[var(--border-color)] hover:border-[var(--border-light)]"
                          : "bg-[var(--notification-unread-bg)] border-l-4 border-l-[var(--primary-color)] border-r border-t border-b border-[var(--primary-color)] animate-pulse-gentle"
                      } ${
                        hasRoute
                          ? "cursor-pointer hover:bg-[var(--card-hover-bg)]"
                          : ""
                      }`}
                      onClick={() =>
                        hasRoute && handleNotificationClick(notification)
                      }
                    >
                      <div className="compact-card">
                        <div className="flex gap-base">
                          {/* Icon - improved contrast */}
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              notification.is_read
                                ? "bg-[var(--sidebar-bg)]"
                                : "bg-[var(--primary-color)]"
                            }`}
                          >
                            <Icon
                              className={`icon-lg ${
                                notification.is_read
                                  ? "text-[var(--sidebar-text)]"
                                  : "text-white"
                              }`}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-base m-sm">
                              <h3
                                className={`font-semibold text-base ${
                                  notification.is_read
                                    ? "text-[var(--notification-read-text)]"
                                    : "text-[var(--notification-unread-text)] font-bold"
                                }`}
                              >
                                {notification.title}
                              </h3>

                              <div className="flex items-center gap-md flex-shrink-0">
                                <span
                                  className={`text-sm flex items-center gap-xs ${
                                    notification.is_read
                                      ? "text-[var(--notification-read-text)]"
                                      : "text-[var(--notification-unread-text)] opacity-90"
                                  }`}
                                >
                                  <Clock className="icon-sm" />
                                  {formatTime(notification.created_at)}
                                </span>

                                {!notification.is_read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-xs rounded hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200"
                                    title="Mark as read"
                                  >
                                    <Check className="icon-sm text-[var(--notification-unread-text)] hover:text-[var(--primary-hover)]" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p
                              className={`${
                                notification.is_read
                                  ? "text-[var(--notification-read-text)]"
                                  : "text-[var(--notification-unread-text)] opacity-95"
                              } m-md leading-relaxed text-sm`}
                            >
                              {notification.message}
                            </p>

                            {notification.product_name && (
                              <div
                                className={`flex items-center gap-sm text-sm m-md ${
                                  notification.is_read
                                    ? "text-[var(--notification-read-text)]"
                                    : "text-[var(--notification-unread-text)] opacity-90"
                                }`}
                              >
                                <Package className="icon-sm" />
                                <span className="text-sm">
                                  {notification.product_name}
                                  {notification.product_sku &&
                                    ` (${notification.product_sku})`}
                                  {notification.quantity !== null &&
                                    ` • Qty: ${notification.quantity}`}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              {/* Notification type badge */}
                              <span
                                className={`inline-flex items-center gap-xs px-md py-xs rounded-full text-xs font-medium ${
                                  notification.is_read
                                    ? "bg-[var(--sidebar-bg)] text-[var(--notification-read-text)]"
                                    : "bg-[rgba(255,255,255,0.15)] text-[var(--notification-unread-text)]"
                                }`}
                              >
                                <Icon className="icon-xs" />
                                {notification.notification_type_name}
                              </span>

                              {!notification.is_read && (
                                <span className="inline-flex items-center px-sm py-xs rounded-full text-xs font-medium bg-[var(--primary-color)] text-white">
                                  New
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {pagination && currentPage < pagination.total_pages && (
            <div className="flex justify-center m-lg">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="compact-button bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg text-[var(--sidebar-text)] hover:bg-[var(--background-color)] transition-colors font-medium flex items-center gap-sm"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--primary-color)]"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <ChevronDown className="icon-sm" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Pagination Info */}
          {pagination && (
            <div className="text-center text-[var(--sidebar-text)] text-sm m-xl">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, pagination.count)} of{" "}
              {pagination.count} notifications
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
