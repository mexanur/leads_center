"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  UserPlus,
  Phone,
  Mail,
  Check,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  LeadSource,
  LeadStatus,
  CDLType,
  SOURCE_CONFIG,
  PIPELINE_COLUMNS,
  CDL_LABELS,
  AVAILABLE_ENDORSEMENTS,
  User,
} from "@/types";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
  onSelectExistingLead?: (leadId: string) => void;
  recruiters: User[];
  currentUser: User | null;
  defaultStatus?: string;
}

export function NewLeadModal({
  isOpen,
  onClose,
  onLeadCreated,
  onSelectExistingLead,
  recruiters,
  currentUser,
  defaultStatus = "NEW_LEAD",
}: NewLeadModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("FACEBOOK");
  const [sourceDetails, setSourceDetails] = useState("");
  const [status, setStatus] = useState<LeadStatus>(
    (defaultStatus as LeadStatus) || "NEW_LEAD"
  );
  const [cdlType, setCdlType] = useState<CDLType>("CLASS_A");
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [driverType, setDriverType] = useState("OTR");
  const [locationState, setLocationState] = useState("");
  const [desiredPay, setDesiredPay] = useState("");
  const [notesText, setNotesText] = useState("");
  const [selectedEndorsements, setSelectedEndorsements] = useState<string[]>([]);
  const [assignedToId, setAssignedToId] = useState(currentUser?.id || "");

  // Optional initial note
  const [initialNote, setInitialNote] = useState("");

  // Optional initial reminder
  const [setReminder, setSetReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60 * 1000);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [reminderTime, setReminderTime] = useState(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60 * 1000);
    future.setMinutes(Math.ceil(future.getMinutes() / 15) * 15, 0, 0);
    const hours = String(future.getHours()).padStart(2, "0");
    const mins = String(future.getMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  });
  const [reminderAdvance, setReminderAdvance] = useState(15);

  // Validation & Duplicate Checking State
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<any | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsOpenRef = useRef(false);

  // Reset ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFullName("");
      setPhone("");
      setEmail("");
      setSource("FACEBOOK");
      setSourceDetails("");
      setStatus((defaultStatus as LeadStatus) || "NEW_LEAD");
      setCdlType("CLASS_A");
      setExperienceYears(0);
      setDriverType("OTR");
      setLocationState("");
      setDesiredPay("");
      setNotesText("");
      setSelectedEndorsements([]);
      setAssignedToId(currentUser?.id || "");
      setInitialNote("");
      setSetReminder(false);
      setDuplicateLead(null);
      setAllowDuplicate(false);
      setPhoneError("");
      setEmailError("");
      setErrorMsg("");
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, defaultStatus, currentUser?.id]);

  // Real-time Phone Auto-format
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX if 10 digits
    if (raw.startsWith("+")) {
      setPhone(raw);
    } else if (digits.length <= 3) {
      setPhone(digits.length > 0 ? `(${digits}` : "");
    } else if (digits.length <= 6) {
      setPhone(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
    } else {
      setPhone(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`);
    }

    if (digits.length > 0 && digits.length < 10) {
      setPhoneError("Enter at least 10 digits");
    } else {
      setPhoneError("");
    }
  };

  // Real-time Email validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);

    if (val.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val.trim())) {
        setEmailError("Invalid email format");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  };

  // Live Deduplication Check with Debounce
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    const cleanEmail = email.trim();

    if (digits.length < 10 && (!cleanEmail || !cleanEmail.includes("@"))) {
      setDuplicateLead(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const params = new URLSearchParams();
        if (digits.length >= 10) params.append("phone", phone);
        if (cleanEmail && cleanEmail.includes("@")) params.append("email", cleanEmail);

        const res = await fetch(`/api/leads/check-duplicate?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setDuplicateLead(data.lead);
          } else {
            setDuplicateLead(null);
          }
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [phone, email]);

  if (!isOpen) return null;

  const toggleEndorsement = (item: string) => {
    setSelectedEndorsements((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMsg("Driver Full Name is required.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setErrorMsg("Please enter a valid phone number with at least 10 digits.");
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }
    }

    if (duplicateLead && !allowDuplicate) {
      setErrorMsg("A duplicate lead already exists. Check the warning above to view or ignore.");
      return;
    }

    if (setReminder && reminderDate && reminderTime) {
      const dueAtDate = new Date(`${reminderDate}T${reminderTime}:00`);
      if (dueAtDate.getTime() <= Date.now()) {
        setErrorMsg("Scheduled reminder time cannot be in the past. Please select a future date and time.");
        return;
      }
    }

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      let reminderDueAt: string | undefined = undefined;
      if (setReminder && reminderDate && reminderTime) {
        reminderDueAt = new Date(`${reminderDate}T${reminderTime}:00`).toISOString();
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          source,
          sourceDetails: sourceDetails.trim() || undefined,
          status,
          cdlType,
          experienceYears: Number(experienceYears) || 0,
          endorsements: selectedEndorsements,
          driverType,
          locationState: locationState.trim().toUpperCase() || undefined,
          desiredPay: desiredPay.trim() || undefined,
          notesText: notesText.trim() || undefined,
          assignedToId: assignedToId || undefined,
          initialNote: initialNote.trim() || undefined,
          reminderDueAt,
          reminderTitle: reminderTitle.trim() || `Follow-up call with ${fullName}`,
          reminderAdvanceMinutes: Number(reminderAdvance),
          currentUserName: currentUser?.name || "Recruiter",
          allowDuplicate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.existingLead) {
          setDuplicateLead(data.existingLead);
        }
        throw new Error(data.error || "Failed to create lead");
      }

      onLeadCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                Add New Driver Lead
              </h2>
              <p className="text-xs text-zinc-500">
                Create a new truck driver profile and start recruitment workflow.
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {/* General Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600">
              {errorMsg}
            </div>
          )}

          {/* DUPLICATE DRIVER WARNING BANNER */}
          {duplicateLead && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                      Duplicate Driver Lead Detected!
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      A driver named <strong>{duplicateLead.fullName}</strong> ({duplicateLead.phone}) already exists in{" "}
                      <span className="font-bold underline">{duplicateLead.status?.replace(/_/g, " ")}</span> stage
                      {duplicateLead.assignedTo ? ` (Assigned: ${duplicateLead.assignedTo?.name || duplicateLead.assignedTo})` : ""}.
                    </p>
                  </div>
                </div>

                {onSelectExistingLead && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectExistingLead(duplicateLead.id);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-800/80 hover:bg-amber-300 transition-colors shrink-0 shadow-xs"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/80 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowDuplicateCheck"
                  checked={allowDuplicate}
                  onChange={(e) => setAllowDuplicate(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
                <label
                  htmlFor="allowDuplicateCheck"
                  className="text-[11px] font-bold text-amber-800 dark:text-amber-300 cursor-pointer"
                >
                  Ignore duplicate and create new re-application lead anyway
                </label>
              </div>
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Driver Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Phone Number with Real-time Formatting & Duplicate Check Spinner */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Phone Number *
                </label>
                {isCheckingDuplicate && (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking duplicate...
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(555) 234-5678"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border focus:ring-2 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100 ${
                    phoneError
                      ? "border-red-400 focus:ring-red-400"
                      : duplicateLead
                      ? "border-amber-400 focus:ring-amber-400"
                      : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"
                  }`}
                />
              </div>
              {phoneError && (
                <p className="text-[11px] text-red-500 mt-1 font-semibold">{phoneError}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="driver@example.com"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border focus:ring-2 focus:outline-none text-zinc-900 dark:text-zinc-100 ${
                    emailError
                      ? "border-red-400 focus:ring-red-400"
                      : "border-zinc-200 dark:border-zinc-700 focus:ring-blue-500"
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-[11px] text-red-500 mt-1 font-semibold">{emailError}</p>
              )}
            </div>

            {/* Home State */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Home State / Location
              </label>
              <input
                type="text"
                maxLength={2}
                value={locationState}
                onChange={(e) => setLocationState(e.target.value.toUpperCase())}
                placeholder="e.g. TX, OH, GA"
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-zinc-900 dark:text-zinc-100 uppercase"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Lead Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Details */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Source Details (Campaign / Referrer)
              </label>
              <input
                type="text"
                value={sourceDetails}
                onChange={(e) => setSourceDetails(e.target.value)}
                placeholder="e.g. Facebook Ad, Referral, Telegram"
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Stage */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Initial Pipeline Stage
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {PIPELINE_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* CDL Class */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                CDL License Type
              </label>
              <select
                value={cdlType}
                onChange={(e) => setCdlType(e.target.value as CDLType)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {Object.entries(CDL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience Years */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Years of Driving Experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Driver Route Type */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Driver Route Preference
              </label>
              <select
                value={driverType}
                onChange={(e) => setDriverType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <option value="OTR">OTR (Over The Road)</option>
                <option value="Regional">Regional Dedicated</option>
                <option value="Local">Local</option>
                <option value="Lease Purchase">Lease Purchase</option>
                <option value="Owner-Operator">Owner-Operator</option>
              </select>
            </div>

            {/* Desired Pay */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Desired Pay / Target CPM
              </label>
              <input
                type="text"
                value={desiredPay}
                onChange={(e) => setDesiredPay(e.target.value)}
                placeholder="e.g. $0.70 CPM or $2,200/wk"
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Recruiter */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Assign to Recruiter
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Unassigned</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Endorsements Checklist */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Endorsements & Qualifications
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {AVAILABLE_ENDORSEMENTS.map((item) => {
                const isChecked = selectedEndorsements.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleEndorsement(item)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] font-semibold transition-all text-left ${
                      isChecked
                        ? "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300"
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isChecked
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-zinc-300"
                      }`}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="truncate">{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initial Note */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Initial Note (Optional)
            </label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="e.g. Inbound inquiry from Facebook ad. Driver looking to start next Monday."
              className="w-full p-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Follow-up Reminder Section */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={setReminder}
                  onChange={(e) => setSetReminder(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Schedule Initial Follow-up Reminder</span>
              </label>
            </div>

            {setReminder && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      min={(() => {
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, "0");
                        const dd = String(now.getDate()).padStart(2, "0");
                        return `${yyyy}-${mm}-${dd}`;
                      })()}
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full p-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className={`w-full p-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border text-zinc-900 dark:text-zinc-100 ${
                        reminderDate &&
                        reminderTime &&
                        new Date(`${reminderDate}T${reminderTime}:00`).getTime() <= Date.now()
                          ? "border-red-500"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                      Advance Notice
                    </label>
                    <select
                      value={reminderAdvance}
                      onChange={(e) => setReminderAdvance(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold"
                    >
                      <option value={0}>At time (0m)</option>
                      <option value={15}>15 mins prior</option>
                      <option value={30}>30 mins prior</option>
                      <option value={60}>1 hour prior</option>
                    </select>
                  </div>
                </div>

                {reminderDate &&
                  reminderTime &&
                  new Date(`${reminderDate}T${reminderTime}:00`).getTime() <= Date.now() && (
                    <p className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Reminder time cannot be in the past.
                    </p>
                  )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? "Creating Lead..." : "Create Driver Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
