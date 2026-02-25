// components/CustomerDetailView.tsx
import React from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddressData, UserData } from "@/renderer/api/user";

// Types
interface CustomerDetailViewProps {
  customer: UserData;
}

const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
}) => {
  const navigate = useNavigate();

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-[var(--status-success-bg)] text-[var(--status-success-text)]";
      case "restricted":
        return "bg-[var(--accent-orange-light)] text-[var(--warning-color)]";
      case "suspended":
        return "bg-[var(--accent-red-light)] text-[var(--danger-color)]";
      case "deleted":
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
      default:
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
    }
  };

  // Get status display text
  const getStatusText = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Format address
  const formatAddress = (address: AddressData): string => {
    const parts = [
      address.street_address,
      address.city,
      address.state,
      address.country,
      address.postal_code,
    ].filter((part) => part && part.trim() !== "");

    return parts.join(", ");
  };

  // Get primary address or first available address
  const getPrimaryAddress = (): string => {
    if (!customer.address || customer.address === "") {
      return "No address provided";
    }

    // Use full_address if available, otherwise format the address
    const primaryAddress = customer.address;
    return primaryAddress;
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <User className="w-6 h-6 text-[var(--sidebar-text)] mr-3" />
            <h2 className="text-lg font-semibold text-[var(--sidebar-text)]">
              {customer.full_name}
            </h2>
            <span
              className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}
            >
              {getStatusText(customer.status)}
            </span>
          </div>
          <button
            onClick={() => {
              navigate(`/customers/form/${customer.id}`);
            }}
            className="mt-2 sm:mt-0 px-4 py-2 bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors flex items-center text-sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Customer
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Contact Information
              </h3>

              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-[var(--sidebar-text)] mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--sidebar-text)]">
                      Email Address
                    </p>
                    <p className="text-sm text-[var(--sidebar-text)]">
                      {customer.email}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start">
                  <Phone className="w-5 h-5 text-[var(--sidebar-text)] mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--sidebar-text)]">
                      Phone Number
                    </p>
                    <p className="text-sm text-[var(--sidebar-text)]">
                      {customer.phone_number || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-[var(--sidebar-text)] mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--sidebar-text)]">
                      Address
                    </p>
                    <p className="text-sm text-[var(--sidebar-text)]">
                      {getPrimaryAddress()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-6">
            <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Customer Details
              </h3>

              <div className="space-y-4">
                {/* Customer ID */}
                <div>
                  <p className="text-sm font-medium text-[var(--sidebar-text)]">
                    Customer ID
                  </p>
                  <p className="text-sm text-[var(--sidebar-text)] font-mono">
                    {customer.id}
                  </p>
                </div>

                {/* Username */}
                <div>
                  <p className="text-sm font-medium text-[var(--sidebar-text)]">
                    Username
                  </p>
                  <p className="text-sm text-[var(--sidebar-text)]">
                    {customer.username}
                  </p>
                </div>

                {/* User Type */}
                <div>
                  <p className="text-sm font-medium text-[var(--sidebar-text)]">
                    User Type
                  </p>
                  <p className="text-sm text-[var(--sidebar-text)]">
                    {customer.user_type_display}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-sm font-medium text-[var(--sidebar-text)]">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}
                  >
                    {getStatusText(customer.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Timestamps
              </h3>

              <div className="space-y-4">
                {/* Date Created */}
                <div>
                  <p className="text-sm font-medium text-[var(--sidebar-text)]">
                    Date Created
                  </p>
                  <p className="text-sm text-[var(--sidebar-text)]">
                    {formatDate(customer.created_at)}
                  </p>
                </div>

                {/* Last Updated */}
                <div>
                  <p className="text-sm font-medium text-[var(--sidebar-text)]">
                    Last Updated
                  </p>
                  <p className="text-sm text-[var(--sidebar-text)]">
                    {formatDate(customer.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Addresses Section */}
        {customer.addresses_data && customer.addresses_data.length > 0 && (
          <div className="mt-6">
            <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Addresses ({customer.addresses_data.length})
              </h3>

              <div className="space-y-3">
                {customer.addresses_data.map((address, index) => (
                  <div
                    key={address.id}
                    className="p-3 bg-[var(--card-bg)] rounded border border-[var(--border-color)]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-[var(--sidebar-text)]">
                          Address {index + 1}{" "}
                          {address.description && `- ${address.description}`}
                        </p>
                        <p className="text-sm text-[var(--sidebar-text)] mt-1">
                          {address.full_address || formatAddress(address)}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--sidebar-text)]">
                        Added {formatDate(address.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Section (Optional) */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--accent-blue-light)] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-blue)]">
              {customer.stats.total_order}
            </p>
            <p className="text-sm text-[var(--accent-blue)]">Total Orders</p>
          </div>
          <div className="bg-[var(--accent-green-light)] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-green)]">
              ₱{customer.stats.total_spent}
            </p>
            <p className="text-sm text-[var(--accent-green)]">Total Spent</p>
          </div>
          <div className="bg-[var(--accent-purple-light)] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-purple)]">
              {customer.stats.pending_order}
            </p>
            <p className="text-sm text-[var(--accent-purple)]">
              Pending Orders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailView;
