// components/CustomerForm.tsx
import React, { useState, useEffect } from 'react';
import { Save, X, User, Mail, Phone, MapPin, Activity } from 'lucide-react';

// Types
interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
}

interface CustomerFormProps {
  mode: 'add' | 'edit';
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  mode = 'add',
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});

  // Initialize form with initialData when in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        status: initialData.status || 'active',
      }));
    }
  }, [mode, initialData]);

  const handleInputChange = (
    field: keyof CustomerFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerFormData, string>> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    } else if (formData.name.trim().split(' ').length < 2) {
      newErrors.name = 'Please enter both first and last name';
    }

    if (!formData.email.trim()) {
      // newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      // newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Address is optional for customer creation
    // if (!formData.address.trim()) {
    //   newErrors.address = 'Address is required';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
      {/* Form Header */}
      <div className="border-b border-[var(--border-color)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-6 h-6 text-[var(--sidebar-text)] mr-3" />
            <h2 className="text-lg font-semibold text-[var(--sidebar-text)]">
              {mode === 'add' ? 'Add New Customer' : 'Edit Customer'}
            </h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="p-2 text-[var(--sidebar-text)] hover:text-[var(--sidebar-text)] rounded-lg hover:bg-[var(--card-secondary-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Information */}
          <div className="space-y-6">
            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--sidebar-text)] w-4 h-4" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg bg-[var(--card-bg)] text-[var(--sidebar-text)] ${errors.name
                    ? 'border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]'
                    : 'border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]'
                    }`}
                  placeholder="Enter customer full name"
                  disabled={loading}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-[var(--danger-color)]">
                  {errors.name}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--sidebar-text)]">
                Enter both first and last name
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--sidebar-text)] w-4 h-4" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg bg-[var(--card-bg)] text-[var(--sidebar-text)] ${errors.email
                    ? 'border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]'
                    : 'border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]'
                    }`}
                  placeholder="customer@example.com"
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-[var(--danger-color)]">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--sidebar-text)] w-4 h-4" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg bg-[var(--card-bg)] text-[var(--sidebar-text)] ${errors.phone
                    ? 'border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]'
                    : 'border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]'
                    }`}
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-[var(--danger-color)]">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Additional Information */}
          <div className="space-y-6">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                Status
              </label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--sidebar-text)] w-4 h-4" />
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as 'active' | 'inactive')}
                  className="w-full pl-10 pr-3 py-3 border border-[var(--border-color)] rounded-lg bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                  disabled={loading}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-[var(--sidebar-text)]">
                Active customers can place orders, inactive cannot.
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-[var(--sidebar-text)] w-4 h-4" />
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={4}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg bg-[var(--card-bg)] text-[var(--sidebar-text)] ${errors.address
                    ? 'border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]'
                    : 'border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]'
                    }`}
                  placeholder="Enter complete address (optional)"
                  disabled={loading}
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-[var(--danger-color)]">
                  {errors.address}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--sidebar-text)]">
                Address can be added later in customer details
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 border border-[var(--border-color)] rounded-lg text-[var(--sidebar-text)] hover:bg-[var(--card-secondary-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {mode === 'add' ? 'Adding...' : 'Updating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {mode === 'add' ? 'Add Customer' : 'Update Customer'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;