"use client";

import React, { useState } from "react";
import {
  X,
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Trash2,
  Edit2,
  AlertTriangle,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { User } from "@/types";
import { toast } from "sonner";

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  recruiters: User[];
  onTeamUpdated: () => void;
  currentUser: User | null;
}

export function TeamManagementModal({
  isOpen,
  onClose,
  recruiters,
  onTeamUpdated,
  currentUser,
}: TeamManagementModalProps) {
  const [view, setView] = useState<"list" | "add" | "edit" | "delete">("list");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("recruiter");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete transfer state
  const [transferToId, setTransferToId] = useState("");

  if (!isOpen) return null;

  // Real-time email validation
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = cleanEmail.length === 0 || emailRegex.test(cleanEmail);

  // Real-time duplicate check
  const duplicateRecruiter =
    cleanEmail.length > 0 && isEmailValid
      ? recruiters.find(
          (r) =>
            r.email.toLowerCase() === cleanEmail &&
            r.id !== selectedUser?.id
        )
      : null;

  const isPasswordValid =
    view === "add"
      ? !password || password.trim().length >= 6
      : !password || password.trim().length >= 6;

  const handleOpenAdd = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("recruiter");
    setErrorMsg("");
    setView("add");
  };

  const handleOpenEdit = (u: User) => {
    setSelectedUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword("");
    setShowPassword(false);
    setRole(u.role);
    setErrorMsg("");
    setView("edit");
  };

  const handleOpenDelete = (u: User) => {
    setSelectedUser(u);
    const other = recruiters.find((r) => r.id !== u.id);
    setTransferToId(other ? other.id : "");
    setErrorMsg("");
    setView("delete");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      setErrorMsg("Please enter a valid full name (at least 2 characters).");
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address (e.g. recruiter@company.com).");
      return;
    }

    if (duplicateRecruiter) {
      setErrorMsg(`A team member with the email "${cleanEmail}" already exists.`);
      return;
    }

    const pwd = password.trim() || "password123";
    if (pwd.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: cleanEmail, password: pwd, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create recruiter");
      }

      toast.success(`Recruiter ${name} created successfully!`);
      onTeamUpdated();
      setView("list");
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating recruiter");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (name.trim().length < 2) {
      setErrorMsg("Please enter a valid full name (at least 2 characters).");
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (duplicateRecruiter) {
      setErrorMsg(`Another team member with the email "${cleanEmail}" already exists.`);
      return;
    }

    if (password.trim() && password.trim().length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: cleanEmail,
          role,
          password: password.trim() ? password.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update recruiter");
      }

      toast.success(`Recruiter ${name} updated successfully!`);
      onTeamUpdated();
      setView("list");
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating recruiter");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const url = transferToId
        ? `/api/users/${selectedUser.id}?transferToId=${transferToId}`
        : `/api/users/${selectedUser.id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete recruiter");
      }

      toast.success(`Recruiter ${selectedUser.name} removed`);
      onTeamUpdated();
      setView("list");
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting recruiter");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                Team & Recruiter Management
              </h2>
              <p className="text-xs text-zinc-500">
                Add, edit roles, reset passwords, or remove team members.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* VIEW 1: RECRUITERS LIST */}
          {view === "list" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Active Recruiters ({recruiters.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Manage accounts with access to the driver pipeline command center.
                  </p>
                </div>
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Recruiter</span>
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                {recruiters.map((r) => {
                  const isCurrent = currentUser?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900/60 flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0">
                          {r.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {r.name}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                You
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                r.role === "admin"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              {r.role}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {r.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          title="Edit recruiter"
                          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenDelete(r)}
                          title="Remove Recruiter"
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: ADD RECRUITER */}
          {view === "add" && (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Add New Recruitment Team Member
              </h3>

              {/* DUPLICATE WARNING BANNER */}
              {duplicateRecruiter && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Duplicate Recruiter Email Detected
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      A team member named <strong>{duplicateRecruiter.name}</strong> ({duplicateRecruiter.email}) already exists with the <strong>{duplicateRecruiter.role}</strong> role.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marcus@truckleadscenter.com"
                  className={`w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:outline-none ${
                    duplicateRecruiter
                      ? "border-amber-400 focus:ring-amber-400"
                      : !isEmailValid && cleanEmail
                      ? "border-red-400 focus:ring-red-400"
                      : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"
                  }`}
                />
                {!isEmailValid && cleanEmail && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">
                    Invalid email address format (e.g. name@domain.com)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Login Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set initial password (min 6 characters)"
                    className={`w-full pl-3 pr-10 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:outline-none ${
                      password && password.trim().length < 6
                        ? "border-red-400 focus:ring-red-400"
                        : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {password && password.trim().length < 6 && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100"
                >
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Boolean(duplicateRecruiter) || (!isEmailValid && Boolean(cleanEmail))}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Recruiter"}
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: EDIT RECRUITER */}
          {view === "edit" && selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Edit Recruiter: {selectedUser.name}
              </h3>

              {/* DUPLICATE WARNING BANNER */}
              {duplicateRecruiter && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Duplicate Recruiter Email Detected
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      Another team member named <strong>{duplicateRecruiter.name}</strong> already uses this email address.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:outline-none ${
                    duplicateRecruiter
                      ? "border-amber-400 focus:ring-amber-400"
                      : !isEmailValid && cleanEmail
                      ? "border-red-400 focus:ring-red-400"
                      : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"
                  }`}
                />
                {!isEmailValid && cleanEmail && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">
                    Invalid email address format
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Reset Password (Leave blank to keep existing)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password to reset (min 6 characters)"
                    className={`w-full pl-3 pr-10 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:outline-none ${
                      password && password.trim().length < 6
                        ? "border-red-400 focus:ring-red-400"
                        : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {password && password.trim().length < 6 && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100"
                >
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Boolean(duplicateRecruiter) || (!isEmailValid && Boolean(cleanEmail))}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* VIEW 4: DELETE RECRUITER CONFIRMATION */}
          {view === "delete" && selectedUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                    Remove Recruiter: {selectedUser.name}
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Are you sure you want to remove this recruiter from the team?
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Re-assign existing leads to:
                </label>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Do not re-assign (Set to Unassigned)</option>
                  {recruiters
                    .filter((r) => r.id !== selectedUser.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Transfer to: {r.name} ({r.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Removing..." : "Confirm & Remove"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
