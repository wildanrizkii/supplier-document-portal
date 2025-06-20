"use client";
import React, { useState, useEffect } from "react";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { HiOutlineCog6Tooth, HiOutlineShieldCheck } from "react-icons/hi2";
import supabase from "@/app/utils/db";
import bcryptjs from "bcryptjs";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [originalData, setOriginalData] = useState({
    name: "",
    email: "",
    hashedPassword: "",
  });

  const { data: session } = useSession();

  const fetchUser = async () => {
    const idUser = session?.user?.id;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id_user, nama, email, password")
        .eq("id_user", idUser)
        .single();

      if (error) throw error;

      if (data) {
        const userData = data;
        const userInfo = {
          id: userData.id_user,
          name: userData.nama,
          email: userData.email,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        };

        setFormData(userInfo);
        setOriginalData({
          name: userData.nama,
          email: userData.email,
          hashedPassword: userData.password,
        });
      }
    } catch (error) {
      console.error("Error fetching data: ", error);
      toast.error("Error fetching data: " + error.message);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUser();
    }
  }, [session]);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    const basicInfoChanged =
      formData.name !== originalData.name ||
      formData.email !== originalData.email;

    const passwordFieldsFilled =
      formData.currentPassword ||
      formData.newPassword ||
      formData.confirmPassword;

    if (!basicInfoChanged && !passwordFieldsFilled) {
      toast.error("No changes have been made");
      return false;
    }

    if (passwordFieldsFilled) {
      if (!formData.currentPassword) {
        toast.error("Current password is required");
        return false;
      }
      if (!formData.newPassword) {
        toast.error("New password is required");
        return false;
      }
      if (!formData.confirmPassword) {
        toast.error("Password confirmation is required");
        return false;
      }
      if (formData.newPassword.length < 8) {
        toast.error("New password must be at least 8 characters");
        return false;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New password and confirmation do not match");
        return false;
      }
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let updateData = {};
      let needsUpdate = false;

      if (formData.name !== originalData.name) {
        updateData.nama = formData.name.trim();
        needsUpdate = true;
      }

      if (formData.email !== originalData.email) {
        const { data: existingUser, error: emailCheckError } = await supabase
          .from("users")
          .select("id_user")
          .eq("email", formData.email)
          .neq("id_user", formData.id);

        if (emailCheckError) throw emailCheckError;

        if (existingUser && existingUser.length > 0) {
          toast.error("Email is already in use by another user");
          return;
        }

        updateData.email = formData.email.trim();
        needsUpdate = true;
      }

      if (formData.currentPassword && formData.newPassword) {
        const isCurrentPasswordValid = await bcryptjs.compare(
          formData.currentPassword,
          originalData.hashedPassword
        );

        if (!isCurrentPasswordValid) {
          toast.error("Current password is incorrect");
          return;
        }

        const saltRounds = 12;
        const hashedNewPassword = await bcryptjs.hash(
          formData.newPassword,
          saltRounds
        );
        updateData.password = hashedNewPassword;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id_user", formData.id);

        if (updateError) throw updateError;

        setOriginalData((prev) => ({
          ...prev,
          name: updateData.nama || prev.name,
          email: updateData.email || prev.email,
          hashedPassword: updateData.password || prev.hashedPassword,
        }));

        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));

        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error.message || "An error occurred while updating the profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordValid = formData.newPassword.length >= 8;
  const doPasswordsMatch = formData.newPassword === formData.confirmPassword;

  const tabs = [
    { id: "profile", label: "Profile", icon: HiOutlineCog6Tooth },
    { id: "password", label: "Security", icon: HiOutlineShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50/30 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">
            Account Settings
          </h1>
          <p className="text-gray-500 mt-2 font-light">
            Manage your profile and security preferences
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-100">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 px-6 py-5 text-md font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "text-zinc-900 bg-zinc-50/50 border-b-2 border-zinc-900"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50/50"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === "profile" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-light text-gray-900 mb-8">
                    Profile Information
                  </h2>

                  <div className="space-y-6">
                    {/* Full Name */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FaUser className="h-4 w-4 text-gray-400 group-focus-within:text-zinc-900 transition-colors" />
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={formData.name || ""}
                          onChange={handleInputChange}
                          className="block w-full pl-12 pr-4 py-4 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 focus:bg-white transition-all duration-200 placeholder-gray-400"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FaEnvelope className="h-4 w-4 text-gray-400 group-focus-within:text-zinc-900 transition-colors" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={formData.email || ""}
                          onChange={handleInputChange}
                          className="block w-full pl-12 pr-4 py-4 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 focus:bg-white transition-all duration-200 placeholder-gray-400"
                          placeholder="Enter your email address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-zinc-800 to-zinc-900 text-white py-4 px-6 rounded-xl hover:from-zinc-900 hover:to-black focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-200 shadow-sm"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving changes...
                        </div>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "password" && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-light text-gray-900 mb-8">
                    Security Settings
                  </h2>

                  <div className="space-y-6">
                    {/* Current Password */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Current Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FaLock className="h-4 w-4 text-gray-400 group-focus-within:text-zinc-900 transition-colors" />
                        </div>
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className="block w-full pl-12 pr-12 py-4 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 focus:bg-white transition-all duration-200 placeholder-gray-400"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("current")}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPasswords.current ? (
                            <FaEye className="h-4 w-4" />
                          ) : (
                            <FaEyeSlash className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FaLock className="h-4 w-4 text-gray-400 group-focus-within:text-zinc-900 transition-colors" />
                        </div>
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="block w-full pl-12 pr-12 py-4 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 focus:bg-white transition-all duration-200 placeholder-gray-400"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("new")}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPasswords.new ? (
                            <FaEye className="h-4 w-4" />
                          ) : (
                            <FaEyeSlash className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {formData.newPassword && !isPasswordValid && (
                        <p className="text-xs text-red-500 mt-2 pl-1">
                          Password must be at least 8 characters
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FaLock className="h-4 w-4 text-gray-400 group-focus-within:text-zinc-900 transition-colors" />
                        </div>
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="block w-full pl-12 pr-12 py-4 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 focus:bg-white transition-all duration-200 placeholder-gray-400"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("confirm")}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPasswords.confirm ? (
                            <FaEye className="h-4 w-4" />
                          ) : (
                            <FaEyeSlash className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {formData.confirmPassword && !doPasswordsMatch && (
                        <p className="text-xs text-red-500 mt-2 pl-1">
                          Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-zinc-800 to-zinc-900 text-white py-4 px-6 rounded-xl hover:from-zinc-900 hover:to-black focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-200 shadow-sm"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Updating password...
                        </div>
                      ) : (
                        "Update Password"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
