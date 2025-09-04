"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";
import supabase from "@/app/utils/db";
import toast from "react-hot-toast";
import SkeletonLoading from "@/components/SkeletonLoading";

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(75, 85, 99, 0.4)" }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    password: "",
    role: "Author",
    no_hp: "",
    email_verified: true,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userData = (data || []).map((row) => ({
        id: row.id_user,
        nama: row.nama || "",
        email: row.email || "",
        role: row.role || "",
        no_hp: row.no_hp || "",
        email_verified: row.email_verified ?? false,
        created_at: row.created_at,
      }));

      setAllData(userData);
    } catch (err) {
      const message = err?.message || "Unexpected error while fetching users";
      toast.error("Error fetching data: " + message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // State untuk search, pagination, dan sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [sortField, setSortField] = useState("nama");
  const [sortOrder, setSortOrder] = useState("asc");

  // Filter dan sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = allData;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.no_hp.includes(searchTerm)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((item) => item.role === roleFilter);
    }

    // Verification filter
    if (verificationFilter !== "all") {
      const isVerified = verificationFilter === "verified";
      filtered = filtered.filter((item) => item.email_verified === isVerified);
    }

    // Sort
    if (sortField && sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [
    allData,
    searchTerm,
    roleFilter,
    verificationFilter,
    sortField,
    sortOrder,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, verificationFilter, sortField, sortOrder]);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Modal handlers
  const openAddModal = () => {
    setFormData({
      nama: "",
      email: "",
      password: "",
      role: "Supplier",
      no_hp: "",
      email_verified: true,
    });
    setShowPassword(false);
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      nama: item.nama,
      email: item.email,
      password: "", // Don't populate password for security
      role: item.role,
      no_hp: item.no_hp,
      email_verified: item.email_verified,
    });
    setShowPassword(false);
    setShowEditModal(true);
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const closeAllModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedItem(null);
    setShowPassword(false);
    setFormData({
      nama: "",
      email: "",
      password: "",
      role: "Supplier",
      no_hp: "",
      email_verified: true,
    });
  };

  // Validation
  const validateForm = (isEdit = false) => {
    if (!formData.nama.trim()) {
      toast.error("Name cannot be empty!");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email cannot be empty!");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address!");
      return false;
    }
    if (!isEdit && !formData.password.trim()) {
      toast.error("Password cannot be empty for new users!");
      return false;
    }
    if (!isEdit && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return false;
    }
    if (isEdit && formData.password.trim() && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return false;
    }
    if (!formData.role) {
      toast.error("Please select a role!");
      return false;
    }
    return true;
  };

  // Generate password hash (you should use bcrypt in actual implementation)
  const hashPassword = async (password) => {
    // This is a placeholder - use proper bcrypt hashing in production
    return `$2b$12$${btoa(password + "salt")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 53)}`;
  };

  // CRUD Operations with Supabase
  const handleAdd = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("email")
        .eq("email", formData.email.trim().toLowerCase())
        .single();

      if (existingUser) {
        toast.error("Email already exists!");
        return;
      }

      // Hash the password
      const hashedPassword = await hashPassword(formData.password);

      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            nama: formData.nama.trim(),
            email: formData.email.trim().toLowerCase(),
            password: hashedPassword,
            role: formData.role,
            no_hp: formData.no_hp.trim(),
            email_verified: formData.email_verified,
          },
        ])
        .select();

      if (error) throw error;

      const newItem = {
        id: data[0].id_user,
        nama: data[0].nama,
        email: data[0].email,
        role: data[0].role,
        no_hp: data[0].no_hp,
        email_verified: data[0].email_verified,
        created_at: data[0].created_at,
      };

      setAllData((prev) => [newItem, ...prev]);
      closeAllModals();
      toast.success("User successfully added!");
    } catch (error) {
      if (error.message.includes("duplicate key")) {
        toast.error("Email already exists!");
      } else {
        toast.error("Error adding user: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm(true)) return;

    try {
      setLoading(true);

      // Check if email already exists (except for current user)
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("email, id_user")
        .eq("email", formData.email.trim().toLowerCase())
        .neq("id_user", selectedItem.id)
        .maybeSingle();

      if (existingUser) {
        toast.error("Email already exists!");
        return;
      }

      const updateData = {
        nama: formData.nama.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        no_hp: formData.no_hp.trim(),
        email_verified: formData.email_verified,
      };

      // Only update password if it's provided
      if (formData.password.trim()) {
        updateData.password = await hashPassword(formData.password);
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id_user", selectedItem.id);

      if (error) throw error;

      setAllData((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? {
                ...item,
                nama: formData.nama.trim(),
                email: formData.email.trim().toLowerCase(),
                role: formData.role,
                no_hp: formData.no_hp.trim(),
                email_verified: formData.email_verified,
              }
            : item
        )
      );

      closeAllModals();
      toast.success("User successfully updated!");
    } catch (error) {
      if (error.message.includes("duplicate key")) {
        toast.error("Email already exists!");
      } else {
        toast.error("Error updating user: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id_user", selectedItem.id);

      if (error) throw error;

      setAllData((prev) => prev.filter((item) => item.id !== selectedItem.id));
      closeAllModals();
      toast.success("User successfully deleted!");
    } catch (error) {
      toast.error("Error deleting user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getSortIcon = (field) => {
    if (sortField === field) {
      return sortOrder === "asc" ? (
        <ChevronUp size={16} className="text-blue-600" />
      ) : (
        <ChevronDown size={16} className="text-blue-600" />
      );
    }
    return <ArrowUpDown size={16} className="text-gray-400" />;
  };

  return (
    <div className="w-full max-w-screen mx-auto bg-gray-50 h-fit overflow-y-auto p-1.5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-3">
            <div className="flex items-baseline space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                User Management
              </h2>
              <span className="text-sm text-gray-500">
                {filteredAndSortedData.length} Users
              </span>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="Author">Author</option>
                  <option value="Supplier">Supplier</option>
                </select>

                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>

              {/* Add button */}
              <button
                onClick={openAddModal}
                disabled={loading}
                title="Add New User"
                className="flex items-center justify-center gap-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-150"
              >
                <Plus size={16} />
                Add User
              </button>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("nama")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Name</span>
                    {getSortIcon("nama")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("email")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Email</span>
                    {getSortIcon("email")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("role")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Role</span>
                    {getSortIcon("role")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <SkeletonLoading Rows={10} Cols={7} />
              ) : (
                currentData.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <User size={16} className="text-gray-400 mr-2" />
                        <div className="truncate" title={item.nama}>
                          {item.nama}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center">
                        <Mail size={16} className="text-gray-400 mr-2" />
                        <div className="truncate" title={item.email}>
                          {item.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.role === "Author"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center">
                        <Phone size={16} className="text-gray-400 mr-2" />
                        {item.no_hp || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        {item.email_verified ? (
                          <>
                            <CheckCircle
                              size={16}
                              className="text-green-500 mr-1"
                            />
                            <span className="text-green-700">Verified</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={16} className="text-red-500 mr-1" />
                            <span className="text-red-700">Unverified</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-start space-x-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(item)}
                          disabled={loading}
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 disabled:opacity-50 rounded-full transition-all duration-150"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => openDeleteModal(item)}
                          disabled={loading}
                          className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-50 rounded-full transition-all duration-150"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {currentData.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <User className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              {searchTerm ||
              roleFilter !== "all" ||
              verificationFilter !== "all"
                ? "No matching users found"
                : "No users available"}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ||
              roleFilter !== "all" ||
              verificationFilter !== "all"
                ? "Try adjusting your filters or search term"
                : "Users will appear here after being added."}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredAndSortedData.length > 0 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {/* Items per page selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    handleItemsPerPageChange(Number(e.target.value))
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Pagination info and controls */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {startIndex + 1}-
                  {Math.min(endIndex, filteredAndSortedData.length)} of{" "}
                  {filteredAndSortedData.length}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={closeAllModals}
        title="Add New User"
      >
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) =>
                  setFormData({ ...formData, nama: e.target.value })
                }
                placeholder="Enter user name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter password..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Supplier">Supplier</option>
                <option value="Author">Author</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.no_hp}
                onChange={(e) =>
                  setFormData({ ...formData, no_hp: e.target.value })
                }
                placeholder="Enter phone number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="add_email_verified"
                checked={formData.email_verified}
                onChange={(e) =>
                  setFormData({ ...formData, email_verified: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="add_email_verified"
                className="ml-2 text-sm font-medium text-gray-700"
              >
                Email Verified
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeAllModals}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={
                loading ||
                !formData.nama.trim() ||
                !formData.email.trim() ||
                !formData.password.trim()
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? "Adding..." : "Add User"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={closeAllModals} title="Edit User">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) =>
                  setFormData({ ...formData, nama: e.target.value })
                }
                placeholder="Enter user name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Leave empty to keep current password..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep current password. If changing, must be at
                least 6 characters long.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Supplier">Supplier</option>
                <option value="Author">Author</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.no_hp}
                onChange={(e) =>
                  setFormData({ ...formData, no_hp: e.target.value })
                }
                placeholder="Enter phone number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="edit_email_verified"
                checked={formData.email_verified}
                onChange={(e) =>
                  setFormData({ ...formData, email_verified: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="edit_email_verified"
                className="ml-2 text-sm font-medium text-gray-700"
              >
                Email Verified
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeAllModals}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={
                loading || !formData.nama.trim() || !formData.email.trim()
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? "Updating..." : "Update User"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={closeAllModals}
        title="Delete Confirmation"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-center mb-6">
            <p className="text-gray-700">
              Are you sure you want to delete the user{" "}
              <span className="font-semibold">"{selectedItem?.nama}"</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone and will permanently remove all user
              data.
            </p>
          </div>
          <div className="flex justify-center space-x-3">
            <button
              onClick={closeAllModals}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
