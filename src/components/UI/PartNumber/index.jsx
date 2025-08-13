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
} from "lucide-react";
import supabase from "@/app/utils/db";
import toast from "react-hot-toast";
import SkeletonLoading from "@/components/SkeletonLoading";

const PartNumber = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ nama: "" });

  const fetchPartNumber = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("part_number").select("*");
      if (error) throw error;

      const partNumberData = data.map((row) => ({
        id: row.id_part_number,
        nama: row.nama,
      }));
      setAllData(partNumberData);
    } catch (error) {
      toast.error("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartNumber();
  }, []);

  // State untuk search, pagination, dan sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc");

  // Filter dan sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = allData;

    if (searchTerm.trim()) {
      filtered = filtered.filter((item) =>
        item.nama.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const nameA = a.nama.toLowerCase();
        const nameB = b.nama.toLowerCase();

        if (sortOrder === "asc") {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
    }

    return filtered;
  }, [allData, searchTerm, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  // Sort handler
  const handleSort = () => {
    if (sortOrder === "asc") {
      setSortOrder("desc");
    } else if (sortOrder === "desc") {
      setSortOrder("asc");
    } else {
      setSortOrder("asc");
    }
  };

  // Modal handlers
  const openAddModal = () => {
    setFormData({ nama: "" });
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({ nama: item.nama });
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
    setFormData({ nama: "" });
  };

  // CRUD Operations with Supabase
  const handleAdd = async () => {
    if (!formData.nama.trim()) {
      toast.error("Name cannot be empty!");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("part_number")
        .insert([{ nama: formData.nama.trim() }])
        .select();

      if (error) throw error;

      const newItem = {
        id: data[0].id_part_number,
        nama: data[0].nama,
      };

      setAllData((prev) => [...prev, newItem]);
      closeAllModals();
      toast.success("Data successfully added!");
    } catch (error) {
      toast.error("Error adding data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.nama.trim()) {
      toast.error("Name cannot be empty!");
      return;
    }

    if (formData.nama.trim() === selectedItem.nama) {
      closeAllModals();
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("part_number")
        .update({ nama: formData.nama.trim() })
        .eq("id_part_number", selectedItem.id);

      if (error) throw error;

      setAllData((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, nama: formData.nama.trim() }
            : item
        )
      );

      closeAllModals();
      toast.success("Data successfully updated!");
    } catch (error) {
      toast.error("Error updating data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("part_number")
        .delete()
        .eq("id_part_number", selectedItem.id);

      if (error) throw error;

      setAllData((prev) => prev.filter((item) => item.id !== selectedItem.id));
      setSelectedItems((prev) =>
        prev.filter((itemId) => itemId !== selectedItem.id)
      );

      closeAllModals();
      toast.success("Data successfully deleted!");
    } catch (error) {
      toast.error("Error deleting data: " + error.message);
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

  const getSortIcon = () => {
    if (sortOrder === "asc") {
      return <ChevronUp size={16} className="text-blue-600" />;
    } else if (sortOrder === "desc") {
      return <ChevronDown size={16} className="text-blue-600" />;
    } else {
      return <ArrowUpDown size={16} className="text-gray-400" />;
    }
  };

  // Modal Component
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ backgroundColor: "rgba(75, 85, 99, 0.4)" }}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
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

  return (
    <div className="w-full mx-auto bg-gray-50 h-fit overflow-y-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Part Number
              </h2>
              <span className="text-sm text-gray-500">
                {filteredAndSortedData.length} Items
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Sort Controls */}
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-600">Sort by Name:</span>
                <button
                  onClick={handleSort}
                  className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-150"
                >
                  <span>
                    {sortOrder === "asc"
                      ? "A-Z"
                      : sortOrder === "desc"
                        ? "Z-A"
                        : "Default"}
                  </span>
                  {getSortIcon()}
                </button>
              </div>

              {/* Add button */}
              <button
                onClick={openAddModal}
                disabled={loading}
                title="Add New Item"
                className="flex items-center gap-1 py-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-150"
              >
                <Plus size={16} />
                Add
              </button>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            {/* Table Header */}
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No.
                </th>
                <th className="w-96 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={handleSort}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Name</span>
                    {getSortIcon()}
                  </button>
                </th>
                <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <SkeletonLoading Rows={10} Cols={3} />
              ) : (
                currentData.map((item, index) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="w-20 px-6 py-4 whitespace-nowrap text-sm text-gray-500 overflow-hidden">
                        {startIndex + index + 1}
                      </td>
                      <td className="w-96 px-6 py-4 text-sm font-medium text-gray-900 truncate">
                        <div className="truncate" title={item.nama}>
                          {item.nama}
                        </div>
                      </td>
                      <td className="w-32 px-6 py-4 whitespace-nowrap text-center overflow-hidden">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {currentData.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              {searchTerm ? "No matching results found" : "No data available"}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm
                ? `Try adjusting your search term "${searchTerm}"`
                : "Data will appear here after being added."}
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
        title="Add New Part Number"
      >
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Part Number Name
            </label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => setFormData({ nama: e.target.value })}
              placeholder="Enter part number name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={closeAllModals}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || !formData.nama.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={closeAllModals}
        title="Edit Part Number"
      >
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Part Number Name
            </label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => setFormData({ nama: e.target.value })}
              placeholder="Enter part number name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={closeAllModals}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={loading || !formData.nama.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? "Updating..." : "Update"}
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
              Are you sure you want to delete the part number{" "}
              <span className="font-semibold">"{selectedItem?.nama}"</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
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

export default PartNumber;
