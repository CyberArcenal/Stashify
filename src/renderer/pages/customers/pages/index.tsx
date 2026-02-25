// components/CustomersPage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Phone,
  Mail,
  MapPin,
  User,
  ShoppingBag,
} from "lucide-react";
import { userAPI, UserData } from "@/renderer/api/user";
import { orderAPI } from "@/renderer/api/order";
import { PaginationType } from "@/renderer/api/category";
import { showConfirm } from "@/renderer/utils/dialogs";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  totalOrders: number;
  status?: "active" | "inactive";
  totalSpent?: number;
  lastOrderDate?: string;
  userData?: UserData; // Store the full user data
}

interface Filters {
  search: string;
  status: string;
}

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
  });

  // Fetch customers data
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch users with customer type
        const customerUsers = await userAPI.getByUserType("customer");
        setPagination(customerUsers.pagination);

        // Map user data to customer interface
        const customersData: Customer[] = await Promise.all(
          customerUsers.data.map(async (user) => {
            const totalOrders = user.stats.total_order;
            const totalSpent = user.stats.total_spent;
            const lastOrder = user.stats.last_order;
            return {
              id: user.id,
              name: user.full_name,
              email: user.email,
              phone: user.phone_number || "No phone number",
              address: user.address || "No address provided",
              createdAt: user.created_at,
              totalOrders,
              status: user.status === "active" ? "active" : "inactive",
              totalSpent,
              lastOrderDate: lastOrder,
              userData: user,
            };
          }),
        );

        setCustomers(customersData);
        setFilteredCustomers(customersData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch customers";
        setError(errorMessage);
        console.error("Error fetching customers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Filter customers based on filters
  useEffect(() => {
    if (!customers.length) return;

    setLoading(true);
    const filtered = customers.filter((customer) => {
      const matchesSearch =
        !filters.search ||
        customer.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        customer.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        customer.phone.toLowerCase().includes(filters.search.toLowerCase()) ||
        customer.address.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus =
        !filters.status || customer.status === filters.status;

      return matchesSearch && matchesStatus;
    });

    // Simulate slight delay for better UX
    setTimeout(() => {
      setFilteredCustomers(filtered);
      setLoading(false);
    }, 200);
  }, [filters, customers]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
    });
  };

  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((customer) => customer.id));
    }
  };

  const handleDeleteCustomer = async (customerId: number) => {
    const confirmed = await showConfirm({
      title: "Delete Customer",
      message:
        "Are you sure you want to delete this customer? This action cannot be undone.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await userAPI.delete(customerId);

      // Remove customer from local state
      setCustomers((prev) =>
        prev.filter((customer) => customer.id !== customerId),
      );
      setSelectedCustomers((prev) => prev.filter((id) => id !== customerId));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete customer";
      setError(errorMessage);
      console.error("Error deleting customer:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await showConfirm({
      title: "Delete Customers",
      message: `Are you sure you want to delete ${selectedCustomers.length} customer(s)? This action cannot be undone.`,
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      setLoading(true);

      // Delete each selected customer
      for (const customerId of selectedCustomers) {
        await userAPI.delete(customerId);
      }

      // Remove deleted customers from local state
      setCustomers((prev) =>
        prev.filter((customer) => !selectedCustomers.includes(customer.id)),
      );
      setSelectedCustomers([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete customers";
      setError(errorMessage);
      console.error("Error deleting customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Customer["status"]) => {
    switch (status) {
      case "active":
        return "bg-[var(--status-success-bg)] text-[var(--status-success-text)]";
      case "inactive":
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
      default:
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone === "No phone number") return phone;
    return phone.replace(/(\d{4})-(\d{3})-(\d{4})/, "$1 $2 $3");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Quick Stats Data
  const quickStats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    inactive: customers.filter((c) => c.status === "inactive").length,
    totalOrders: customers.reduce(
      (sum, customer) => sum + customer.totalOrders,
      0,
    ),
    totalRevenue: customers.reduce(
      (sum, customer) => sum + (customer.totalSpent || 0),
      0,
    ),
  };

  return (
    <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)]">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--sidebar-text)]">
            Customers
          </h2>
          <p className="text-[var(--sidebar-text)] mt-xs text-sm">
            Manage customer information and order history
          </p>
        </div>
        <div className="flex gap-xs">
          <button
            className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md flex items-center"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-xs" />
            Filters
          </button>
          <Link
            to="/customers/form"
            className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
          >
            <Plus className="icon-sm mr-xs" />
            New Customer
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-[var(--accent-red-light)] border border-[var(--danger-color)] rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-[var(--danger-color)] text-sm">
                {error}
              </span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-[var(--danger-color)] hover:text-[var(--danger-hover)]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-4">
        <div className="bg-gradient-to-r from-[var(--stat-blue-from)] to-[var(--stat-blue-to)] compact-stats rounded-md text-[var(--sidebar-text)]">
          <div className="text-xs font-medium">Total Customers</div>
          <div className="text-xl font-bold">{quickStats.total}</div>
        </div>
        <div className="bg-gradient-to-r from-[var(--stat-green-from)] to-[var(--stat-green-to)] compact-stats rounded-md text-[var(--sidebar-text)]">
          <div className="text-xs font-medium">Active</div>
          <div className="text-xl font-bold">{quickStats.active}</div>
        </div>
        <div className="bg-gradient-to-r from-[var(--stat-purple-from)] to-[var(--stat-purple-to)] compact-stats rounded-md text-[var(--sidebar-text)]">
          <div className="text-xs font-medium">Total Orders</div>
          <div className="text-xl font-bold">{quickStats.totalOrders}</div>
        </div>
        <div className="bg-gradient-to-r from-[var(--stat-amber-from)] to-[var(--stat-amber-to)] compact-stats rounded-md text-[var(--sidebar-text)]">
          <div className="text-xs font-medium">Total Revenue</div>
          <div className="text-xl font-bold">
            {formatCurrency(quickStats.totalRevenue)}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm mb-4 p-3 bg-[var(--card-secondary-bg)] rounded-md">
          <div>
            <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search customers..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--sidebar-text)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--card-bg)] text-[var(--sidebar-text)]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="compact-button w-full bg-[var(--primary-color)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--primary-hover)]"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedCustomers.length > 0 && (
        <div className="mb-3 p-2 bg-[var(--accent-blue-light)] rounded-md flex items-center justify-between">
          <span className="text-[var(--accent-emerald)] text-sm">
            {selectedCustomers.length} customer(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              onClick={handleBulkDelete}
              className="compact-button bg-[var(--danger-color)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--danger-hover)] flex items-center"
            >
              <Trash2 className="icon-sm mr-xs" />
              Delete Selected
            </button>
            <button className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md">
              <Download className="icon-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      )}

      {/* Customers Table */}
      {!loading && (
        <>
          <div className="overflow-x-auto rounded-md border border-[var(--border-color)] compact-table">
            <table className="min-w-full divide-y divide-[var(--border-color)]">
              <thead className="bg-[var(--card-secondary-bg)]">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedCustomers.length === filteredCustomers.length &&
                        filteredCustomers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 text-[var(--accent-blue)] rounded"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Address
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Orders
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-right text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-[var(--card-secondary-bg)]"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="h-3 w-3 text-[var(--accent-blue)] rounded"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-[var(--accent-purple-light)] flex items-center justify-center mr-2">
                          <User className="icon-sm text-[var(--accent-purple)]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--sidebar-text)]">
                            {customer.name}
                          </div>
                          <div className="text-xs text-[var(--sidebar-text)]">
                            ID: {customer.id}
                          </div>
                          {customer.totalSpent !== undefined &&
                            customer.totalSpent > 0 && (
                              <div className="text-xs text-[var(--sidebar-text)]">
                                {formatCurrency(customer.totalSpent)} spent
                              </div>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm text-[var(--sidebar-text)]">
                          <Mail className="icon-xs mr-1 text-[var(--text-tertiary)]" />
                          {customer.email}
                        </div>
                        <div className="flex items-center text-sm text-[var(--sidebar-text)]">
                          <Phone className="icon-xs mr-1 text-[var(--text-tertiary)]" />
                          {formatPhoneNumber(customer.phone)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-start text-sm text-[var(--sidebar-text)] max-w-xs">
                        <MapPin className="icon-xs mr-1 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShoppingBag className="icon-sm text-[var(--text-tertiary)] mr-1" />
                        <div>
                          <div className="text-sm font-medium text-[var(--sidebar-text)]">
                            {customer.totalOrders}
                          </div>
                          {customer.lastOrderDate && (
                            <div className="text-xs text-[var(--sidebar-text)]">
                              Last: {formatDate(customer.lastOrderDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(customer.status)}`}
                      >
                        {customer.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--sidebar-text)]">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-xs">
                        <button
                          onClick={() => {
                            navigate(`/customers/view/${customer.id}`);
                          }}
                          className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] p-1 rounded hover:bg-[var(--accent-blue-light)]"
                          title="View Customer"
                        >
                          <Eye className="icon-sm" />
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/customers/form/${customer.id}`);
                          }}
                          className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] p-1 rounded hover:bg-[var(--accent-blue-light)]"
                          title="Edit Customer"
                        >
                          <Edit className="icon-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-[var(--danger-color)] hover:text-[var(--danger-hover)] p-1 rounded hover:bg-[var(--accent-red-light)]"
                          title="Delete Customer"
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredCustomers.length === 0 && (
            <div className="text-center py-6">
              <div className="text-[var(--sidebar-text)] text-4xl mb-2">👥</div>
              <p className="text-base text-[var(--sidebar-text)]">
                {customers.length === 0
                  ? "No customers found."
                  : "No customers match your filters."}
              </p>
              <button
                className="mt-3 compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md"
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Table Footer */}
          {filteredCustomers.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-[var(--sidebar-text)]">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{filteredCustomers.length}</span>{" "}
                of{" "}
                <span className="font-medium">{filteredCustomers.length}</span>{" "}
                results
              </div>
              <div className="flex gap-xs">
                <button className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)]/80 cursor-not-allowed">
                  Previous
                </button>
                <button className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)]/80 cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomersPage;
