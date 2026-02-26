// components/Sidebar.tsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactDOM from "react-dom";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Warehouse,
  Users,
  ClipboardList,
  Home,
  MapPin,
  TrendingDown,
  BoxIcon,
  FactoryIcon,
  CarIcon,
  FilePlus,
  Key,
  icons,
  Lock,
} from "lucide-react";
import { version } from "../../../../package.json";

interface SidebarProps {
  isOpen: boolean;
}

interface MenuItem {
  path: string;
  name: string;
  icon: React.ComponentType<any>;
  category?: string;
  children?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    itemName: string | null;
  }>({
    top: 0,
    left: 0,
    itemName: null,
  });

  const popupRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    // Core Sections
    { path: "/", name: "Dashboard", icon: LayoutDashboard, category: "core" },
    {
      path: "",
      name: "Products",
      icon: Package,
      category: "core",
      children: [
        { path: "/products", name: "All Products", icon: Package },
        { path: "/products/variants", name: "Variants", icon: Package },
        { path: "/products/categories", name: "Categories", icon: ClipboardList },
      ],
    },
    { path: "/orders", name: "Sales", icon: ShoppingCart, category: "core" },
    { path: "/purchases", name: "Purchases", icon: Truck, category: "core" },
    {
      path: "",
      name: "Inventory",
      icon: Warehouse,
      category: "inventory",
      children: [
        { path: "/locations", name: "Warehouse", icon: MapPin },
        { path: "/stock-items", name: "Stock Items", icon: Package },
        { path: "/stock-movements", name: "Stock Movements", icon: TrendingUp },
        { path: "/inventory/adjustments", name: "Stock Adjustments", icon: Settings },
        { path: "/inventory/transfers", name: "Stock Transfers", icon: TrendingUp },
      ],
    },
    {
      path: "",
      name: "Analytics",
      icon: BarChart3,
      category: "analytics",
      children: [
        { path: "/reports/sales", name: "Sales Reports", icon: BarChart3 },
        { path: "/reports/inventory", name: "Inventory Reports", icon: Package },
        { path: "/reports/profit-loss", name: "Profit & Loss", icon: TrendingUp },
        { path: "/products/low-stock", name: "Low Stock", icon: TrendingUp },
        { path: "/products/out-of-stock", name: "Out of Stock", icon: TrendingDown },
      ],
    },
    {
      path: "",
      name: "System",
      icon: Settings,
      category: "system",
      children: [
        {path: "/audit", name: "Audit Trail", icon: Lock},
        { path: "/settings", name: "Settings", icon: Settings },
        { name: "Activation", icon: Key, path: "/activation" },
      ],
    },
  ];

  const filteredMenu = menuItems
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((child) => !(child.path === "/users"));
        return { ...item, children };
      }
      return item;
    })
    .filter((item) => item.path !== "/users" && (item.children ? item.children.length > 0 : true));

  const toggleDropdown = (name: string, e?: React.MouseEvent) => {
    if (!isOpen) {
      // Collapsed mode – handle popup
      if (e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        // If the same item is clicked, close the popup; otherwise open it
        if (popupPosition.itemName === name) {
          setPopupPosition({ top: 0, left: 0, itemName: null });
        } else {
          setPopupPosition({
            top: rect.top,
            left: rect.right, // position to the right of the icon
            itemName: name,
          });
        }
      }
    } else {
      // Expanded mode – toggle inline dropdown
      setOpenDropdowns((prev) => ({ ...prev, [name]: !prev[name] }));
    }
  };

  const isActivePath = (path: string) => location.pathname === path;
  const isDropdownActive = (items: MenuItem[] = []) => items.some((item) => isActivePath(item.path));

  // Auto‑open dropdowns in expanded mode when a child is active
  useEffect(() => {
    if (!isOpen) return;
    filteredMenu.forEach((item) => {
      if (item.children && isDropdownActive(item.children)) {
        setOpenDropdowns((prev) => ({ ...prev, [item.name]: true }));
      }
    });
  }, [location.pathname, isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setPopupPosition({ top: 0, left: 0, itemName: null });
      }
    };
    if (popupPosition.itemName) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popupPosition.itemName]);

  const renderMenuItems = (items: MenuItem[]) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = hasChildren ? isDropdownActive(item.children) : isActivePath(item.path);
      const isOpenDropdown = openDropdowns[item.name];

      return (
        <li key={item.path || item.name} className="mb-1 w-full">
          {hasChildren ? (
            <>
              <div
                onClick={(e) => toggleDropdown(item.name, e)}
                className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer w-full
                  ${
                    isActive
                      ? "bg-[var(--primary-color)] text-[var(--sidebar-text)] shadow-md"
                      : "text-[var(--sidebar-text)] hover:bg-[var(--primary-color)] hover:text-[var(--sidebar-text)]"
                  }
                  ${!isOpen ? "justify-center" : "justify-between"}
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-5 h-5 ${
                      isActive
                        ? "text-[var(--sidebar-text)]"
                        : "text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-text)]"
                    }`}
                  />
                  {isOpen && <span className="font-medium">{item.name}</span>}
                </div>
                {isOpen && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isOpenDropdown ? "rotate-180" : ""
                    } ${
                      isActive
                        ? "text-[var(--sidebar-text)]"
                        : "text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-text)]"
                    }`}
                  />
                )}
              </div>

              {/* Submenu for expanded mode */}
              {isOpen && (
                <div
                  className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                    isOpenDropdown ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <ul
                    className="ml-4 mt-1 space-y-1 border-l-2 pl-3"
                    style={{ borderColor: "var(--primary-color)" }}
                  >
                    {item.children?.map((child) => {
                      const isChildActive = isActivePath(child.path);
                      return (
                        <li key={child.path} className="mb-1 w-full">
                          <Link
                            to={child.path}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm w-full
                              ${
                                isChildActive
                                  ? "text-[var(--sidebar-text)] bg-[var(--primary-color)]/20 font-semibold"
                                  : "text-[var(--sidebar-text)] hover:bg-[var(--primary-color)] hover:text-[var(--sidebar-text)]"
                              }
                              ${!isOpen ? "justify-center" : ""}
                            `}
                          >
                            <child.icon className="w-4 h-4" />
                            {isOpen && <span>{child.name}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <Link
              to={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full
                ${
                  isActive
                    ? "bg-[var(--primary-color)] text-[var(--sidebar-text)] shadow-md"
                    : "text-[var(--sidebar-text)] hover:bg-[var(--primary-color)] hover:text-[var(--sidebar-text)]"
                }
                ${!isOpen ? "justify-center" : "justify-between"}
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-[var(--sidebar-text)]"
                      : "text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-text)]"
                  }`}
                />
                {isOpen && <span className="font-medium">{item.name}</span>}
              </div>
              {isOpen && (
                <ChevronRight
                  className={`w-4 h-4 transition-opacity duration-200 ${
                    isActive
                      ? "opacity-100 text-[var(--sidebar-text)]"
                      : "opacity-0 group-hover:opacity-50 text-[var(--sidebar-text)]"
                  }`}
                />
              )}
            </Link>
          )}
        </li>
      );
    });
  };

  const categories = [
    { id: "core", name: "Core Operations" },
    { id: "inventory", name: "Inventory Management" },
    { id: "analytics", name: "Analytics & Reports" },
    { id: "system", name: "System" },
  ];

  // Find the currently open popup item data
  const popupItem = filteredMenu.find((item) => item.name === popupPosition.itemName);

  return (
    <>
      <div
        className={`
          fixed md:relative inset-y-0 left-0
          bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]
          rounded-r-3xl shadow-xl
          transform transition-all duration-300 ease-in-out
          z-30 flex flex-col h-screen
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          md:${isOpen ? "w-64" : "w-20"}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[var(--sidebar-border)] bg-[var(--card-bg)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--primary-color)] flex items-center justify-center overflow-hidden">
              <img src={"/logo.png"} alt="Inventory Pro Logo" className="h-full w-full object-cover" />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-[var(--sidebar-text)]">StashLY</h2>
                <p className="text-xs text-[var(--sidebar-text)]">Business Management</p>
                <p className="text-xs text-[var(--sidebar-text)]">PHP</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scrollbar p-4">
          {categories.map((category) => {
            const categoryItems = menuItems.filter((item) => item.category === category.id);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.id} className="mb-6">
                {isOpen && (
                  <h6 className="px-4 py-2 text-xs font-semibold text-[var(--sidebar-text)] uppercase tracking-wider">
                    {category.name}
                  </h6>
                )}
                <ul className="space-y-1">{renderMenuItems(categoryItems)}</ul>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--sidebar-border)] text-center flex-shrink-0">
          {isOpen ? (
            <p className="text-xs text-[var(--sidebar-text)]">
              v{version} • © {new Date().getFullYear()} stashly
            </p>
          ) : (
            <p className="text-xs text-[var(--sidebar-text)]">© {new Date().getFullYear()}</p>
          )}
        </div>
      </div>

      {/* Popup for collapsed mode */}
      {!isOpen && popupItem && popupPosition.itemName && (
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            className="fixed z-50 min-w-40 bg-[var(--card-bg)] border border-[var(--sidebar-border)] rounded-lg shadow-xl py-2"
            style={{
              top: popupPosition.top,
              left: popupPosition.left + 8, // slight offset from the icon
            }}
          >
            <ul className="space-y-1">
              {popupItem.children?.map((child) => {
                const isChildActive = isActivePath(child.path);
                return (
                  <li key={child.path}>
                    <Link
                      to={child.path}
                      className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors duration-150
                        ${
                          isChildActive
                            ? "bg-[var(--primary-color)]/20 text-[var(--sidebar-text)] font-semibold"
                            : "text-[var(--sidebar-text)] hover:bg-[var(--primary-color)] hover:text-[var(--sidebar-text)]"
                        }
                      `}
                      onClick={() => setPopupPosition({ top: 0, left: 0, itemName: null })} // close after navigation
                    >
                      <child.icon className="w-4 h-4" />
                      <span>{child.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )
      )}
    </>
  );
};

export default Sidebar;