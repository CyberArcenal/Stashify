// src/renderer/components/Selects/ProductVariant/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, GitBranch, X } from "lucide-react";
import type { ProductVariant } from "../../../api/core/productVariant";
import productVariantAPI from "../../../api/core/productVariant";

interface ProductVariantSelectProps {
  value: number | null;
  onChange: (variantId: number | null, variant?: ProductVariant) => void;
  disabled?: boolean;
  placeholder?: string;
  activeOnly?: boolean;
  className?: string;
  productId?: number; // required to filter variants
}

const ProductVariantSelect: React.FC<ProductVariantSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select variant...",
  activeOnly = true,
  className = "w-full max-w-md",
  productId,
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<ProductVariant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load variants
  useEffect(() => {
    if (!productId) {
      setVariants([]);
      setFilteredVariants([]);
      return;
    }
    const loadVariants = async () => {
      setLoading(true);
      try {
        const params: any = {
          productId,
          sortBy: "name",
          sortOrder: "ASC",
          limit: 1000,
          is_active: activeOnly ? true : undefined,
        };
        const response = await productVariantAPI.getAll(params);
        if (response.status && response.data) {
          const list = Array.isArray(response.data) ? response.data : response.data || [];
          setVariants(list);
          setFilteredVariants(list);
        }
      } catch (error) {
        console.error("Failed to load variants:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVariants();
  }, [productId, activeOnly]);

  // Filter variants
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVariants(variants);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredVariants(
      variants.filter(
        (v) =>
          v.name.toLowerCase().includes(lower) ||
          (v.sku && v.sku.toLowerCase().includes(lower)) ||
          (v.barcode && v.barcode.toLowerCase().includes(lower))
      )
    );
  }, [searchTerm, variants]);

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

  const handleSelect = (variant: ProductVariant) => {
    onChange(variant.id, variant);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const selectedVariant = variants.find((v) => v.id === value);

  // If no productId, show disabled state or message
  if (!productId) {
    return (
      <div
        className={`px-4 py-2 rounded-lg text-left flex items-center gap-2 opacity-60 cursor-not-allowed ${className}`}
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          color: "var(--text-secondary)",
          minHeight: "42px",
        }}
      >
        <GitBranch className="w-4 h-4" />
        <span>Select a product first</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || !productId}
        className={`
          w-full px-4 py-2 rounded-lg text-left flex items-center gap-2
          transition-colors duration-200
          ${disabled || !productId ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-800"}
        `}
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          minHeight: "42px",
        }}
      >
        <GitBranch className="w-4 h-4 flex-shrink-0" style={{ color: "var(--primary-color)" }} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedVariant ? (
            <>
              <span className="font-medium truncate">{selectedVariant.name}</span>
              {selectedVariant.sku && (
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  ({selectedVariant.sku})
                </span>
              )}
            </>
          ) : (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {selectedVariant && !disabled && (
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
                  placeholder="Search variant by name, SKU..."
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
              {loading && variants.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading...
                </div>
              ) : filteredVariants.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No variants found
                </div>
              ) : (
                filteredVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => handleSelect(variant)}
                    className={`
                      w-full px-3 py-2 text-left flex items-center gap-2
                      transition-colors text-sm cursor-pointer hover:bg-gray-800
                      ${variant.id === value ? "bg-gray-800" : ""}
                    `}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <GitBranch className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary-color)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {variant.name}
                        </span>
                        {variant.sku && (
                          <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            SKU: {variant.sku}
                          </span>
                        )}
                      </div>
                      {variant.net_price !== undefined && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--primary-color)" }}>
                          ₱{variant.net_price}
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

export default ProductVariantSelect;