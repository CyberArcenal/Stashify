// src/renderer/components/Selects/Supplier/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Truck, X } from "lucide-react";
import type { Supplier } from "../../../api/core/supplier";
import supplierAPI from "../../../api/core/supplier";

interface SupplierSelectProps {
  value: number | null;
  onChange: (supplierId: number | null, supplier?: Supplier) => void;
  disabled?: boolean;
  placeholder?: string;
  activeOnly?: boolean;
  className?: string;
}

const SupplierSelect: React.FC<SupplierSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select supplier...",
  activeOnly = true,
  className = "w-full max-w-md",
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load suppliers
  useEffect(() => {
    const loadSuppliers = async () => {
      setLoading(true);
      try {
        const params: any = {
          sortBy: "name",
          sortOrder: "ASC",
          limit: 1000,
          is_active: activeOnly ? true : undefined,
        };
        const response = await supplierAPI.getAll(params);
        if (response.status && response.data) {
          const list = Array.isArray(response.data) ? response.data : response.data || [];
          setSuppliers(list);
          setFilteredSuppliers(list);
        }
      } catch (error) {
        console.error("Failed to load suppliers:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSuppliers();
  }, [activeOnly]);

  // Filter suppliers
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredSuppliers(
      suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(lower)) ||
          (s.email && s.email.toLowerCase().includes(lower))
      )
    );
  }, [searchTerm, suppliers]);

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

  const handleSelect = (supplier: Supplier) => {
    onChange(supplier.id, supplier);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const selectedSupplier = suppliers.find((s) => s.id === value);

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
        <Truck className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary-color)" }} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedSupplier ? (
            <>
              <span className="font-medium truncate">{selectedSupplier.name}</span>
              {selectedSupplier.contact_person && (
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  ({selectedSupplier.contact_person})
                </span>
              )}
            </>
          ) : (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {selectedSupplier && !disabled && (
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
                  placeholder="Search by name, contact, email..."
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
              {loading && suppliers.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading...
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No suppliers found
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => handleSelect(supplier)}
                    className={`
                      w-full px-3 py-2 text-left flex items-center gap-2
                      transition-colors text-sm cursor-pointer hover:bg-gray-800
                      ${supplier.id === value ? "bg-gray-800" : ""}
                    `}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <Truck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary-color)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {supplier.name}
                        </span>
                        {supplier.contact_person && (
                          <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {supplier.contact_person}
                          </span>
                        )}
                      </div>
                      {supplier.email && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {supplier.email}
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

export default SupplierSelect;