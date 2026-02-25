// src/components/Shared/ProtectedRoute.tsx
import React, { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import activationAPI from "../api/utils/activation";
import ActivationDialog from "../components/activations/ActivationDialog";

const ProtectedRoute: React.FC = () => {
  const [isActivationRequired, setIsActivationRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const checkActivation = async () => {
      try {
        const response = await activationAPI.requiresActivation();
        if (response.data.requiresActivation && !response.data.canContinue) {
          setIsActivationRequired(true);
          setShowDialog(true);
        }
      } catch (error) {
        console.error("Failed to check activation:", error);
      } finally {
        setLoading(false);
      }
    };

    checkActivation();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3"
            style={{ borderColor: "var(--primary-color)" }}
          ></div>
          <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Checking license...
          </p>
        </div>
      </div>
    );
  }

  if (isActivationRequired) {
    return (
      <>
        <ActivationDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          forceActivation={true}
        />
        {/* Pwedeng magpakita ng fallback UI habang nag-a-activate */}
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--sidebar-text)" }}
            >
              License Activation Required
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Please activate your license to continue using Inventory Pro
            </p>
            <button
              onClick={() => setShowDialog(true)}
              className="compact-button btn-primary"
            >
              Open Activation Dialog
            </button>
          </div>
        </div>
      </>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
