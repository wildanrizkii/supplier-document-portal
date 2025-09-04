"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Eye,
  Upload,
  FileText,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import supabase from "@/app/utils/db";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import SkeletonLoading from "@/components/SkeletonLoading";

// Simple Select Dropdown Component
const SimpleSelect = ({
  value,
  onChange,
  options,
  placeholder,
  className,
  allowEmpty = true,
  disabled,
}) => {
  return (
    <div className="relative w-full">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || "")}
        disabled={disabled}
        className={`w-full h-10 pl-3 pr-10 border border-gray-300 rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                    appearance-none ${className}`}
      >
        {allowEmpty && (
          <option value="">{placeholder || "Select option..."}</option>
        )}
        {options.map((option) => {
          const idField = Object.keys(option).find((key) =>
            key.startsWith("id_")
          );
          return (
            <option key={option[idField]} value={option[idField]}>
              {option.nama}
            </option>
          );
        })}
      </select>

      <ChevronDown
        size={18}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
      />
    </div>
  );
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children, size = "max-w-md" }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(75, 85, 99, 0.4)" }}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${size} w-full max-h-dvh overflow-hidden flex flex-col`}
        style={{ maxHeight: "90dvh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// File Upload Component
const FileUpload = ({
  onFileSelect,
  selectedFile,
  accept = ".pdf,.xls,.xlsx,.csv,.doc,.docx",
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Document <span className="text-red-500">*</span>
      </label>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors ${
          dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={handleChange}
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            {selectedFile ? (
              <span className="font-medium text-blue-600">
                {selectedFile.name}
              </span>
            ) : (
              <>
                Drop files here or{" "}
                <span className="text-blue-600 underline">browse</span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            .pdf, .xls, .xlsx, .csv, .doc or .docx files up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const getStatusDisplay = (status) => {
    if (status === "NG") {
      return { text: "NG", color: "bg-red-100 text-red-800" };
    } else if (status === "OK") {
      return { text: "OK", color: "bg-green-100 text-green-800" };
    } else if (status === "PERLU UPDATE") {
      return { text: "PERLU UPDATE", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { text: "DATE UNSET", color: "bg-gray-800 text-gray-50" };
    }
  };

  const statusDisplay = getStatusDisplay(status);

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.color}`}
    >
      {statusDisplay.text}
    </span>
  );
};

const MillSheet = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reference data for dropdowns
  const [jenisDocOptions, setJenisDocOptions] = useState([]);
  const [partNameOptions, setPartNameOptions] = useState([]);
  const [partNumberOptions, setPartNumberOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    material: "",
    tanggal_report: "",
    tanggal_expire: "",
    status: "OK", // Default status
    id_supplier: "",
    id_jenis_dokumen: "",
    id_part_number: "",
    id_part_name: "",
    document_url: "",
    // Manual input fields for Supplier role
    part_name_manual: "",
    part_number_manual: "",
  });

  // Search, pagination, sorting, and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    field: "material",
    order: "asc",
  });

  // Filter state for document type
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");

  const { data: session } = useSession();

  const today = dayjs().format("YYYY-MM-DD");

  // NEW: Function to determine document status based on expire date
  const determineDocumentStatus = (expireDate) => {
    if (!expireDate) return "OK"; // Default status if no expire date

    const currentDate = dayjs();
    const expireDateObj = dayjs(expireDate);
    const threeMonthsFromNow = currentDate.add(3, "months");

    // If expire date is in the past (less than today)
    if (expireDateObj.isBefore(currentDate, "day")) {
      return "NG";
    }
    // If expire date is within 3 months from now
    else if (
      expireDateObj.isBefore(threeMonthsFromNow, "day") ||
      expireDateObj.isSame(threeMonthsFromNow, "day")
    ) {
      return "PERLU UPDATE";
    }
    // If expire date is more than 3 months away
    else {
      return "OK";
    }
  };

  // Function to update form status when expire date changes
  const updateStatusBasedOnExpireDate = useCallback((expireDate) => {
    const newStatus = determineDocumentStatus(expireDate);
    setFormData((prev) => ({
      ...prev,
      status: newStatus,
    }));
  }, []);

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [
        { data: jenis_doc },
        { data: part_name },
        { data: part_number },
        { data: supplier },
      ] = await Promise.all([
        supabase
          .from("jenis_dokumen")
          .select("id_jenis_dokumen, nama")
          .order("nama"),
        supabase.from("part_name").select("id_part_name, nama").order("nama"),
        supabase
          .from("part_number")
          .select("id_part_number, nama")
          .order("nama"),
        supabase.from("supplier").select("id_supplier, nama").order("nama"),
      ]);

      setJenisDocOptions(jenis_doc || []);
      setPartNameOptions(part_name || []);
      setPartNumberOptions(part_number || []);
      setSupplierOptions(supplier || []);
    } catch (error) {
      console.error("Error fetching reference data:", error);
    }
  };

  // Fetch material control data
  const fetchMaterialControl = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("material_control")
        .select(
          `
        id_material_control,
        material,
        tanggal_report,
        tanggal_expire,
        status,
        id_supplier,
        id_jenis_dokumen,
        id_part_number,
        id_part_name,
        id_user,
        document_url,
        jenis_dokumen:id_jenis_dokumen(nama),
        part_name:id_part_name(nama),
        part_number:id_part_number(nama),
        supplier:id_supplier(nama),
        users:id_user(nama, email, no_hp)
      `
        )
        .order("tanggal_report", { ascending: false });

      if (session?.user?.role === "Supplier") {
        query = query.eq("id_user", session?.user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const materialControlData = data.map((row) => ({
        id: row.id_material_control,
        material: row.material,
        tanggal_report: row.tanggal_report,
        tanggal_expire: row.tanggal_expire,
        status: row.status,
        id_supplier: row.id_supplier,
        id_jenis_dokumen: row.id_jenis_dokumen,
        id_part_number: row.id_part_number,
        id_part_name: row.id_part_name,
        document_url: row.document_url,
        jenis_dokumen_name: row.jenis_dokumen?.nama || "-",
        part_name_name: row.part_name?.nama || "-",
        part_number_name: row.part_number?.nama || "-",
        supplier_name: row.supplier?.nama || "-",
        user_name: row.users?.nama || "-",
        user_email: row.users?.email || "-",
        user_no_hp: row.users?.no_hp ? `+62${row.users.no_hp}` : "Not set",
      }));

      setAllData(materialControlData || []);
    } catch (error) {
      toast.error("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkAndUpdateIfNeeded = async () => {
    try {
      // 1. Ambil data terakhir dari document_check_log
      const { data, error } = await supabase
        .from("document_check_log")
        .select("check_date")
        .order("check_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data || data.check_date != today) {
        // 2. Jalankan fungsi cek expire
        await checkAndUpdateExpiredDocuments();

        // 3. Simpan tanggal cek baru ke tabel document_check_log
        const { error: insertError } = await supabase
          .from("document_check_log")
          .insert([{ check_date: today }]);

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error("Error in checkAndUpdateIfNeeded:", err.message || err);
    }
  };

  // UPDATED: Enhanced function to check and update document statuses
  const checkAndUpdateExpiredDocuments = async () => {
    console.log("Checking and updating document statuses...");
    try {
      // Fetch all documents
      const { data: allDocs, error: fetchError } = await supabase
        .from("material_control")
        .select("id_material_control, tanggal_expire, status");

      if (fetchError) throw fetchError;

      if (!allDocs || allDocs.length === 0) {
        console.log("No documents found.");
        return;
      }

      const updates = [];

      allDocs.forEach((doc) => {
        const newStatus = determineDocumentStatus(doc.tanggal_expire);

        // Only update if status has changed
        if (doc.status !== newStatus) {
          updates.push({
            id_material_control: doc.id_material_control,
            status: newStatus,
          });
        }
      });

      if (updates.length === 0) {
        console.log("No status updates needed.");
        return;
      }

      // Update documents in batches
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("material_control")
          .update({ status: update.status })
          .eq("id_material_control", update.id_material_control);

        if (updateError) throw updateError;
      }

      console.log(`${updates.length} document statuses updated.`);
    } catch (error) {
      console.error("Error updating document statuses:", error.message);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      const run = async () => {
        await checkAndUpdateIfNeeded();
        await fetchReferenceData();
        await fetchMaterialControl();
      };

      run();
    }
  }, [session?.user?.id]);

  // Get unique document types for filter options
  const documentTypeFilterOptions = useMemo(() => {
    const uniqueDocTypes = [
      ...new Set(
        allData
          .map((item) => item.jenis_dokumen_name)
          .filter((name) => name && name !== "-")
      ),
    ];

    return uniqueDocTypes.map((name) => ({ nama: name, id: name }));
  }, [allData]);

  // Filter and sort data with document type filter
  const filteredAndSortedData = useMemo(() => {
    let filtered = allData;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.jenis_dokumen_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.part_name_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply document type filter
    if (documentTypeFilter && documentTypeFilter !== "") {
      filtered = filtered.filter(
        (item) => item.jenis_dokumen_name === documentTypeFilter
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.field] || "";
      const bValue = b[sortConfig.field] || "";

      if (
        sortConfig.field === "tanggal_report" ||
        sortConfig.field === "tanggal_expire"
      ) {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return sortConfig.order === "asc" ? aDate - bDate : bDate - aDate;
      }

      const aString = aValue.toString().toLowerCase();
      const bString = bValue.toString().toLowerCase();

      if (sortConfig.order === "asc") {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });

    return filtered;
  }, [allData, searchTerm, documentTypeFilter, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedData.slice(startIndex, endIndex);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, documentTypeFilter, sortConfig]);

  // Clear all filters function
  const clearFilters = () => {
    setSearchTerm("");
    setDocumentTypeFilter("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm.trim() !== "" || documentTypeFilter !== "";

  // Sort handler
  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortConfig.order === "asc" ? (
      <ChevronUp size={14} className="text-blue-600" />
    ) : (
      <ChevronDown size={14} className="text-blue-600" />
    );
  };

  // Modal handlers
  const openAddModal = () => {
    setFormData({
      material: "",
      tanggal_report: "",
      tanggal_expire: "",
      status: "Unset", // Default status
      id_supplier: "",
      id_jenis_dokumen: "",
      id_part_number: "",
      id_part_name: "",
      document_url: "",
      part_name_manual: "",
      part_number_manual: "",
    });
    setSelectedFile(null);
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      material: item.material,
      tanggal_report: item.tanggal_report,
      tanggal_expire: item.tanggal_expire,
      status: item.status,
      id_supplier: item.id_supplier || "",
      id_jenis_dokumen: item.id_jenis_dokumen || "",
      id_part_number: item.id_part_number || "",
      id_part_name: item.id_part_name || "",
      document_url: item.document_url || "",
      // Set manual fields based on current data for Supplier role
      part_name_manual:
        session?.user?.role === "Supplier" ? item.part_name_name : "",
      part_number_manual:
        session?.user?.role === "Supplier" ? item.part_number_name : "",
    });
    setSelectedFile(null);
    setShowEditModal(true);
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const closeAllModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowDetailModal(false);
    setSelectedItem(null);
    setSelectedFile(null);
    setFormData({
      material: "",
      tanggal_report: "",
      tanggal_expire: "",
      status: "OK", // Default status
      id_supplier: "",
      id_jenis_dokumen: "",
      id_part_number: "",
      id_part_name: "",
      document_url: "",
      // Reset manual input fields
      part_name_manual: "",
      part_number_manual: "",
    });
  };

  // Alternative simple upload function
  const uploadFileSimple = async (file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `${fileName}`; // Simplified path without folder

      const { data, error } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (error) {
        console.error("Simple upload error:", error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error in simple upload:", error);
      throw error;
    }
  };

  // Function to find or create part name
  const findOrCreatePartName = async (partNameValue) => {
    if (!partNameValue || partNameValue.trim() === "") {
      return null;
    }

    try {
      // First, try to find existing part name
      const { data: existingPartName, error: findError } = await supabase
        .from("part_name")
        .select("id_part_name")
        .ilike("nama", partNameValue.trim())
        .single();

      if (!findError && existingPartName) {
        return existingPartName.id_part_name;
      }

      // If not found, create new one
      const { data: newPartName, error: createError } = await supabase
        .from("part_name")
        .insert([{ nama: partNameValue.trim() }])
        .select("id_part_name")
        .single();

      if (createError) throw createError;

      // Refresh part name options for Author role
      await fetchReferenceData();

      return newPartName.id_part_name;
    } catch (error) {
      console.error("Error finding/creating part name:", error);
      throw error;
    }
  };

  // Function to find or create part number
  const findOrCreatePartNumber = async (partNumberValue) => {
    if (!partNumberValue || partNumberValue.trim() === "") {
      return null;
    }

    try {
      // First, try to find existing part number
      const { data: existingPartNumber, error: findError } = await supabase
        .from("part_number")
        .select("id_part_number")
        .ilike("nama", partNumberValue.trim())
        .single();

      if (!findError && existingPartNumber) {
        return existingPartNumber.id_part_number;
      }

      // If not found, create new one
      const { data: newPartNumber, error: createError } = await supabase
        .from("part_number")
        .insert([{ nama: partNumberValue.trim() }])
        .select("id_part_number")
        .single();

      if (createError) throw createError;

      // Refresh part number options for Author role
      await fetchReferenceData();

      return newPartNumber.id_part_number;
    } catch (error) {
      console.error("Error finding/creating part number:", error);
      throw error;
    }
  };

  // Function to insert new reference data
  const insertNewReferenceData = async (tableName, nama) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ nama: nama.trim() }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error inserting new ${tableName}:`, error);
      throw error;
    }
  };

  // MODIFIED: Function to handle form submission with automatic status determination
  const handleFormSubmit = async (isAdd = true) => {
    if (!formData.material.trim()) {
      toast.error("Material is required!");
      return;
    }

    try {
      setLoading(true);

      let documentUrl = formData.document_url;

      // Upload file if selected
      if (selectedFile) {
        try {
          documentUrl = await uploadFileSimple(selectedFile);
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          toast.error("File upload failed: " + uploadError.message);
          return; // Stop execution if upload fails
        }
      }

      // UPDATED: Automatically determine status based on expire date
      const determinedStatus = determineDocumentStatus(formData.tanggal_expire);

      let processedData = {
        material: formData.material.trim(),
        tanggal_report: formData.tanggal_report || today,
        tanggal_expire: formData.tanggal_expire,
        status: determinedStatus, // Use automatically determined status
        document_url: documentUrl || null,
        id_supplier:
          session?.user?.role === "Author"
            ? formData?.id_supplier
            : session?.user?.id_supplier,
        id_jenis_dokumen: null,
        id_part_number: null,
        id_part_name: null,
        id_user: session?.user?.id,
      };

      // Helper function to process reference data for Author role
      const processReferenceDataForAuthor = async (
        value,
        options,
        tableName
      ) => {
        if (!value || value === "") return null;

        // Convert to number if it's a valid number
        const numericValue = parseInt(value);
        if (!isNaN(numericValue)) {
          // Check if this ID exists in options
          const existingById = options.find((opt) => {
            const idField = Object.keys(opt).find((key) =>
              key.startsWith("id_")
            );
            return opt[idField] === numericValue;
          });
          if (existingById) {
            return numericValue;
          }
        }

        return null; // If ID not found, return null
      };

      // Process each reference field based on user role
      processedData.id_jenis_dokumen = await processReferenceDataForAuthor(
        formData.id_jenis_dokumen,
        jenisDocOptions,
        "jenis_dokumen"
      );

      // Process part name and part number based on role
      if (session?.user?.role === "Supplier") {
        // For Supplier: use manual input and find/create records
        processedData.id_part_name = await findOrCreatePartName(
          formData.part_name_manual
        );
        processedData.id_part_number = await findOrCreatePartNumber(
          formData.part_number_manual
        );
      } else {
        // For Author: use dropdown selections
        processedData.id_part_name = await processReferenceDataForAuthor(
          formData.id_part_name,
          partNameOptions,
          "part_name"
        );
        processedData.id_part_number = await processReferenceDataForAuthor(
          formData.id_part_number,
          partNumberOptions,
          "part_number"
        );
      }

      // Insert or update material control data
      console.log("Processed data before insert/update:", processedData);

      if (isAdd) {
        // Filter out null values and id for insert
        const insertData = Object.fromEntries(
          Object.entries(processedData).filter(
            ([key, value]) => key !== "id_material_control" && value !== null
          )
        );
        console.log("Insert data (filtered nulls and id):", insertData);

        const { data, error } = await supabase
          .from("material_control")
          .insert([insertData])
          .select(); // Return inserted data

        if (error) {
          console.error("Insert error details:", error);
          throw error;
        }
        console.log("Insert successful:", data);
        toast.success("Data successfully added!");
      } else {
        // Saat update hilangkan id material dan id user
        const updateData = { ...processedData };
        delete updateData.id_material_control;
        delete updateData.id_user;

        const { error } = await supabase
          .from("material_control")
          .update(updateData)
          .eq("id_material_control", selectedItem.id);
        if (error) {
          console.error("Update error details:", error);
          throw error;
        }
        toast.success("Data successfully updated!");
      }

      await fetchMaterialControl();
      closeAllModals();
    } catch (error) {
      console.error("Error saving data: ", error);
      toast.error("Error saving data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  const handleAdd = async () => {
    await handleFormSubmit(true);
  };

  const handleEdit = async () => {
    await handleFormSubmit(false);
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      // Delete file from storage if exists
      if (selectedItem.document_url) {
        try {
          const fileName = selectedItem.document_url.split("/").pop();
          await supabase.storage.from("documents").remove([fileName]); // Simplified path
        } catch (storageError) {
          console.warn("Could not delete file from storage:", storageError);
          // Continue with record deletion even if file deletion fails
        }
      }

      const { error } = await supabase
        .from("material_control")
        .delete()
        .eq("id_material_control", selectedItem.id);

      if (error) throw error;

      await fetchMaterialControl();
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

  // Handler untuk mengupdate formData
  const handleFormDataChange = React.useCallback(
    (field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // UPDATED: Auto-update status when expire date changes
      if (field === "tanggal_expire") {
        updateStatusBasedOnExpireDate(value);
      }
    },
    [updateStatusBasedOnExpireDate]
  );

  // Handle file download
  const handleDownload = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "document";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  const isFieldDisabled = (fieldName) => {
    if (showAddModal) return false; // semua aktif saat Add
    if (session?.user?.role === "Author") return false; // Author bebas edit seluruh field

    if (session?.user?.role === "Supplier" && showEditModal) {
      const editableFields = [
        "tanggal_report",
        "tanggal_expire",
        "document_url",
      ]; // Ketika supplier edit hanya beberapa field yang boleh aktif
      return !editableFields.includes(fieldName);
    }

    return false;
  };

  return (
    <div className="w-full max-w-screen mx-auto bg-gray-50 h-fit overflow-y-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
            <div className="flex items-baseline space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
              <span className="text-sm text-gray-500">
                {filteredAndSortedData.length} Items
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Add button */}
              <button
                onClick={openAddModal}
                disabled={loading}
                title="Add New Mill Sheet"
                className="flex items-center justify-center gap-1 py-1 px-3 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-150 sm:w-auto cursor-pointer"
              >
                <Plus size={16} />
                Add Document
              </button>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search supplier, part number, part name, material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 h-10 w-full md:min-w-[260px] lg:min-w-[280px] border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                />
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Document Type Filter */}
              <div className="flex items-center space-x-1">
                <Filter size={20} className="text-gray-700" />
                <label className="text-sm font-medium text-gray-700 mr-2">
                  Type:
                </label>
                <div className="relative w-full md:w-auto">
                  <select
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="px-3 py-1 h-10 w-full md:min-w-[400px] lg:min-w-[440px] border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    <option value="">All Document Type</option>
                    {documentTypeFilterOptions.map((option) => (
                      <option key={option.id} value={option.nama}>
                        {option.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-1 px-3 py-1 h-10 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <X size={18} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {documentTypeFilter && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Type: {documentTypeFilter}
                    </span>
                  )}
                </div>
              </div>
            )}
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
                    onClick={() => handleSort("supplier_name")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Supplier</span>
                    {getSortIcon("supplier_name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("jenis_dokumen_name")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Document Type</span>
                    {getSortIcon("jenis_dokumen_name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("part_number_name")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Part Number</span>
                    {getSortIcon("part_number_name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("part_name_name")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Part Name</span>
                    {getSortIcon("part_name_name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("material")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Material</span>
                    {getSortIcon("material")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("tanggal_report")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Report Date</span>
                    {getSortIcon("tanggal_report")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("tanggal_expire")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Expire Date</span>
                    {getSortIcon("tanggal_expire")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors duration-150"
                  >
                    <span>Status</span>
                    {getSortIcon("status")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <SkeletonLoading Rows={10} Cols={10} />
              ) : (
                currentData.map((item, index) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="truncate max-w-xs"
                          title={item.supplier_name}
                        >
                          {item.supplier_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="truncate max-w-xs"
                          title={item.jenis_dokumen_name}
                        >
                          {item.jenis_dokumen_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="truncate max-w-xs"
                          title={item.part_number_name}
                        >
                          {item.part_number_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div
                          className="truncate max-w-xs"
                          title={item.part_name_name}
                        >
                          {item.part_name_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <div
                          className="truncate max-w-xs"
                          title={item.material}
                        >
                          {item.material}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(item.tanggal_report)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(item.tanggal_expire)}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-start space-x-2">
                          {/* Download Document Button */}
                          {item.document_url ? (
                            <button
                              onClick={() =>
                                handleDownload(
                                  item.document_url,
                                  `${item.material}_document`
                                )
                              }
                              className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-all duration-150"
                              title="Download Document"
                            >
                              <Download size={16} />
                            </button>
                          ) : (
                            <div className="inline-flex items-center justify-center w-8 h-8">
                              <span className="text-gray-400 text-xs">-</span>
                            </div>
                          )}

                          {/* View Detail Button */}
                          <button
                            onClick={() => openDetailModal(item)}
                            className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-150"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Edit Button */}
                          {(session?.user?.role === "Author" ||
                            (session?.user?.role === "Supplier" &&
                              (item.status === "NG" ||
                                item.status === "PERLU UPDATE"))) && (
                            <button
                              onClick={() => openEditModal(item)}
                              disabled={loading}
                              className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 disabled:opacity-50 rounded-full transition-all duration-150"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {/* Delete Button */}
                          {session?.user?.role === "Author" && (
                            <button
                              onClick={() => openDeleteModal(item)}
                              disabled={loading}
                              className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 disabled:opacity-50 rounded-full transition-all duration-150"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {!loading && currentData.length === 0 && (
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
                {hasActiveFilters
                  ? "No matching results found"
                  : "No data available"}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters or search terms"
                  : "Data will appear here after being added."}
              </p>
            </div>
          )}
        </div>

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
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2"
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={closeAllModals}
        title={showAddModal ? "Add New Mill Sheet" : "Edit Mill Sheet"}
        size="max-w-4xl"
      >
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Material */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) =>
                  handleFormDataChange("material", e.target.value)
                }
                placeholder="Enter material name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={isFieldDisabled("material")}
              />
            </div>

            {/* Jenis Dokumen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type <span className="text-red-500">*</span>
              </label>
              <SimpleSelect
                value={formData.id_jenis_dokumen}
                onChange={(value) =>
                  handleFormDataChange("id_jenis_dokumen", value)
                }
                options={jenisDocOptions}
                placeholder="Select document type..."
                className="w-full px-3 py-2 disabled:h-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={isFieldDisabled("id_jenis_dokumen")}
              />
            </div>

            {/* Supplier */}
            {session?.user?.role === "Author" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <SimpleSelect
                  value={formData.id_supplier}
                  onChange={(value) =>
                    handleFormDataChange("id_supplier", value)
                  }
                  options={supplierOptions}
                  placeholder="Select supplier..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isFieldDisabled("id_supplier")}
                />
              </div>
            )}

            {/* Part Name - Role-based rendering */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part Name <span className="text-red-500">*</span>
              </label>
              {session?.user?.role === "Supplier" ? (
                <input
                  type="text"
                  value={formData.part_name_manual}
                  onChange={(e) =>
                    handleFormDataChange("part_name_manual", e.target.value)
                  }
                  placeholder="Enter part name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isFieldDisabled("part_name_manual")}
                />
              ) : (
                <SimpleSelect
                  value={formData.id_part_name}
                  onChange={(value) =>
                    handleFormDataChange("id_part_name", value)
                  }
                  options={partNameOptions}
                  placeholder="Select part name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isFieldDisabled("id_part_name")}
                />
              )}
            </div>

            {/* Part Number - Role-based rendering */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part Number <span className="text-red-500">*</span>
              </label>
              {session?.user?.role === "Supplier" ? (
                <input
                  type="text"
                  value={formData.part_number_manual}
                  onChange={(e) =>
                    handleFormDataChange("part_number_manual", e.target.value)
                  }
                  placeholder="Enter part number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isFieldDisabled("part_number_manual")}
                />
              ) : (
                <SimpleSelect
                  value={formData.id_part_number}
                  onChange={(value) =>
                    handleFormDataChange("id_part_number", value)
                  }
                  options={partNumberOptions}
                  placeholder="Select part number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  disabled={isFieldDisabled("id_part_number")}
                />
              )}
            </div>

            {/* Tanggal Report */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.tanggal_report}
                placeholder="Select Report Date"
                onChange={(e) =>
                  handleFormDataChange("tanggal_report", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={isFieldDisabled("tanggal_report")}
              />
            </div>

            {/* Tanggal Expire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expire Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.tanggal_expire}
                placeholder="Select Expire Date"
                onChange={(e) =>
                  handleFormDataChange("tanggal_expire", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={isFieldDisabled("tanggal_expire")}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Status (auto calculated)
              </label>
              <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <StatusBadge status={formData.status} />
                  </div>
                  <span className="text-sm text-end text-gray-600">
                    {formData.tanggal_expire
                      ? `Based on expire date: ${formatDate(formData.tanggal_expire)}`
                      : "Please select expire date"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  <p className="font-bold mb-1">Descriptions :</p>
                  <p>
                    • <strong>OK:</strong> Document expires more than 3 months
                    from today
                  </p>
                  <p>
                    • <strong>NG:</strong> Document has already expired
                  </p>
                  <p>
                    • <strong>PERLU UPDATE:</strong> Document expires within 3
                    months
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="md:col-span-2">
              <FileUpload
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
                disabled={isFieldDisabled("document_url")}
              />
              {formData.document_url && !selectedFile && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        Current document available
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleDownload(
                          formData.document_url,
                          `${formData.material}_document`
                        )
                      }
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
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
              onClick={showAddModal ? handleAdd : handleEdit}
              disabled={
                loading ||
                !formData.material.trim() ||
                !formData.id_jenis_dokumen ||
                !formData.tanggal_expire ||
                !formData.tanggal_report ||
                (session?.user?.role === "Supplier"
                  ? !formData.part_name_manual || !formData.part_number_manual
                  : session?.user?.role === "Author"
                    ? !formData.id_part_name ||
                      !formData.id_part_number ||
                      !formData.id_supplier
                    : false)
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading
                ? showAddModal
                  ? "Saving..."
                  : "Updating..."
                : showAddModal
                  ? "Save"
                  : "Update"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeAllModals}
        title="Mill Sheet Details"
        size="max-w-4xl"
      >
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2 border-b border-gray-200 pb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Material
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.material}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Status</h5>
                  <div className="mt-1">
                    <StatusBadge status={selectedItem?.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier and Parts Information */}
            <div className="md:col-span-2 border-b border-gray-200 pb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Supplier & Parts Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Supplier
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.supplier_name}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Document Type
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.jenis_dokumen_name}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Part Number
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.part_number_name}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Part Name
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.part_name_name}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Supplier User Name
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.user_name}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Supplier User Email
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.user_email}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Supplier User Phone Number
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem?.user_no_hp}
                  </p>
                </div>
              </div>
            </div>

            {/* Date Information */}
            <div className="md:col-span-2 border-b border-gray-200 pb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Date Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Report Date
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedItem?.tanggal_report)}
                  </p>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Expire Date
                  </h5>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedItem?.tanggal_expire)}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Information */}
            <div className="md:col-span-2">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Document Information
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Document File
                  </h5>
                  <div className="mt-1">
                    {selectedItem?.document_url ? (
                      <button
                        onClick={() =>
                          handleDownload(
                            selectedItem.document_url,
                            `${selectedItem.material}_document`
                          )
                        }
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Download size={16} className="mr-1" />
                        Download Document
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">
                        No document uploaded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={closeAllModals}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
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
              Are you sure you want to delete the mill sheet record for{" "}
              <span className="font-semibold">"{selectedItem?.material}"</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone and will also delete any associated
              document.
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

export default MillSheet;
