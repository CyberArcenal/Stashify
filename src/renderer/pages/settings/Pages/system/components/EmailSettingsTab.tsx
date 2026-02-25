// components/tabs/EmailSettingsTab.tsx
import React from "react";
import { Mail } from "lucide-react";
import { EmailSettings } from "@/renderer/api/systemSettings";

interface EmailSettingsTabProps {
  settings: EmailSettings;
  onChange: (field: keyof EmailSettings, value: any) => void;
}

const EmailSettingsTab: React.FC<EmailSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <Mail className="w-5 h-5 mr-2" />
        Email Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              SMTP Server
            </label>
            <input
              type="text"
              value={settings.server}
              onChange={(e) => onChange("server", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="smtp.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Port
            </label>
            <input
              type="number"
              value={settings.port}
              onChange={(e) => onChange("port", parseInt(e.target.value))}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="1"
              max="65535"
              placeholder="587"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Username
            </label>
            <input
              type="text"
              value={settings.username}
              onChange={(e) => onChange("username", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={settings.password}
              onChange={(e) => onChange("password", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.use_ssl}
                onChange={(e) => onChange("use_ssl", e.target.checked)}
                className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
              />
              <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                Use SSL
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.use_tls}
                onChange={(e) => onChange("use_tls", e.target.checked)}
                className="rounded border-[var(--checkbox-border)] text-[var(--checkbox-checked)] focus:ring-[var(--focus-ring-color)]"
              />
              <span className="ml-2 text-sm text-[var(--sidebar-text)]">
                Use TLS
              </span>
            </label>
          </div>

          <div className="bg-[var(--accent-blue-light)] p-4 rounded-lg">
            <h4 className="font-medium text-[var(--accent-blue)] text-sm mb-2">
              Email Configuration Tips
            </h4>
            <ul className="text-xs text-[var(--accent-blue)] space-y-1">
              <li>• Gmail: smtp.gmail.com, port 587, TLS enabled</li>
              <li>• Outlook: smtp-mail.outlook.com, port 587, TLS enabled</li>
              <li>• Yahoo: smtp.mail.yahoo.com, port 587, TLS enabled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSettingsTab;
