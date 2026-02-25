// src/renderer/components/Selects/Customer/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Users, X } from "lucide-react";
import type { Customer } from "../../../api/core/customer";
import customerAPI from "../../../api/core/customer";

interface CustomerSelectProps {
  value: number | null;
  onChange: (customerId: number | null, customer?: Customer) => void;
  disabled?: boolean;
  placeholder?: string;
  activeOnly?: boolean;
  className?: string;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select customer...",
  activeOnly = true, // status active? Not sure, maybe just filter by is_active? Not in Customer, but could use status 'regular','vip', etc.
  className = "w-full max-w-md",
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      try {
        const params: any = {
          sortBy: "name",
          sortOrder: "ASC",
          limit: 1000,
          // If activeOnly means status not 'inactive'? For now, fetch all.
        };
        const response = await customerAPI.getAll(params);
        if (response.status && response.data) {
          const list = Array.isArray(response.data) ? response.data : response.data || [];
          setCustomers(list);
          setFilteredCustomers(list);
        }
      } catch (error) {
        console.error("Failed to load customers:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, []); // activeOnly not implemented in API? Could add status filter later.

  // Filter customers
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.email && c.email.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.toLowerCase().includes(lower))
      )
    );
  }, [searchTerm, customers]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onChange(customer.id, customer);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const selectedCustomer = customers.find((c) => c.id === value);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2 rounded-lg text-left flex items-center gap-2
          transition-colors duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-800"}
        `}
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          minHeight: "42px",
        }}
      >
        <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary-color)" }} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedCustomer ? (
            <>
              <span className="font-medium truncate">{selectedCustomer.name}</span>
              {selectedCustomer.email && (
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  ({selectedCustomer.email})
                </span>
              )}
            </>
          ) : (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {selectedCustomer && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
            title="Remove selected"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg shadow-lg overflow-hidden"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              maxHeight: "350px",
            }}
          >
            <div className="p-2 border-b" style={{ borderColor: "var(--border-color)" }}>
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-secondary)" }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded text-sm"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "250px" }}>
              {loading && customers.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No customers found
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className={`
                      w-full px-3 py-2 text-left flex items-center gap-2
                      transition-colors text-sm cursor-pointer hover:bg-gray-800
                      ${customer.id === value ? "bg-gray-800" : ""}
                    `}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary-color)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {customer.name}
                        </span>
                        {customer.status && (
                          <span
                            className="px-1.5 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: customer.status === 'vip' ? "var(--accent-purple-light)" : "var(--card-secondary-bg)",
                              color: customer.status === 'vip' ? "var(--accent-purple)" : "var(--text-secondary)",
                            }}
                          >
                            {customer.status}
                          </span>
                        )}
                      </div>
                      {customer.email && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomerSelect;