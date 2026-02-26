import React, { useState } from "react";
import { Download, ChevronDown } from "lucide-react";

interface ExportDropdownProps {
  exportLoading: "pdf" | "csv" | "excel" | null;
  onExport: (format: "pdf" | "csv" | "excel") => void;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ exportLoading, onExport }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={exportLoading !== null}
        className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center disabled:opacity-50 transition-all duration-200 hover:scale-[1.02]"
        style={{ backgroundColor: "var(--accent-blue)" }}
      >
        <Download className="icon-sm mr-xs" />
        {exportLoading ? `Exporting ${exportLoading.toUpperCase()}...` : "Export Report"}
        <ChevronDown className={`icon-sm ml-xs transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg border z-10"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          {(["pdf", "excel", "csv"] as const).map((format) => (
            <button
              key={format}
              onClick={() => {
                onExport(format);
                setOpen(false);
              }}
              disabled={exportLoading !== null}
              className="w-full text-left px-4 py-2 text-sm flex items-center disabled:opacity-50 hover:bg-[var(--card-bg)] transition-colors"
              style={{ color: "var(--sidebar-text)" }}
            >
              <Download className="icon-sm mr-2" />
              Export as {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;