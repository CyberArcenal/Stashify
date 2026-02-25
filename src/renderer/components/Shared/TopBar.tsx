// TopBar.tsx
import {
  BarChart3,
  Bell,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Truck,
  TrendingUp,
  BarChart,
  Cog,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import notificationAPI from "../../api/core/notifications";

interface RouteInfo {
  path: string;
  name: string;
  category: string;
}

interface TopBarProps {
  toggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-reload notifications every 30 seconds
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const stats = await notificationAPI.getStats();
        setUnreadCount(stats.unread || 0);
      } catch (error) {
        // Silently fail
      }
    };
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // All searchable routes (same as before)
  const allRoutes: RouteInfo[] = useMemo(
    () => [
      // ... (keep your full list)
    ],
    []
  );

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allRoutes.filter(
      (route) =>
        route.name.toLowerCase().includes(query) ||
        route.path.toLowerCase().includes(query.replace(/\s+/g, "-")) ||
        route.category.toLowerCase().includes(query)
    );
  }, [searchQuery, allRoutes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredRoutes.length > 0) {
      navigate(filteredRoutes[0].path);
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  const handleRouteSelect = (path: string) => {
    const navigablePath = path
      .replace("/:id", "")
      .replace("/:productId", "")
      .replace("/:variantId", "")
      .replace("/:imageId", "");
    navigate(navigablePath);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const getRouteIcon = (category: string) => {
    switch (category) {
      case "Main": return BarChart3;
      case "Inventory": return Package;
      case "Sales": return ShoppingCart;
      case "Procurement": return Truck;
      case "Analytics": return BarChart;
      case "System": return Cog;
      default: return TrendingUp;
    }
  };

  const formatPathForDisplay = (path: string) => path.replace(/:([^/]+)/g, "[...]");

  const refreshNotificationCount = async () => {
    try {
      const stats = await notificationAPI.getStats();
      setUnreadCount(stats.unread || 0);
    } catch (error) {}
  };

  return (
    <header className="p-1 bg-[var(--sidebar-bg)] border-b border-[var(--border-color)] flex justify-between items-center shadow-sm relative">
      {/* Left side */}
      <div className="flex items-center gap-base flex-1">
        {/* Hamburger – only visible on mobile */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          className="p-2 rounded-lg hover:bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] transition-all duration-200 z-99"
        >
          <Menu className="icon-md" />
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-md relative">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-md pointer-events-none">
                <Search className="icon-sm text-[var(--sidebar-text)]" />
              </div>
              <input
                type="text"
                placeholder="Search pages, products, orders, reports..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                className="w-full compact-input pl-xl border border-[var(--border-color)] rounded-md bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] placeholder-[var(--sidebar-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent"
              />
            </div>
          </form>

          {/* Search Results Dropdown */}
          {showSearchResults && filteredRoutes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] max-h-80 overflow-auto z-50">
              {filteredRoutes.map((route, index) => {
                const RouteIcon = getRouteIcon(route.category);
                return (
                  <div
                    key={index}
                    className="px-4 py-3 cursor-pointer border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--card-secondary-bg)] transition-colors"
                    onMouseDown={() => handleRouteSelect(route.path)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary-color)]/10 flex items-center justify-center">
                        <RouteIcon className="icon-sm text-[var(--primary-color)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--sidebar-text)] truncate">
                          {route.name}
                        </div>
                        <div className="text-xs text-[var(--sidebar-text)] flex items-center gap-2 mt-1">
                          <span className="truncate">{formatPathForDisplay(route.path)}</span>
                          <span className="text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2 py-0.5 rounded-full text-xs whitespace-nowrap">
                            {route.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {showSearchResults && searchQuery.trim() && filteredRoutes.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-4 z-50">
              <div className="text-center text-[var(--sidebar-text)]">
                No pages found for "{searchQuery}"
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: notifications */}
      <div className="flex items-center gap-md">
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            aria-label="Notifications"
            className="relative p-2 rounded-lg hover:bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] transition-colors duration-200"
          >
            <Bell className="icon-md" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-[var(--danger-color)] text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {/* NotificationDropdown component can be placed here if needed */}
        </div>
      </div>
    </header>
  );
};

export default TopBar;