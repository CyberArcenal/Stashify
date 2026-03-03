// src/renderer/pages/taxes/components/TaxTable.tsx
import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import TaxActionsDropdown from "./TaxActionsDropdown";
import type { Tax } from "../../../api/core/tax";

interface TaxTableProps {
  taxes: Tax[];
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
  onEdit: (tax: Tax) => void;
  onDelete: (tax: Tax) => void;
  onView: (tax: Tax) => void;
   onDefault: (tax: Tax) => void;
}

const TaxTable: React.FC<TaxTableProps> = ({
  taxes,
  onSort,
  sortConfig,
  onEdit,
  onDelete,
  onView,
  onDefault,
}) => {
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div
      className="overflow-x-auto rounded-md border"
      style={{ borderColor: "var(--border-color)" }}
    >
      <table
        className="min-w-full"
        style={{ borderColor: "var(--border-color)" }}
      >
        <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
          <tr>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={(e) =>{e.stopPropagation(); onSort("name")}}
            >
              <div className="flex items-center gap-1">
                Name {getSortIcon("name")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={(e) =>{e.stopPropagation(); onSort("code")}}
            >
              <div className="flex items-center gap-1">
                Code {getSortIcon("code")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={(e) =>{e.stopPropagation(); onSort("rate")}}
            >
              <div className="flex items-center gap-1">
                Rate {getSortIcon("rate")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={(e) =>{e.stopPropagation(); onSort("type")}}
            >
              <div className="flex items-center gap-1">
                Type {getSortIcon("type")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={(e) =>{e.stopPropagation(); onSort("is_enabled")}}
            >
              <div className="flex items-center gap-1">
                Enabled {getSortIcon("is_enabled")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={(e) =>{e.stopPropagation(); onSort("is_default")}}
            >
              <div className="flex items-center gap-1">
                Default {getSortIcon("is_default")}
              </div>
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody style={{ backgroundColor: "var(--card-bg)" }}>
          {taxes.map((tax) => (
            <tr
              key={tax.id}
              onClick={(e) => {e.stopPropagation(); onView(tax);}}
              className="hover:bg-[var(--card-secondary-bg)] transition-colors"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <td
                className="px-4 py-2 whitespace-nowrap text-sm"
                style={{ color: "var(--sidebar-text)" }}
              >
                {tax.name}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm font-mono"
                style={{ color: "var(--text-secondary)" }}
              >
                {tax.code}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm"
                style={{ color: "var(--sidebar-text)" }}
              >
                {tax.type === "percentage" ? `${tax.rate}%` : `₱${tax.rate}`}
              </td>
              <td
                className="px-4 py-2 whitespace-nowrap text-sm capitalize"
                style={{ color: "var(--text-secondary)" }}
              >
                {tax.type}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tax.is_enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {tax.is_enabled ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tax.is_default ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {tax.is_default ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                <TaxActionsDropdown
                  tax={tax}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  onDefault={onDefault}
                />
              </td>
            </tr>
          ))}
          {taxes.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-4 text-center text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                No taxes found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaxTable;
