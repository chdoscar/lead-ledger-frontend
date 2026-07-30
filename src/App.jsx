import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Phone, MessageCircle, Copy, Pencil, Plus, Search, Settings as SettingsIcon,
  X, Check, ChevronDown, ChevronUp, Users, Building2, Tag, Inbox, ClipboardPaste,
  ShieldCheck, UserCog, Trash2, Loader2, Sparkles, Info, Calendar, Filter, NotebookText,
  FileText, Briefcase, Wallet, Home
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Design tokens — "Ledger Desk"                                      */
/*  Deep ink surfaces, brass/amber accent (loan-office ledger feel),   */
/*  condensed display type for headers, monospace for figures.         */
/* ------------------------------------------------------------------ */
const INK = "#0F1620";
const INK_2 = "#161F2C";
const INK_3 = "#1D2836";
const HAIRLINE = "#2A3644";
const PAPER = "#EDE7D9";
const PAPER_DIM = "#A9A290";
const BRASS = "#4F46E5";
const BRASS_SOFT = "rgba(79,70,229,0.14)";

const STATUS_SWATCHES = ["#059669", "#2563EB", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];

// ⚠️ Set this to your deployed backend's URL (from Render, step 4 of the
// backend README) — e.g. "https://lead-ledger-backend-xxxx.onrender.com/api"
const API_BASE = "https://lead-ledger-backend.onrender.com/api";

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

import { createClient } from "@supabase/supabase-js";

// Safe to expose in the browser — this is the public "anon" key, not the
// service_role key (that one stays backend-only). Real data access is
// still controlled by your backend API; this connection is only used to
// listen for live changes on the leads table.
console.log(
  "[Realtime] Supabase URL set:", !!import.meta.env.VITE_SUPABASE_URL,
  "| anon key set:", !!import.meta.env.VITE_SUPABASE_ANON_KEY
);
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const uid = () => Math.random().toString(36).slice(2, 10);

function toSnake(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())] = v;
  }
  return out;
}
function toCamel(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

function nowInMalaysia() {
  // Reads "wall clock" Malaysia time (UTC+8) regardless of what timezone
  // the device itself is set to, so every agent's app agrees on what
  // "today" is even if someone's phone is misconfigured.
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
}
function todayKey() {
  const d = nowInMalaysia();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function dateKeyToInputValue(k) {
  if (!k) return "";
  const [dd, mm, yyyy] = k.split("/");
  return `${yyyy}-${mm}-${dd}`;
}
function inputValueToDateKey(v) {
  if (!v) return "";
  const [yyyy, mm, dd] = v.split("-");
  return `${dd}/${mm}/${yyyy}`;
}
function nowTime() {
  const d = nowInMalaysia();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
function fmtTime(value) {
  if (!value) return "";
  // Leads created via the CloudMailin webhook carry a real ISO timestamp;
  // leads added by hand in this UI already carry a pre-formatted "H:MM AM/PM"
  // string. Handle both, and always display in Malaysia time regardless of
  // the viewing device's own timezone setting.
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  const d = new Date(parsed.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
function dateSortKey(k) {
  const [dd, mm, yyyy] = k.split("/").map(Number);
  return yyyy * 10000 + mm * 100 + dd;
}
function dayName(k) {
  const [dd, mm, yyyy] = k.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd).toLocaleDateString("en-GB", { weekday: "long" });
}
function fmtMoney(n) {
  if (n === "" || n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return "RM " + num.toLocaleString("en-MY");
}
function fmtNum(n) {
  if (n === "" || n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return num.toLocaleString("en-MY");
}
function contrastText(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return "#000000";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#FFFFFF";
}
function darkenHex(hex, amt) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return "#000000";
  const r = Math.max(0, Math.floor(parseInt(h.slice(0, 2), 16) * (1 - amt)));
  const g = Math.max(0, Math.floor(parseInt(h.slice(2, 4), 16) * (1 - amt)));
  const b = Math.max(0, Math.floor(parseInt(h.slice(4, 6), 16) * (1 - amt)));
  return `rgb(${r},${g},${b})`;
}
function initials(name) {
  return (name || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}
function shortAgentName(name) {
  return (name || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}
function phoneSizeCls(phone) {
  const len = (phone || "").length;
  if (len > 34) return "text-[10.5px]";
  if (len > 26) return "text-[11.5px]";
  if (len > 20) return "text-[12.5px]";
  if (len > 15) return "text-[13.5px]";
  return "text-[15px]";
}
function remarkSizeCls(remark) {
  const len = (remark || "").length;
  if (len > 90) return "text-[10px]";
  if (len > 60) return "text-[11px]";
  if (len > 35) return "text-[12px]";
  return "text-[13px]";
}
function loanTypeSizeCls(text) {
  const len = (text || "").length;
  if (len > 28) return "text-[11.5px]";
  if (len > 20) return "text-[13px]";
  if (len > 14) return "text-[14px]";
  return "text-[15px]";
}

/* ------------------------------------------------------------------ */
/*  Tiny lead-extraction heuristic (stand-in for real inbox parsing)   */
/* ------------------------------------------------------------------ */
function extractLeadFromText(raw) {
  const text = raw || "";
  const phoneMatch = text.match(/(\+?6?0?1[0-9][\s-]?\d{3,4}[\s-]?\d{4})/);
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const salaryMatch = text.match(/(?:net\s*salary|salary|income)\D{0,6}(\d[\d,]{2,})/i);
  const loanAmtMatch = text.match(/(?:loan amount|amount|loan)\D{0,6}(\d[\d,]{3,})/i);
  const nameMatch = text.match(/(?:name)\s*[:\-]\s*([A-Za-z ,.'-]{2,40})/i);
  const typeMatch = text.match(/(?:loan type|type)\s*[:\-]\s*([A-Za-z /-]{2,40})/i);
  const locMatch = text.match(/(?:location|address|state|city)\s*[:\-]\s*([A-Za-z ,.'-]{2,40})/i);
  const jobMatch = text.match(/(?:job title|occupation|position|job)\s*[:\-]\s*([A-Za-z ,.'-]{2,40})/i);

  let guessedName = nameMatch ? nameMatch[1].trim() : "";
  if (!guessedName) {
    const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l && !/@|http|\d{3,}/.test(l));
    if (firstLine && firstLine.length < 40) guessedName = firstLine;
  }

  return {
    loanType: typeMatch ? typeMatch[1].trim() : "",
    phone: phoneMatch ? phoneMatch[1].trim() : "",
    email: emailMatch ? emailMatch[0].trim() : "",
    name: guessedName,
    location: locMatch ? locMatch[1].trim() : "",
    jobTitle: jobMatch ? jobMatch[1].trim() : "",
    netSalary: salaryMatch ? salaryMatch[1].replace(/,/g, "") : "",
    loanAmount: loanAmtMatch ? loanAmtMatch[1].replace(/,/g, "") : "",
  };
}

/* ------------------------------------------------------------------ */
/*  Small UI atoms                                                     */
/* ------------------------------------------------------------------ */
function IconBtn({ icon: Icon, label, onClick, tone = "default", disabled }) {
  const tones = {
    default: "text-slate btn3d-default",
    call: "text-sky btn3d-call",
    chat: "text-leaf btn3d-chat",
    edit: "text-amber btn3d-edit",
    danger: "text-rust btn3d-danger",
  };
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`btn3d inline-flex items-center justify-center w-8 h-8 rounded-full disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none ${tones[tone]}`}
    >
      <Icon size={15} strokeWidth={2.6} />
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-dim mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full bg-ink border border-hairline rounded-lg px-3 py-2 text-sm text-cream placeholder-faint focus:outline-none focus-border-brass focus:ring-1 focus-ring-brass";

function Toast({ text, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink3 border border-hairline text-cream text-sm px-4 py-2 rounded-full shadow-xl z-[100] flex items-center gap-2">
      <Check size={14} className="text-sage" /> {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lead Card                                                          */
/* ------------------------------------------------------------------ */
function LeadCard({ lead, index, website, statuses, agents, role, onEdit, onStatusChange, onSubStatusChange, onAssign, onRemarkChange, onDeleteRequest, notify }) {
  const status = statuses.find((s) => s.id === lead.statusId) || { id: lead.statusId, name: "Unknown", color: "#9CA3AF" };
  const agent = agents.find((a) => a.id === lead.assignedAgentId);
  const editedCls = (f) => (lead.edited?.[f] ? "underline decoration-dotted decoration-brass underline-offset-4" : "");
  const [expanded, setExpanded] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState(lead.remark || "");

  const saveRemark = () => {
    setEditingRemark(false);
    if (remarkDraft !== lead.remark) onRemarkChange(lead.id, remarkDraft);
  };

  const call = () => window.open(`tel:${lead.phone.replace(/[^\d+]/g, "")}`, "_self");
  const chat = () => { window.location.href = `whatsapp://send?phone=${lead.phone.replace(/[^\d]/g, "")}`; };
  const copy = (val, label) => {
    navigator.clipboard?.writeText(val);
    notify(`${label} copied`);
  };

  return (
    <div className="relative bg-ink2 border border-hairline rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover-border-hairline transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">

          {/* Row 1 — phone + actions + info toggle */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[11px] font-mono font-semibold text-brass shrink-0 w-4 text-right -ml-1.5">{index}.</span>
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#DCEAFE" }}>
                <Phone size={11} className="text-sky" strokeWidth={2.6} />
              </span>
              <div style={{ color: "#000000" }} className={`font-mono font-bold underline underline-offset-2 ${phoneSizeCls(lead.phone)} min-w-0 ${(lead.phone || "").includes("/") ? "break-words" : "whitespace-nowrap"} ${editedCls("phone")}`}>
                {lead.phone || "—"}
              </div>
              <button
                onClick={() => copy(lead.phone, "Phone")}
                disabled={!lead.phone}
                title="Copy phone"
                aria-label="Copy phone"
                className="text-slate hover-cream shrink-0 p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Copy size={13} strokeWidth={2.2} />
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
              <button
                onClick={() => setExpanded((e) => !e)}
                title={expanded ? "Hide info" : "Show name & email"}
                className={`btn3d inline-flex items-center justify-center w-8 h-8 rounded-full ${expanded ? "text-brass btn3d-edit" : "text-dim btn3d-default"}`}
              >
                <Info size={15} strokeWidth={2.6} />
              </button>
              <IconBtn icon={MessageCircle} label="WhatsApp" tone="chat" onClick={chat} disabled={!lead.phone} />
              <IconBtn icon={Phone} label="Call" tone="call" onClick={call} disabled={!lead.phone} />
            </div>
          </div>

          {/* Row 2 — loan type / time — agent assign */}
          <div className="flex items-start justify-between gap-2 mt-1">
            <div className={`flex items-start gap-1.5 font-semibold ${loanTypeSizeCls(lead.loanType)} text-cream min-w-0 flex-1 break-words ${editedCls("loanType")}`}>
              <span className="w-4 shrink-0 -ml-1.5" />
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FEF0C7" }}>
                <FileText size={11} className="text-amber" strokeWidth={2.6} />
              </span>
              <span>
                {lead.loanType || <span className="text-faint italic font-normal">WhatsApp Lead</span>}
                <span className="ml-2 font-mono text-[12px] font-normal text-dim whitespace-nowrap">{fmtTime(lead.receivedTime)}</span>
              </span>
            </div>
            <div className="relative shrink-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-brass-15 flex items-center justify-center pointer-events-none">
                <UserCog size={9} className="text-brass" strokeWidth={2.5} />
              </span>
              <select
                value={lead.assignedAgentId}
                onChange={(e) => onAssign(lead.id, e.target.value)}
                className="text-[11px] font-semibold rounded-full pl-7 pr-3 py-1.5 border border-hairline bg-ink2 text-dim shadow-sm focus:outline-none focus-border-brass cursor-pointer appearance-none"
              >
                {agents.filter((a) => a.active !== false || a.id === lead.assignedAgentId).map((a) => (
                  <option key={a.id} value={a.id} style={{ color: "#000" }}>{shortAgentName(a.name)}{a.active === false ? " (off)" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expandable info — name & email */}
          {expanded && (
            <div className="mt-1 pl-2 border-l-2 border-hairline space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px]">
                  <span className="text-[10px] uppercase tracking-wide text-faint mr-2">Name</span>
                  <span className={`text-cream ${editedCls("name")}`}>
                    {lead.name || <span className="text-faint italic">Not set</span>}
                  </span>
                </div>
                <IconBtn icon={Copy} label="Copy name" onClick={() => copy(lead.name, "Name")} disabled={!lead.name} />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px]">
                  <span className="text-[10px] uppercase tracking-wide text-faint mr-2">Email</span>
                  <span className="text-tan">
                    {lead.email || <span className="text-faint italic">Not set</span>}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <IconBtn icon={Copy} label="Copy email" onClick={() => copy(lead.email, "Email")} disabled={!lead.email} />
                  <button
                    onClick={() => { onEdit(lead); setExpanded(false); }}
                    className="btn3d btn3d-edit text-amber inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
                  >
                    <Pencil size={11} strokeWidth={2.6} /> Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Row 3 — job title · location */}
          <div className={`flex items-start gap-1.5 text-[12.5px] text-dim mt-0.5 break-words ${editedCls("meta")}`}>
            <span className="w-4 shrink-0 -ml-1.5" />
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#D1F5DF" }}>
              <Briefcase size={11} className="text-leaf" strokeWidth={2.6} />
            </span>
            <span>{lead.jobTitle || "—"} <span className="text-[10px]">({lead.location || "—"})</span></span>
          </div>

          {/* Row 3b — net salary → loan amount — status */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="flex items-center gap-1.5 text-[17px] font-bold text-cream">
              <span className="w-4 shrink-0 -ml-1.5" />
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#EDE4FE" }}>
                <Wallet size={11} style={{ color: "#7C3AED" }} strokeWidth={2.6} />
              </span>
              <span>{fmtNum(lead.netSalary)}</span>
              {lead.salaryThrough && <span className="text-[9px] text-faint ml-0.5">({lead.salaryThrough})</span>}
              <span className="font-bold text-[24px] leading-none mx-1.5 text-brass flex items-center -translate-y-0.5">⟶</span>
              <span>{fmtNum(lead.loanAmount)}</span>
            </div>
            <div className="relative inline-flex shrink-0">
              {status.animated && (
                <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-10">
                  <span className="status-shimmer-bar" style={{ color: status.color }} />
                </span>
              )}
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: status.color }} />
              <select
                value={lead.statusId}
                onChange={(e) => onStatusChange(lead.id, e.target.value)}
                style={{ borderColor: status.color, color: contrastText(status.color), background: status.color }}
                className={`relative flex items-center justify-center text-center text-[11px] font-semibold rounded-full pl-5 pr-6 py-1.5 border shadow-sm focus:outline-none appearance-none cursor-pointer max-w-[110px] truncate ${status.animated ? "status-glow-pulse" : ""}`}
              >
                {!statuses.some((s) => s.id === lead.statusId) && (
                  <option value={lead.statusId} style={{ color: "#000000" }}>Unknown (deleted)</option>
                )}
                {statuses.map((s) => (
                  <option key={s.id} value={s.id} style={{ color: "#000000" }}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: status.color }} strokeWidth={2.5} />
            </div>
          </div>

          {status.subOptions && status.subOptions.length > 0 && (
            <div className="flex justify-end mt-1">
              <select
                value={lead.subStatus || ""}
                onChange={(e) => onSubStatusChange(lead.id, e.target.value)}
                className="text-[10px] text-dim bg-ink border border-hairline rounded-full px-2.5 py-1 focus:outline-none appearance-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="">Others</option>
                {status.subOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Row 4 — remark, full width */}
          <div className="mt-1.5">
            {editingRemark ? (
              <textarea
                autoFocus
                rows={2}
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
                onBlur={saveRemark}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
                  if (e.key === "Escape") { setRemarkDraft(lead.remark || ""); setEditingRemark(false); }
                }}
                placeholder="Type a remark…"
                className="w-full text-[13px] italic bg-ink border border-brass rounded-lg px-2 py-1.5 text-cream focus:outline-none focus-ring-brass"
              />
            ) : (
              <div
                onClick={() => { setRemarkDraft(lead.remark || ""); setEditingRemark(true); }}
                className={`break-words font-semibold text-cream cursor-text px-2.5 py-1.5 rounded-lg border text-[13px] ${lead.remark ? "bg-brass-15 border-brass-30" : "border-hairline"} ${editedCls("remark")}`}
              >
                {lead.remark ? lead.remark : <span className="italic font-normal text-faint">Tap to add remark</span>}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit modal                                                         */
/* ------------------------------------------------------------------ */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const agent = await api("/login", { method: "POST", body: { username, password } });
      onLogin(toCamel(agent));
    } catch (e) {
      setError(e.message || "Username or password is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="w-full max-w-xs bg-ink2 border border-hairline rounded-2xl shadow-sm p-6">
        <div className="flex flex-col items-center mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "linear-gradient(155deg, #A855F7, #7C3AED)", boxShadow: "0 2px 5px rgba(124,58,237,0.4)" }}
          >
            <NotebookText size={22} className="text-white" strokeWidth={2.3} />
          </div>
          <h1 className="text-cream font-semibold text-[17px]">Lead</h1>
          <p className="text-faint text-[11px] mt-0.5">Sign in to continue</p>
        </div>

        <label className="block mb-3">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-faint mb-1.5 font-semibold">Username</span>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="w-full bg-ink border border-hairline rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus-border-brass"
          />
        </label>
        <label className="block mb-1">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-faint mb-1.5 font-semibold">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="w-full bg-ink border border-hairline rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus-border-brass"
          />
        </label>
        {error && <p className="text-[11px] text-rust mt-2">{error}</p>}
        <button onClick={submit} disabled={loading} className="w-full mt-4 px-4 py-2.5 text-sm font-semibold bg-brass text-ink rounded-lg hover:brightness-110 transition-all disabled:opacity-50">
          {loading ? "Logging in…" : "Log in"}
        </button>
        <p className="text-[10px] text-faint text-center mt-4">Ask your super admin if you don't have a username or password yet.</p>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ lead, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ink2 border border-hairline rounded-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-brass-15">
            <Trash2 size={16} className="text-rust" strokeWidth={2.4} />
          </span>
          <h3 className="text-cream font-semibold text-[15px]">Delete this lead?</h3>
        </div>
        <p className="text-[13px] text-dim mb-1">
          Are you sure you want to delete <strong className="text-cream">{lead.name || lead.phone || "this lead"}</strong>?
        </p>
        <p className="text-[11px] text-faint mb-5">This can't be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dim hover-cream">Cancel</button>
          <button
            onClick={() => onConfirm(lead.id)}
            className="px-4 py-2 text-sm font-medium bg-rust text-ink rounded-lg hover:brightness-110"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLeadModal({ lead, onClose, onSave, role, onDeleteRequest }) {
  const [form, setForm] = useState({ ...lead });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    const edited = { ...(lead.edited || {}) };
    ["loanType", "phone", "email", "name", "remark"].forEach((k) => {
      if (form[k] !== lead[k]) edited[k] = true;
    });
    if (form.jobTitle !== lead.jobTitle || form.location !== lead.location || form.netSalary !== lead.netSalary || form.loanAmount !== lead.loanAmount) {
      edited.meta = true;
    }
    onSave({
      ...form,
      edited,
      netSalary: String(form.netSalary || "").trim() ? String(form.netSalary).trim() : null,
      loanAmount: String(form.loanAmount || "").trim() ? String(form.loanAmount).trim() : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ink2 border border-hairline rounded-2xl shadow-xl w-full max-w-md max-h-[86vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-cream font-semibold text-[15px]">Edit lead</h3>
          <button onClick={onClose} className="text-dim hover-cream"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <Field label="Loan type"><input className={inputCls} value={form.loanType} onChange={set("loanType")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Email"><input className={inputCls} value={form.email} onChange={set("email")} /></Field>
          </div>
          <Field label="Name"><input className={inputCls} value={form.name} onChange={set("name")} /></Field>
          <Field label="Job title"><input className={inputCls} value={form.jobTitle} onChange={set("jobTitle")} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Location"><input className={inputCls} value={form.location} onChange={set("location")} /></Field>
            <Field label="Net salary"><input className={inputCls} value={form.netSalary} onChange={set("netSalary")} /></Field>
            <Field label="Loan amount"><input className={inputCls} value={form.loanAmount} onChange={set("loanAmount")} /></Field>
          </div>
          <Field label="Salary through">
            <select className={inputCls} value={form.salaryThrough || ""} onChange={set("salaryThrough")}>
              <option value="">—</option>
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
            </select>
          </Field>
          <Field label="Remark">
            <textarea rows={3} className={inputCls} value={form.remark} onChange={set("remark")} />
          </Field>
        </div>
        <div className="flex items-center justify-between mt-5">
          {role === "admin" ? (
            <button
              onClick={() => onDeleteRequest(lead)}
              className="btn3d btn3d-danger text-rust inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-full"
            >
              <Trash2 size={13} strokeWidth={2.6} /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-dim hover-cream">Cancel</button>
            <button onClick={save} className="px-4 py-2 text-sm font-medium bg-brass text-ink rounded-lg hover:brightness-110">
              Save changes
            </button>
          </div>
        </div>
        <p className="text-[10px] text-faint mt-3">Changed fields will show a dotted underline on the lead card.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-lead modal (paste-and-extract, stand-in for inbox auto-read)   */
/* ------------------------------------------------------------------ */
function AddLeadModal({ website, onClose, onAdd, currentAgentId, statuses }) {
  const [fields, setFields] = useState({
    loanType: "", phone: "", email: "", name: "", jobTitle: "", location: "", netSalary: "", loanAmount: "", salaryThrough: "", remark: "",
  });
  const [source, setSource] = useState("whatsapp"); // "website" -> New Lead, "whatsapp" -> Contacted

  const defaultStatus = (() => {
    const findByName = (names) => statuses.find((s) => names.includes(s.name.trim().toLowerCase()));
    if (source === "whatsapp") return findByName(["contacted"]) || statuses[1] || statuses[0];
    return findByName(["new lead", "new"]) || statuses[0];
  })();

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const confirmAdd = () => {
    onAdd({
      id: uid(),
      websiteId: website.id,
      dateKey: todayKey(),
      receivedTime: new Date().toISOString(),
      statusId: defaultStatus?.id,
      assignedAgentId: currentAgentId,
      edited: {},
      ...fields,
      netSalary: fields.netSalary.trim() ? fields.netSalary.trim() : null,
      loanAmount: fields.loanAmount.trim() ? fields.loanAmount.trim() : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-ink2 border border-hairline rounded-2xl shadow-xl w-full max-w-md max-h-[86vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-cream font-semibold text-[15px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: website.color }} />
            Add lead · {website.name}
          </h3>
          <button onClick={onClose} className="text-dim hover-cream"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-wide text-faint">Came from</span>
          <div className="flex bg-ink border border-hairline rounded-full p-0.5">
            {[
              { id: "website", label: "Website" },
              { id: "whatsapp", label: "WhatsApp" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSource(s.id)}
                className={`text-[11px] px-3 py-1 rounded-full transition-colors ${source === s.id ? "bg-brass text-ink font-medium" : "text-dim"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-faint ml-auto">
            → status: <strong className="text-brass">{defaultStatus?.name || "—"}</strong>
          </span>
        </div>

        <div className="space-y-3">
          {source === "whatsapp" ? (
            <>
              <Field label="Phone number"><input className={inputCls} value={fields.phone} onChange={set("phone")} /></Field>
              <Field label="Location"><input className={inputCls} value={fields.location} onChange={set("location")} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Job title"><input className={inputCls} value={fields.jobTitle} onChange={set("jobTitle")} /></Field>
                <Field label="Net salary"><input className={inputCls} value={fields.netSalary} onChange={set("netSalary")} /></Field>
                <Field label="Loan amount"><input className={inputCls} value={fields.loanAmount} onChange={set("loanAmount")} /></Field>
              </div>
              <Field label="Salary through">
                <select className={inputCls} value={fields.salaryThrough || ""} onChange={set("salaryThrough")}>
                  <option value="">—</option>
                  <option value="Bank">Bank</option>
                  <option value="Cash">Cash</option>
                </select>
              </Field>
              <Field label="Remark"><textarea rows={2} className={inputCls} value={fields.remark} onChange={set("remark")} /></Field>
            </>
          ) : (
            <>
              <Field label="Loan type"><input className={inputCls} value={fields.loanType} onChange={set("loanType")} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><input className={inputCls} value={fields.phone} onChange={set("phone")} /></Field>
                <Field label="Email"><input className={inputCls} value={fields.email} onChange={set("email")} /></Field>
              </div>
              <Field label="Name"><input className={inputCls} value={fields.name} onChange={set("name")} /></Field>
              <Field label="Job title"><input className={inputCls} value={fields.jobTitle} onChange={set("jobTitle")} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Location"><input className={inputCls} value={fields.location} onChange={set("location")} /></Field>
                <Field label="Net salary"><input className={inputCls} value={fields.netSalary} onChange={set("netSalary")} /></Field>
                <Field label="Loan amount"><input className={inputCls} value={fields.loanAmount} onChange={set("loanAmount")} /></Field>
              </div>
              <Field label="Salary through">
                <select className={inputCls} value={fields.salaryThrough || ""} onChange={set("salaryThrough")}>
                  <option value="">—</option>
                  <option value="Bank">Bank</option>
                  <option value="Cash">Cash</option>
                </select>
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dim hover-cream">Cancel</button>
          <button onClick={confirmAdd} className="px-4 py-2 text-sm font-medium bg-sage text-ink rounded-lg hover:brightness-110">
            Add lead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Legacy tab                                                         */
/* ------------------------------------------------------------------ */
function LegacyNoteCard({ note, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);

  const save = () => {
    setEditing(false);
    if (draft.trim() && draft !== note.text) onUpdate(note.id, draft);
  };

  return (
    <div className="bg-ink2 border border-hairline rounded-xl p-4 hover-border-hairline transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-mono text-faint">
          {note.createdAt}{note.editedAt ? <span className="text-brass"> · edited {note.editedAt}</span> : ""}
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(note.text); setEditing(true); }}
            className="btn3d btn3d-edit text-amber inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
          >
            <Pencil size={11} strokeWidth={2.6} /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            autoFocus
            rows={Math.min(10, Math.max(3, draft.split("\n").length))}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={inputCls}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setDraft(note.text); setEditing(false); }}
              className="px-3 py-1.5 text-[12px] text-dim hover-cream"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-3 py-1.5 text-[12px] font-medium bg-brass text-ink rounded-lg hover:brightness-110"
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <div className="text-[13px] text-tan whitespace-pre-wrap leading-relaxed">{note.text}</div>
      )}
    </div>
  );
}

function LegacyTab({ notes, onAdd, onUpdate, query, role, currentAgentId }) {
  const [text, setText] = useState("");
  const ownNotes = useMemo(
    () => (role === "admin" ? notes : notes.filter((n) => n.authorId === currentAgentId)),
    [notes, role, currentAgentId]
  );
  const filtered = useMemo(() => {
    if (!query.trim()) return ownNotes;
    const q = query.toLowerCase();
    return ownNotes.filter((n) => n.text.toLowerCase().includes(q));
  }, [ownNotes, query]);

  return (
    <div className="max-w-2xl mx-auto">
      {role !== "admin" && (
        <p className="text-[11px] text-faint mb-3 flex items-center gap-1.5">
          <ShieldCheck size={12} /> Only you can see the notes you paste here.
        </p>
      )}
      <div className="bg-ink2 border border-hairline rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-2 text-dim text-xs uppercase tracking-wide">
          <ClipboardPaste size={13} /> Paste old notes
        </div>
        <textarea
          rows={5}
          className={inputCls}
          placeholder="Paste text from your phone notes here — can be added many times."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button
            disabled={!text.trim()}
            onClick={() => { onAdd(text); setText(""); }}
            className="px-4 py-2 text-sm font-medium bg-brass text-ink rounded-lg hover:brightness-110 disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-faint text-sm py-10">
            {ownNotes.length === 0 ? "No legacy notes yet — paste your first batch above." : "No legacy notes match your search."}
          </p>
        )}
        {filtered.map((n) => (
          <LegacyNoteCard key={n.id} note={n} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings tab                                                       */
/* ------------------------------------------------------------------ */
function AgentPasswordField({ agent, onSet }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const save = () => {
    if (draft.trim()) onSet(draft.trim());
    setDraft("");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="password"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setDraft(""); setEditing(false); }
          }}
          placeholder="New password"
          className="w-24 text-[11px] bg-ink border border-hairline rounded px-1.5 py-0.5 text-cream focus:outline-none focus-border-brass"
        />
        <button onClick={save} className="text-brass" title="Save password"><Check size={13} /></button>
        <button onClick={() => { setDraft(""); setEditing(false); }} className="text-faint" title="Cancel"><X size={13} /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-[9px] px-1.5 py-0.5 rounded-full bg-ink text-faint border border-hairline hover-cream flex items-center gap-1"
    >
      <ShieldCheck size={10} /> {agent.password ? "Change password" : "Set password"}
    </button>
  );
}

function moveItem(list, setList, index, dir) {
  const target = index + dir;
  if (target < 0 || target >= list.length) return;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  setList(copy);
}

function SaveBtn({ dirty, onSave }) {
  return (
    <div className="flex justify-end mt-3">
      <button
        onClick={onSave}
        disabled={!dirty}
        className="px-4 py-2 text-sm font-semibold bg-sage text-ink rounded-lg shadow-sm hover:brightness-110 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:brightness-100"
      >
        <Check size={14} /> {dirty ? "Save changes" : "Saved"}
      </button>
    </div>
  );
}

function ReorderBtns({ list, setList, index }) {
  return (
    <div className="flex flex-col shrink-0 -space-y-1">
      <button
        onClick={() => moveItem(list, setList, index, -1)}
        disabled={index === 0}
        className="text-faint hover-cream disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronUp size={13} />
      </button>
      <button
        onClick={() => moveItem(list, setList, index, 1)}
        disabled={index === list.length - 1}
        className="text-faint hover-cream disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <ChevronDown size={13} />
      </button>
    </div>
  );
}

function ColorSwatch({ color, onChange, size = 8 }) {
  return (
    <label
      className="relative rounded-full cursor-pointer shrink-0 block"
      style={{ width: size * 4, height: size * 4, boxShadow: `0 0 0 2px #FFFFFF, 0 0 0 3.5px ${color}` }}
      title="Choose color"
    >
      <span className="absolute inset-0 rounded-full" style={{ background: color }} />
      <input
        type="color"
        value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#888888"}
        onChange={onChange}
        className="absolute -top-1 -left-1 cursor-pointer border-0 p-0 opacity-0"
        style={{ width: size * 4 + 8, height: size * 4 + 8 }}
      />
    </label>
  );
}

function SectionHeader({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <span className="w-8 h-8 rounded-xl bg-brass-15 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={15} className="text-brass" />
      </span>
      <div>
        <h3 className="text-cream font-semibold text-[14px] leading-tight">{title}</h3>
        {desc && <p className="text-[11px] text-faint mt-0.5 leading-snug">{desc}</p>}
      </div>
    </div>
  );
}

function AddRow({ children, onAdd, disabled }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-3 border-t border-dashed border-hairline">
      {children}
      <button
        onClick={onAdd}
        disabled={disabled}
        className="shrink-0 w-8 h-8 flex items-center justify-center bg-brass text-ink rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
      >
        <Plus size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function SettingsTab({ websites, setWebsites, statuses, setStatuses, agents, setAgents, role, setRole, currentAgentId, setCurrentAgentId, notify, onLogout }) {
  const isAdmin = role === "admin";
  const [newWebsite, setNewWebsite] = useState({ name: "" });
  const [newStatus, setNewStatus] = useState({ name: "" });
  const [newAgent, setNewAgent] = useState({ name: "", username: "", password: "" });
  const [expandedStatusId, setExpandedStatusId] = useState(null);
  const [newSubOption, setNewSubOption] = useState("");

  // Draft copies — edits only touch these. Nothing is applied for real
  // (or persisted) until the matching Save button is pressed.
  const [dWebsites, setDWebsites] = useState(websites);
  const [dStatuses, setDStatuses] = useState(statuses);
  const [dAgents, setDAgents] = useState(agents);
  useEffect(() => { setDWebsites(websites); }, [websites]);
  useEffect(() => { setDStatuses(statuses); }, [statuses]);
  useEffect(() => { setDAgents(agents); }, [agents]);

  const websitesDirty = JSON.stringify(dWebsites) !== JSON.stringify(websites);
  const statusesDirty = JSON.stringify(dStatuses) !== JSON.stringify(statuses);
  const agentsDirty = JSON.stringify(dAgents) !== JSON.stringify(agents);

  // Diffs a draft array against the live one and issues the matching
  // POST (new rows) / PATCH (changed rows) / DELETE (removed rows) calls,
  // then updates the real state once everything's confirmed saved.
  const syncList = async (endpoint, draft, original, setLive, label) => {
    try {
      const originalById = Object.fromEntries(original.map((x) => [x.id, x]));
      const draftIds = new Set(draft.map((x) => x.id));
      const removed = original.filter((x) => !draftIds.has(x.id));
      await Promise.all([
        ...draft.map((item) => {
          const before = originalById[item.id];
          if (!before) return api(endpoint, { method: "POST", body: toSnake(item) });
          if (JSON.stringify(before) !== JSON.stringify(item)) {
            return api(`${endpoint}/${item.id}`, { method: "PATCH", body: toSnake(item) });
          }
          return null;
        }),
        ...removed.map((item) => api(`${endpoint}/${item.id}`, { method: "DELETE" })),
      ]);
      setLive(draft);
      notify(`${label} saved`);
    } catch (e) {
      notify(`Couldn't save ${label.toLowerCase()}: ${e.message}`);
    }
  };

  const inputRowCls = "flex-1 min-w-0 bg-ink border border-hairline rounded-lg px-2.5 py-1.5 text-[13px] text-cream placeholder-faint focus:outline-none focus-border-brass";

  const RoleToggle = (
    <div className="bg-ink2 border border-hairline rounded-xl px-4 py-3 mb-6 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-cream font-medium">Preview app as</span>
        <div className="flex bg-ink border border-hairline rounded-full p-0.5">
          {["admin", "agent"].map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                if (r === "admin") setCurrentAgentId("admin");
                else if (currentAgentId === "admin") setCurrentAgentId(agents.find((a) => a.role !== "admin")?.id || "admin");
              }}
              className={`text-[11px] px-3.5 py-1.5 rounded-full capitalize font-medium transition-colors ${role === r ? "bg-brass text-ink" : "text-dim"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {role === "agent" && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-faint">As which agent?</span>
          <select
            value={currentAgentId}
            onChange={(e) => setCurrentAgentId(e.target.value)}
            className="text-[12px] font-medium rounded-full px-2.5 py-1 border border-hairline bg-ink text-cream focus:outline-none cursor-pointer"
          >
            {agents.filter((a) => a.role !== "admin").map((a) => (
              <option key={a.id} value={a.id} style={{ color: "#000" }}>{a.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const currentUser = agents.find((a) => a.id === currentAgentId);
  const LogoutButton = (
    <button
      onClick={onLogout}
      className="btn3d btn3d-danger text-rust w-full mt-8 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
    >
      <X size={15} strokeWidth={2.6} /> Log out as {shortAgentName(currentUser?.name) || "user"}
    </button>
  );

  if (!isAdmin) {
    const myWebsites = dWebsites.filter((w) => w.ownerId === currentAgentId);
    return (
      <div className="max-w-md mx-auto py-6">
        {RoleToggle}
        <section>
          <SectionHeader
            icon={Building2}
            title="My websites"
            desc="Add your own lead sources here. They're private to you unless you turn on sharing — then the super admin can see leads from that website too."
          />
          <div className="bg-ink2 border border-hairline rounded-2xl shadow-sm overflow-hidden">
            {myWebsites.length === 0 && (
              <p className="text-[12px] text-faint px-3.5 py-4 text-center">You haven't added any websites yet.</p>
            )}
            {myWebsites.map((w, wi) => (
              <div key={w.id} className={`px-3.5 py-3 ${wi > 0 ? "border-t border-hairline" : ""}`}>
                <div className="flex items-center gap-3">
                  <ColorSwatch color={w.color} onChange={(e) => setDWebsites(dWebsites.map((x) => x.id === w.id ? { ...x, color: e.target.value } : x))} />
                  <input
                    className="bg-transparent text-[13px] font-medium text-cream flex-1 min-w-0 focus:outline-none"
                    value={w.name}
                    onChange={(e) => setDWebsites(dWebsites.map((x) => x.id === w.id ? { ...x, name: e.target.value } : x))}
                  />
                  <button
                    onClick={() => setDWebsites(dWebsites.map((x) => x.id === w.id ? { ...x, active: !x.active } : x))}
                    aria-label={w.active ? "Turn off" : "Turn on"}
                    className="relative w-9 h-5.5 rounded-full shrink-0 transition-colors duration-200"
                    style={{ background: w.active ? "#34C759" : "#D1D5DB", width: 36, height: 22 }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform duration-200"
                      style={{ width: 18, height: 18, transform: w.active ? "translateX(14px)" : "translateX(0)" }}
                    />
                  </button>
                  <button onClick={() => setDWebsites(dWebsites.filter((x) => x.id !== w.id))} className="text-faint hover-rust shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
                <button
                  onClick={() => setDWebsites(dWebsites.map((x) => x.id === w.id ? { ...x, shared: !x.shared } : x))}
                  className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${w.shared ? "text-sage" : "text-faint"}`}
                >
                  <span className="relative shrink-0" style={{ width: 26, height: 15 }}>
                    <span className="absolute inset-0 rounded-full transition-colors" style={{ background: w.shared ? "#34C759" : "#D1D5DB" }} />
                    <span className="absolute top-0.5 rounded-full bg-white shadow transition-transform duration-200" style={{ width: 11, height: 11, left: w.shared ? 13 : 2 }} />
                  </span>
                  {w.shared ? "Sharing leads with super admin" : "Share leads with super admin"}
                </button>
              </div>
            ))}
            <AddRow
              disabled={!newWebsite.name}
              onAdd={() => {
                if (!newWebsite.name) return;
                setDWebsites([...dWebsites, { id: uid(), name: newWebsite.name, color: STATUS_SWATCHES[dWebsites.length % STATUS_SWATCHES.length], active: true, ownerId: currentAgentId, shared: false }]);
                setNewWebsite({ name: "" });
              }}
            >
              <input placeholder="New website name" className={inputRowCls} value={newWebsite.name} onChange={(e) => setNewWebsite({ ...newWebsite, name: e.target.value })} />
            </AddRow>
          </div>
          <SaveBtn dirty={websitesDirty} onSave={() => syncList("/websites", dWebsites, websites, setWebsites, "Websites")} />
        </section>
        <div className="text-center py-6">
          <ShieldCheck size={22} className="mx-auto text-faint mb-2" />
          <p className="text-faint text-xs">Status droplist and other agents are managed by the super admin.</p>
        </div>
        {LogoutButton}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      {RoleToggle}

      {/* Websites */}
      <section>
        <SectionHeader
          icon={Building2}
          title="Websites"
          desc="Active websites get their own add-lead button today. Turning one off just removes that button — past records stay visible either way."
        />
        <div className="bg-ink2 border border-hairline rounded-2xl shadow-sm overflow-hidden">
          {dWebsites.map((w, wi) => (
            <div key={w.id} className={`px-3.5 py-3 ${wi > 0 ? "border-t border-hairline" : ""}`}>
              <div className="flex items-center gap-3">
                <ReorderBtns list={dWebsites} setList={setDWebsites} index={wi} />
                <ColorSwatch color={w.color} onChange={(e) => setDWebsites(dWebsites.map((x) => x.id === w.id ? { ...x, color: e.target.value } : x))} />
                <div className="flex-1 min-w-0">
                  <input
                    className="bg-transparent text-[13px] font-medium text-cream w-full min-w-[60px] focus:outline-none"
                    value={w.name}
                    onChange={(e) => setDWebsites(dWebsites.map((x) => x.id === w.id ? { ...x, name: e.target.value } : x))}
                  />
                  {w.ownerId && w.ownerId !== "admin" && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ink text-faint border border-hairline">
                        by {dAgents.find((a) => a.id === w.ownerId)?.name || "agent"}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${w.shared ? "text-sage border-sage" : "text-faint border-hairline"}`}
                        style={w.shared ? { background: "rgba(5,150,105,0.1)" } : undefined}>
                        {w.shared ? "Shared with you" : "Private"}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setDWebsites(dWebsites.map((x) => x.id === w.id ? { ...x, active: !x.active } : x))}
                  aria-label={w.active ? "Turn off" : "Turn on"}
                  className="relative w-10 h-6 rounded-full shrink-0 transition-colors duration-200"
                  style={{ background: w.active ? "#34C759" : "#D1D5DB" }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: w.active ? "translateX(16px)" : "translateX(0)" }}
                  />
                </button>
                <button onClick={() => setDWebsites(dWebsites.filter((x) => x.id !== w.id))} className="text-faint hover-rust shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <AddRow
            disabled={!newWebsite.name}
            onAdd={() => {
              if (!newWebsite.name) return;
              setDWebsites([...dWebsites, { id: uid(), name: newWebsite.name, color: STATUS_SWATCHES[dWebsites.length % STATUS_SWATCHES.length], active: true, ownerId: "admin", shared: true }]);
              setNewWebsite({ name: "" });
            }}
          >
            <input placeholder="New website name" className={inputRowCls} value={newWebsite.name} onChange={(e) => setNewWebsite({ ...newWebsite, name: e.target.value })} />
          </AddRow>
        </div>
        <SaveBtn dirty={websitesDirty} onSave={() => syncList("/websites", dWebsites, websites, setWebsites, "Websites")} />
      </section>

      {/* Statuses / droplist */}
      <section>
        <SectionHeader icon={Tag} title="Status droplist" desc="Shown on every lead card and the dashboard tiles, in this order." />
        <div className="bg-ink2 border border-hairline rounded-2xl shadow-sm overflow-hidden">
          {dStatuses.map((s, si) => (
            <div key={s.id} className={si > 0 ? "border-t border-hairline" : ""}>
              <div className="flex items-center gap-3 px-3.5 py-3">
                <ReorderBtns list={dStatuses} setList={setDStatuses} index={si} />
                <ColorSwatch color={s.color} onChange={(e) => setDStatuses(dStatuses.map((x) => x.id === s.id ? { ...x, color: e.target.value } : x))} />
                <input
                  className="bg-transparent text-[13px] font-medium text-cream flex-1 min-w-0 focus:outline-none"
                  value={s.name}
                  onChange={(e) => setDStatuses(dStatuses.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))}
                />
                <button
                  onClick={() => { setExpandedStatusId(expandedStatusId === s.id ? null : s.id); setNewSubOption(""); }}
                  title="Reason sub-options"
                  className={`flex items-center gap-0.5 text-[10px] px-1.5 py-1 rounded-md shrink-0 ${(s.subOptions || []).length ? "text-brass" : "text-faint"}`}
                >
                  <Tag size={12} />
                  {(s.subOptions || []).length > 0 && <span>{s.subOptions.length}</span>}
                  {expandedStatusId === s.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button
                  onClick={() => setDStatuses(dStatuses.map((x) => x.id === s.id ? { ...x, animated: !x.animated } : x))}
                  title={s.animated ? "Animation on" : "Animation off"}
                  className="relative w-9 h-5.5 rounded-full shrink-0 transition-colors duration-200"
                  style={{ background: s.animated ? "#34C759" : "#D1D5DB", width: 36, height: 22 }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ width: 18, height: 18, transform: s.animated ? "translateX(14px)" : "translateX(0)" }}
                  />
                </button>
                <Sparkles size={13} className={s.animated ? "text-brass" : "text-faint"} />
                <button onClick={() => setDStatuses(dStatuses.filter((x) => x.id !== s.id))} className="text-faint hover-rust shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              {expandedStatusId === s.id && (
                <div className="px-3.5 pb-3 pl-11">
                  <p className="text-[10px] text-faint mb-2">Optional reasons agents can pick when they set a lead to "{s.name}". Leave empty for no sub-options.</p>
                  <div className="flex flex-col gap-1.5 mb-2">
                    {(s.subOptions || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2 bg-ink border border-hairline rounded-lg px-2.5 py-1.5">
                        <ReorderBtns
                          list={s.subOptions}
                          setList={(reordered) => setDStatuses(dStatuses.map((x) => x.id === s.id ? { ...x, subOptions: reordered } : x))}
                          index={oi}
                        />
                        <span className="text-[12px] text-cream flex-1 min-w-0">{opt}</span>
                        <button
                          onClick={() => setDStatuses(dStatuses.map((x) => x.id === s.id ? { ...x, subOptions: x.subOptions.filter((_, j) => j !== oi) } : x))}
                          className="text-faint hover-rust shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {!(s.subOptions || []).length && <span className="text-[11px] text-faint italic">No sub-options set</span>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={expandedStatusId === s.id ? newSubOption : ""}
                      onChange={(e) => setNewSubOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubOption.trim()) {
                          setDStatuses(dStatuses.map((x) => x.id === s.id ? { ...x, subOptions: [...(x.subOptions || []), newSubOption.trim()] } : x));
                          setNewSubOption("");
                        }
                      }}
                      placeholder="e.g. Bad Credit"
                      className="flex-1 bg-ink border border-hairline rounded-lg px-3 py-1.5 text-[12px] text-cream focus:outline-none focus-border-brass"
                    />
                    <button
                      disabled={!newSubOption.trim()}
                      onClick={() => {
                        setDStatuses(dStatuses.map((x) => x.id === s.id ? { ...x, subOptions: [...(x.subOptions || []), newSubOption.trim()] } : x));
                        setNewSubOption("");
                      }}
                      className="px-3 py-1.5 text-[12px] font-medium bg-brass-15 text-brass rounded-lg disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <AddRow
            disabled={!newStatus.name}
            onAdd={() => {
              if (!newStatus.name) return;
              setDStatuses([...dStatuses, { id: uid(), name: newStatus.name, color: STATUS_SWATCHES[dStatuses.length % STATUS_SWATCHES.length], animated: false, subOptions: [] }]);
              setNewStatus({ name: "" });
            }}
          >
            <input placeholder="New status name" className={inputRowCls} value={newStatus.name} onChange={(e) => setNewStatus({ name: e.target.value })} />
          </AddRow>
        </div>
        <SaveBtn dirty={statusesDirty} onSave={() => syncList("/statuses", dStatuses, statuses, setStatuses, "Status droplist")} />
      </section>

      {/* Agents */}
      <section>
        <SectionHeader
          icon={Users}
          title="Agents"
          desc={"As super admin, you set each agent's username and password here. They can't see or change these themselves. Turn an agent off to hide them from the assign-lead dropdown."}
        />
        <div className="bg-ink2 border border-hairline rounded-2xl shadow-sm overflow-hidden">
          {dAgents.map((a, ai) => (
            <div key={a.id} className={`flex items-center gap-3 px-3.5 py-3 ${ai > 0 ? "border-t border-hairline" : ""}`}>
              {a.role !== "admin" && <ReorderBtns list={dAgents} setList={setDAgents} index={ai} />}
              <span className="w-8 h-8 rounded-full bg-brass flex items-center justify-center text-[11px] font-bold text-ink shrink-0">
                {initials(a.name)}
              </span>
              <div className="flex-1 min-w-0">
                <input
                  className="text-[13px] font-medium text-cream bg-transparent w-full focus:outline-none focus-border-brass"
                  value={a.name}
                  onChange={(e) => setDAgents(dAgents.map((x) => x.id === a.id ? { ...x, name: e.target.value } : x))}
                />
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <input
                    className="text-[11px] font-mono text-faint bg-transparent focus:outline-none focus-border-brass border-b border-transparent hover:border-hairline w-[90px]"
                    value={a.username}
                    onChange={(e) => setDAgents(dAgents.map((x) => x.id === a.id ? { ...x, username: e.target.value } : x))}
                  />
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ink text-faint border border-hairline uppercase tracking-wide">{a.role}</span>
                  <AgentPasswordField
                    agent={a}
                    onSet={(pw) => setDAgents(dAgents.map((x) => x.id === a.id ? { ...x, password: pw } : x))}
                  />
                </div>
              </div>
              {a.role !== "admin" && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setDAgents(dAgents.map((x) => x.id === a.id ? { ...x, active: x.active === false ? true : false } : x))}
                    aria-label={a.active === false ? "Turn on" : "Turn off"}
                    className="relative w-10 h-6 rounded-full shrink-0 transition-colors duration-200"
                    style={{ background: a.active === false ? "#D1D5DB" : "#34C759" }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                      style={{ transform: a.active === false ? "translateX(0)" : "translateX(16px)" }}
                    />
                  </button>
                  <button onClick={() => setDAgents(dAgents.filter((x) => x.id !== a.id))} className="text-faint hover-rust">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <AddRow
            disabled={!newAgent.name || !newAgent.username || !newAgent.password}
            onAdd={() => {
              if (!newAgent.name || !newAgent.username || !newAgent.password) return;
              setDAgents([...dAgents, { id: uid(), ...newAgent, role: "agent", active: true }]);
              setNewAgent({ name: "", username: "", password: "" });
            }}
          >
            <input placeholder="Agent name" className={inputRowCls} value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} />
            <input placeholder="Username" className={inputRowCls} value={newAgent.username} onChange={(e) => setNewAgent({ ...newAgent, username: e.target.value })} />
            <input placeholder="Password" type="password" className={inputRowCls} value={newAgent.password || ""} onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })} />
          </AddRow>
        </div>
        <SaveBtn dirty={agentsDirty} onSave={() => syncList("/agents", dAgents, agents, setAgents, "Agents")} />
      </section>
      {LogoutButton}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main App                                                           */
/* ------------------------------------------------------------------ */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [websites, setWebsites] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [legacyNotes, setLegacyNotes] = useState([]);
  const savedSession = (() => {
    try {
      return JSON.parse(localStorage.getItem("leadledger_session") || "null");
    } catch {
      return null;
    }
  })();
  const [role, setRole] = useState(savedSession?.role || "admin");
  const [currentAgentId, setCurrentAgentId] = useState(savedSession?.id || "admin");
  // Login can't actually work inside Claude's artifact preview (no real
  // network access to the backend), so it's auto-bypassed there. On the
  // real deployed site (your Vercel domain), login stays fully required.
  const isProductionSite = typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app");
  const DISABLE_LOGIN = !isProductionSite;
  const [loggedIn, setLoggedIn] = useState(DISABLE_LOGIN || !!savedSession);
  const [tab, setTab] = useState("leads");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [agentFilter, setAgentFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [addingWebsite, setAddingWebsite] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg) => setToast(msg);

  /* data loading — happens once logged in, from the real backend */
  const [dataStatus, setDataStatus] = useState("idle"); // idle | loading | ready | error
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    setLoaded(true); // nothing to wait on before showing the login screen
  }, []);

  const loadAllData = async () => {
    setDataStatus("loading");
    setDataError("");
    try {
      const [ws, sts, ags, lds, notes] = await Promise.all([
        api("/websites"),
        api("/statuses"),
        api("/agents"),
        api("/leads"),
        api("/legacy-notes"),
      ]);
      setWebsites(ws.map(toCamel));
      setStatuses(sts.map(toCamel));
      setAgents(ags.map(toCamel));
      setLeads(lds.map(toCamel));
      setLegacyNotes(notes.map(toCamel));
      setDataStatus("ready");
    } catch (e) {
      setDataStatus("error");
      setDataError(e.message || "Couldn't reach the server");
    }
  };

  useEffect(() => {
    if (!loggedIn) return;
    loadAllData();
  }, [loggedIn]);

  // Instantly reflects new/updated/deleted leads the moment they happen in
  // the database — whether from an email coming in, another agent's edit,
  // or your own action on a different device. Uses Supabase's built-in
  // Realtime (a live websocket connection), not polling.
  useEffect(() => {
    if (!loggedIn || dataStatus !== "ready") return;

    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        setLeads((prev) => (prev.some((l) => l.id === payload.new.id) ? prev : [toCamel(payload.new), ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, (payload) => {
        setLeads((prev) => prev.map((l) => (l.id === payload.new.id ? toCamel(payload.new) : l)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "leads" }, (payload) => {
        setLeads((prev) => prev.filter((l) => l.id !== payload.old.id));
      })
      .subscribe((status, err) => {
        // Temporary debug logging — check the browser console for this.
        // SUBSCRIBED = working correctly.
        // CHANNEL_ERROR = usually means Realtime isn't enabled on the table,
        //   or the anon key / URL is wrong.
        // TIMED_OUT / CLOSED = a network or connection issue.
        console.log("[Realtime] status:", status, err || "");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loggedIn, dataStatus]);

  const isWebsiteVisible = (w) => {
    if (!w.ownerId || w.ownerId === "admin") return true;
    if (role === "admin") return !!w.shared;
    return w.ownerId === currentAgentId;
  };
  const visibleWebsiteIds = useMemo(
    () => new Set(websites.filter(isWebsiteVisible).map((w) => w.id)),
    [websites, role, currentAgentId]
  );
  const activeWebsites = websites.filter((w) => w.active && isWebsiteVisible(w));

  const filteredLeads = useMemo(() => {
    let result = leads.filter((l) => visibleWebsiteIds.has(l.websiteId));
    if (statusFilter) result = result.filter((l) => l.statusId === statusFilter);
    if (agentFilter) result = result.filter((l) => l.assignedAgentId === agentFilter);
    if (dateFilter) result = result.filter((l) => l.dateKey === dateFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((l) =>
        [l.name, l.phone, l.email, l.loanType, l.remark, l.location, l.jobTitle].join(" ").toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, query, statusFilter, agentFilter, dateFilter, visibleWebsiteIds]);

  const visibleLeads = useMemo(() => leads.filter((l) => visibleWebsiteIds.has(l.websiteId)), [leads, visibleWebsiteIds]);

  const availableDates = useMemo(
    () => [...new Set(visibleLeads.map((l) => l.dateKey))].sort((a, b) => dateSortKey(b) - dateSortKey(a)),
    [visibleLeads]
  );

  const statusCounts = useMemo(
    () => statuses.map((s) => ({ ...s, count: visibleLeads.filter((l) => l.statusId === s.id).length })),
    [visibleLeads, statuses]
  );

  const filteredLegacy = useMemo(() => {
    const visible = role === "admin" ? legacyNotes : legacyNotes.filter((n) => n.authorId === currentAgentId);
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return visible.filter((n) => n.text.toLowerCase().includes(q));
  }, [legacyNotes, query, role, currentAgentId]);

  const groupedByDate = useMemo(() => {
    const map = {};
    filteredLeads.forEach((l) => {
      map[l.dateKey] = map[l.dateKey] || [];
      map[l.dateKey].push(l);
    });
    // Keep today's group visible (with website shortforms + add buttons ready)
    // even before the first lead of the day comes in.
    if (!query.trim() && !statusFilter && !agentFilter && !dateFilter && !map[todayKey()]) {
      map[todayKey()] = [];
    }
    return Object.entries(map).sort((a, b) => dateSortKey(b[0]) - dateSortKey(a[0]));
  }, [filteredLeads, query, statusFilter, agentFilter, dateFilter]);

  const saveEditedLead = async (updated) => {
    try {
      const { id, ...rest } = updated;
      const row = await api(`/leads/${id}`, { method: "PATCH", body: toSnake(rest) });
      setLeads(leads.map((l) => (l.id === id ? toCamel(row) : l)));
      setEditingLead(null);
      notify("Lead updated");
    } catch (e) {
      notify(`Couldn't save: ${e.message}`);
    }
  };

  const addLead = async (lead) => {
    try {
      const { id, ...rest } = lead; // let Supabase generate the real id
      const row = await api("/leads", { method: "POST", body: toSnake(rest) });
      setLeads([toCamel(row), ...leads]);
      setAddingWebsite(null);
      notify("Lead added");
    } catch (e) {
      notify(`Couldn't add lead: ${e.message}`);
    }
  };

  const deleteLead = async (id) => {
    try {
      await api(`/leads/${id}`, { method: "DELETE" });
      setLeads(leads.filter((l) => l.id !== id));
      setDeletingLead(null);
      notify("Lead deleted");
    } catch (e) {
      notify(`Couldn't delete: ${e.message}`);
    }
  };

  const patchLead = async (id, fields) => {
    const prev = leads;
    setLeads(leads.map((l) => (l.id === id ? { ...l, ...fields } : l))); // optimistic
    try {
      await api(`/leads/${id}`, { method: "PATCH", body: toSnake(fields) });
    } catch (e) {
      setLeads(prev); // roll back on failure
      notify(`Couldn't save change: ${e.message}`);
    }
  };

  const addLegacyNote = async (text) => {
    try {
      const row = await api("/legacy-notes", { method: "POST", body: { text, author_id: currentAgentId } });
      setLegacyNotes([toCamel(row), ...legacyNotes]);
      notify("Note saved");
    } catch (e) {
      notify(`Couldn't save note: ${e.message}`);
    }
  };
  const updateLegacyNote = async (id, text) => {
    try {
      const row = await api(`/legacy-notes/${id}`, { method: "PATCH", body: { text, edited_at: new Date().toISOString() } });
      setLegacyNotes(legacyNotes.map((n) => (n.id === id ? toCamel(row) : n)));
      notify("Note updated");
    } catch (e) {
      notify(`Couldn't update note: ${e.message}`);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <Loader2 className="animate-spin text-brass" size={22} />
      </div>
    );
  }

  if (!loggedIn && !DISABLE_LOGIN) {
    return (
      <LoginScreen
        onLogin={(agent) => {
          setRole(agent.role);
          setCurrentAgentId(agent.id);
          setLoggedIn(true);
          localStorage.setItem("leadledger_session", JSON.stringify(agent));
        }}
      />
    );
  }

  if (dataStatus === "loading" || dataStatus === "idle") {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-3" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <Loader2 className="animate-spin text-brass" size={28} />
        <p className="text-dim text-sm">Loading your data…</p>
      </div>
    );
  }

  if (dataStatus === "error") {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="w-full max-w-sm bg-ink2 border border-hairline rounded-2xl shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rust/15 flex items-center justify-center mx-auto mb-3">
            <X size={22} className="text-rust" />
          </div>
          <h2 className="text-cream font-semibold text-[16px] mb-1">Couldn't load your data</h2>
          <p className="text-dim text-[13px] mb-1">This did <strong>not</strong> delete or change anything — your real data is still safe in the database. The app just couldn't reach the server this time.</p>
          <p className="text-faint text-[11px] mb-4">{dataError}</p>
          <button onClick={loadAllData} className="w-full px-4 py-2.5 text-sm font-semibold bg-brass text-ink rounded-lg hover:brightness-110 transition-all">
            Try again
          </button>
          <p className="text-faint text-[10px] mt-3">If your backend has been idle a while, it can take 30–60 seconds to wake up — wait a moment and tap "Try again."</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        select option { background: #FFFFFF; color: #1F2530; }
        select {
          -webkit-tap-highlight-color: transparent;
          -webkit-appearance: none;
          appearance: none;
        }
        select:focus, select:active { outline: none; }

        /* Semantic color classes — written as plain CSS instead of Tailwind
           arbitrary-value utilities, since this renderer doesn't compile
           bg-[#hex] / text-[#hex] on the fly. Bold, saturated accent theme. */
        .bg-ink { background-color: #F3F1FC; }
        .bg-ink2 { background-color: #FFFFFF; }
        .bg-ink3 { background-color: #F7F6FE; }
        .bg-ink-95 { background-color: rgba(243,241,252,0.95); }
        .bg-hairline2 { background-color: #D8D4F3; }
        .bg-brass { background-color: #4F46E5; }
        .bg-brass-15 { background-color: rgba(79,70,229,0.14); }
        .bg-sage { background-color: #059669; }
        .bg-rust { background-color: #DC2626; }

        /* Real tonal hierarchy instead of everything mapping to pure black —
           this is what makes a busy list of cards feel calm and scannable
           rather than shouty. */
        .text-cream { color: #221E36; }
        .text-dim { color: #5F5B80; }
        .text-faint { color: #9692B8; }
        .text-brass { color: #4F46E5; }
        .text-ink { color: #FFFFFF; }
        .text-tan { color: #6B6690; }
        .text-sage { color: #059669; }
        .text-rust { color: #DC2626; }
        .text-amber { color: #D97706; }
        .text-slate { color: #5F5B80; }
        .text-haze { color: #7A76A0; }
        .text-sky { color: #2563EB; }
        .text-leaf { color: #16A34A; }

        .border-hairline { border-color: #E4E1F6; }
        .border-hairline2 { border-color: #D8D4F3; }
        .border-brass { border-color: #4F46E5; }
        .border-brass-30 { border-color: rgba(79,70,229,0.3); }
        .border-sage { border-color: #059669; }
        .border-faint { border-color: #E9E7F8; }

        .placeholder-faint::placeholder { color: #ACA8CC; }
        .decoration-brass { text-decoration-color: #4F46E5; }

        .hover-cream:hover { color: #221E36; }
        .hover-rust:hover { color: #DC2626; }
        .hover-border-hairline:hover { border-color: #C4BFEE; }
        .hover-bg-amber-15:hover { background-color: rgba(217,119,6,0.15); }
        .hover-bg-rust-15:hover { background-color: rgba(220,38,38,0.15); }
        .hover-bg-sky-15:hover { background-color: rgba(37,99,235,0.15); }
        .hover-bg-leaf-15:hover { background-color: rgba(22,163,74,0.15); }
        .focus-border-brass:focus { border-color: #4F46E5; outline: none; }
        .focus-ring-brass:focus { box-shadow: 0 0 0 3px rgba(79,70,229,0.35); }

        /* Bold "candy" action buttons — saturated fill with a chunky
           hard-edge bottom shadow that flattens when pressed. */
        .btn3d {
          border: none;
          transition: transform .09s ease, box-shadow .09s ease;
        }
        .btn3d:hover:not(:disabled) { filter: brightness(1.03); }
        .btn3d:active:not(:disabled) { transform: translateY(3px); }

        .btn3d-default { background: #E5E7EB; box-shadow: 0 3px 0 #9CA3AF, inset 0 1px 1px rgba(255,255,255,0.8); }
        .btn3d-default:active:not(:disabled) { box-shadow: 0 0 0 #9CA3AF, inset 0 1px 1px rgba(255,255,255,0.8); }

        .btn3d-call { background: #93C5FD; box-shadow: 0 3px 0 #3B82F6, inset 0 1px 1px rgba(255,255,255,0.85); }
        .btn3d-call:active:not(:disabled) { box-shadow: 0 0 0 #3B82F6, inset 0 1px 1px rgba(255,255,255,0.85); }

        .btn3d-chat { background: #86EFAC; box-shadow: 0 3px 0 #22C55E, inset 0 1px 1px rgba(255,255,255,0.85); }
        .btn3d-chat:active:not(:disabled) { box-shadow: 0 0 0 #22C55E, inset 0 1px 1px rgba(255,255,255,0.85); }

        .btn3d-edit { background: #FCD34D; box-shadow: 0 3px 0 #D97706, inset 0 1px 1px rgba(255,255,255,0.85); }
        .btn3d-edit:active:not(:disabled) { box-shadow: 0 0 0 #D97706, inset 0 1px 1px rgba(255,255,255,0.85); }

        .btn3d-danger { background: #FCA5A5; box-shadow: 0 3px 0 #DC2626, inset 0 1px 1px rgba(255,255,255,0.85); }
        .btn3d-danger:active:not(:disabled) { box-shadow: 0 0 0 #DC2626, inset 0 1px 1px rgba(255,255,255,0.85); }

        /* Loading shimmer sweep + pulsing glow for the "New" status pill */
        .status-shimmer-bar {
          position: absolute;
          top: 0; left: -80%;
          width: 80%; height: 100%;
          background: linear-gradient(90deg, transparent, currentColor, transparent);
          opacity: 0.85;
          animation: shimmer-sweep 1.1s linear infinite;
        }
        @keyframes shimmer-sweep {
          0% { left: -80%; }
          100% { left: 100%; }
        }
        .status-glow-pulse {
          animation: glow-pulse 1.1s ease-in-out infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; }
          50% { box-shadow: 0 0 8px 2px currentColor; }
        }
      `}</style>

      {/* Header — single compact row */}
      <header className="sticky top-0 z-30 bg-ink-95 backdrop-blur border-b border-hairline2">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => setTab("leads")} className="flex items-center gap-2 shrink-0 active:opacity-70 transition-opacity">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(155deg, #A855F7, #7C3AED)", boxShadow: "0 2px 5px rgba(124,58,237,0.4)" }}
            >
              <NotebookText size={20} className="text-white" strokeWidth={2.3} />
            </div>
            <h1 className="text-cream font-semibold text-[15px] hidden md:block" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              Lead
            </h1>
          </button>

          <div className="flex-1" />

          <div className="relative shrink-0">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              title="Filter leads"
              className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${(statusFilter || agentFilter || dateFilter) ? "border-brass bg-brass-15 text-brass" : "border-hairline bg-ink2 text-dim"}`}
            >
              <Filter size={14} strokeWidth={2.3} />
              {(statusFilter || agentFilter || dateFilter) && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brass" />}
            </button>
            {filterOpen && (
              <div className="absolute left-0 mt-1.5 z-30 bg-ink2 border border-hairline rounded-xl shadow-lg py-1 min-w-[170px] max-h-[70vh] overflow-y-auto">
                <div className="px-3 pt-1.5 pb-1 text-[9px] uppercase tracking-wide text-faint font-semibold">Status</div>
                <button
                  onClick={() => { setStatusFilter(null); setFilterOpen(false); }}
                  className={`w-full flex items-center justify-between text-left px-3 py-1.5 text-[12px] hover:bg-brass-15 ${!statusFilter ? "text-brass font-semibold" : "text-cream"}`}
                >
                  All statuses
                </button>
                {statuses.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setStatusFilter(s.id); setFilterOpen(false); }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-[12px] hover:bg-brass-15 ${statusFilter === s.id ? "font-semibold" : ""}`}
                    style={{ color: statusFilter === s.id ? s.color : undefined }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.name}
                  </button>
                ))}
                <div className="h-px bg-hairline my-1" />
                <div className="px-3 pt-0.5 pb-1 text-[9px] uppercase tracking-wide text-faint font-semibold">Assigned agent</div>
                <button
                  onClick={() => { setAgentFilter(null); setFilterOpen(false); }}
                  className={`w-full flex items-center justify-between text-left px-3 py-1.5 text-[12px] hover:bg-brass-15 ${!agentFilter ? "text-brass font-semibold" : "text-cream"}`}
                >
                  All agents
                </button>
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setAgentFilter(a.id); setFilterOpen(false); }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-[12px] hover:bg-brass-15 ${agentFilter === a.id ? "text-brass font-semibold" : "text-cream"}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-brass-15 text-[8px] font-bold text-brass flex items-center justify-center shrink-0">
                      {initials(a.name)}
                    </span>
                    {shortAgentName(a.name)}
                  </button>
                ))}
                <div className="h-px bg-hairline my-1" />
                <div className="px-3 pt-0.5 pb-1 text-[9px] uppercase tracking-wide text-faint font-semibold">Date</div>
                <div className="px-3 pb-1.5">
                  <input
                    type="date"
                    value={dateKeyToInputValue(dateFilter) || ""}
                    onChange={(e) => { setDateFilter(inputValueToDateKey(e.target.value)); setFilterOpen(false); }}
                    className="w-full text-[12px] bg-ink border border-hairline rounded-lg px-2 py-1.5 text-cream focus:outline-none focus-border-brass"
                  />
                </div>
                <button
                  onClick={() => { setDateFilter(null); setFilterOpen(false); }}
                  className={`w-full flex items-center justify-between text-left px-3 py-1.5 text-[12px] hover:bg-brass-15 ${!dateFilter ? "text-brass font-semibold" : "text-cream"}`}
                >
                  All dates
                </button>
                {availableDates.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDateFilter(d); setFilterOpen(false); }}
                    className={`w-full flex items-center justify-between text-left px-3 py-1.5 text-[12px] hover:bg-brass-15 ${dateFilter === d ? "text-brass font-semibold" : "text-cream"}`}
                  >
                    <span className="font-mono">{d}</span>
                    {d === todayKey() && <span className="text-[9px] text-faint">Today</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-28 sm:w-40 shrink-0">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-ink2 border border-hairline rounded-full pl-7 pr-2 py-1.5 text-[12px] text-cream placeholder-faint focus:outline-none focus-border-brass"
            />
          </div>

          <nav className="flex bg-ink2 border border-hairline rounded-full p-0.5 shrink-0">
            {[
              { id: "leads", label: "Leads", icon: Home },
              { id: "legacy", label: "Legacy", icon: ClipboardPaste },
              { id: "settings", label: "Settings", icon: SettingsIcon },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                title={t.label}
                className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-full transition-colors ${tab === t.id ? "bg-brass text-ink font-medium" : "text-dim hover-cream"}`}
              >
                <t.icon size={13} /> <span className="hidden lg:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-6" style={{ paddingTop: "6px" }}>
        {/* Combined search results, shown regardless of tab when searching */}
        {query.trim() && tab === "leads" && filteredLegacy.length > 0 && (
          <div className="mb-6 bg-ink2 border border-brass-30 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-brass mb-2 flex items-center gap-1.5">
              <ClipboardPaste size={12} /> Also found in legacy notes ({filteredLegacy.length})
            </div>
            <div className="space-y-2">
              {filteredLegacy.slice(0, 3).map((n) => (
                <div key={n.id} className="text-[12px] text-dim line-clamp-2">
                  <span className="font-mono text-[10px] text-faint mr-2">{n.createdAt}</span>
                  {n.text.slice(0, 140)}{n.text.length > 140 ? "…" : ""}
                </div>
              ))}
              {filteredLegacy.length > 3 && (
                <button onClick={() => setTab("legacy")} className="text-[11px] text-brass hover:underline">
                  View all {filteredLegacy.length} in Legacy tab →
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "leads" && (
          <>
            <div className="bg-ink2 border border-hairline rounded-xl p-2 shadow-sm" style={{ marginBottom: "10px" }}>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-faint">Status overview</span>
                {statusFilter && (
                  <button onClick={() => setStatusFilter(null)} className="btn3d btn3d-default text-dim text-[10px] font-semibold px-2.5 py-1 rounded-full">
                    Back
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {statusCounts.filter((s) => {
                  const n = s.name.trim().toLowerCase();
                  return s.id !== "approved" && s.id !== "rejected" && n !== "met" && n !== "rejected" && n !== "future potential";
                }).map((s) => {
                  const active = statusFilter === s.id;
                  const txt = contrastText(s.color);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStatusFilter(active ? null : s.id)}
                      className="relative h-14 rounded-xl flex flex-col items-center justify-center gap-0 transition-transform duration-150 active:scale-95"
                      style={{
                        backgroundImage: `linear-gradient(165deg, rgba(255,255,255,0.30), rgba(255,255,255,0) 55%), linear-gradient(${s.color}, ${s.color})`,
                        boxShadow: active
                          ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${s.color}, 0 3px 0 ${darkenHex(s.color, 0.3)}`
                          : `0 3px 0 ${darkenHex(s.color, 0.3)}`,
                      }}
                    >
                      {active && (
                        <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center shadow">
                          <Check size={7} strokeWidth={3.5} style={{ color: s.color }} />
                        </span>
                      )}
                      <span className="text-[20px] font-extrabold leading-none tracking-tight" style={{ color: txt, textShadow: txt === "#FFFFFF" ? "0 1px 2px rgba(0,0,0,0.2)" : "none" }}>
                        {s.count}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-center px-1 leading-none" style={{ color: txt, opacity: 0.9 }}>
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-8">
            {groupedByDate.length === 0 && (
              <p className="text-center text-faint text-sm py-16">No leads match your search.</p>
            )}
            {groupedByDate.map(([dateKey, dayLeads], gi) => (
              <div key={dateKey}>
                {gi > 0 && <div className="h-[3px] bg-hairline mb-8 rounded-full" />}
                <div className="flex items-center gap-2 mb-3 -ml-1.5">
                  <div
                    className="flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5"
                    style={{ background: "#D8B4FE", boxShadow: "0 3px 0 #C084FC" }}
                  >
                    <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                      <Calendar size={12} strokeWidth={2.6} className="text-black" />
                    </span>
                    <h2 className="font-mono text-black text-[14px] font-bold tracking-wide">{dateKey}</h2>
                    <span className="text-[11px] text-black/80 font-semibold">{dayName(dateKey)}</span>
                  </div>
                  <div className="h-[2px] flex-1 bg-hairline2 rounded-full" />
                  <span className="text-[14px] font-semibold text-cream">{dayLeads.length} lead{dayLeads.length !== 1 ? "s" : ""}</span>
                </div>

                {[
                  ...websites.filter((w) =>
                    isWebsiteVisible(w) && ((dateKey === todayKey() && w.active) || dayLeads.some((l) => l.websiteId === w.id))
                  ),
                  ...(() => {
                    const orphanIds = [...new Set(
                      dayLeads.filter((l) => !websites.some((w) => w.id === l.websiteId)).map((l) => l.websiteId)
                    )];
                    return orphanIds.map((id) => ({ id, short: "?", name: "Deleted website", color: "#9CA3AF", active: false }));
                  })(),
                ].map((w) => {
                  const wLeads = dayLeads.filter((l) => l.websiteId === w.id);
                  return (
                    <div key={w.id} className="mb-5">
                      <div className="flex items-center gap-2 mb-2 pl-1">
                        <span className="text-[18px] font-bold underline underline-offset-2" style={{ color: w.color }}>{w.name}</span>
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ color: w.color, background: w.color + "1A", border: `1.5px solid ${w.color}` }}
                        >
                          {wLeads.length}
                        </span>
                        <div className="flex-1" />
                        {dateKey === todayKey() && w.active && (
                          <button
                            onClick={() => setAddingWebsite(w)}
                            title={`Add ${w.name} lead`}
                            className="w-6 h-6 flex items-center justify-center rounded-full border border-dashed transition-colors hover:bg-black/5"
                            style={{ borderColor: w.color, color: w.color }}
                          >
                            <Plus size={13} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {wLeads.map((l, i) => (
                          <LeadCard
                            key={l.id}
                            lead={l}
                            index={i + 1}
                            website={w}
                            statuses={statuses}
                            agents={agents}
                            role={role}
                            onEdit={setEditingLead}
                            notify={notify}
                            onStatusChange={(id, statusId) => patchLead(id, { statusId, subStatus: null })}
                            onSubStatusChange={(id, subStatus) => patchLead(id, { subStatus: subStatus || null })}
                            onAssign={(id, assignedAgentId) => patchLead(id, { assignedAgentId, statusId: statuses[0]?.id })}
                            onRemarkChange={(id, remark) => patchLead(id, { remark, edited: { ...leads.find((x) => x.id === id)?.edited, remark: true } })}
                            onDeleteRequest={setDeletingLead}
                          />
                        ))}
                        {wLeads.length === 0 && (
                          <p className="text-[11px] text-faint italic pl-1">No {w.name} leads yet today.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            </div>
          </>
        )}

        {tab === "legacy" && <LegacyTab notes={legacyNotes} onAdd={addLegacyNote} onUpdate={updateLegacyNote} query={query} role={role} currentAgentId={currentAgentId} />}

        {tab === "settings" && (
          <SettingsTab
            websites={websites} setWebsites={setWebsites}
            statuses={statuses} setStatuses={setStatuses}
            agents={agents} setAgents={setAgents}
            role={role}
            setRole={setRole}
            currentAgentId={currentAgentId}
            setCurrentAgentId={setCurrentAgentId}
            notify={notify}
            onLogout={() => { localStorage.removeItem("leadledger_session"); setLoggedIn(false); setTab("leads"); }}
          />
        )}
      </main>

      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSave={saveEditedLead}
          role={role}
          onDeleteRequest={(l) => { setEditingLead(null); setDeletingLead(l); }}
        />
      )}
      {addingWebsite && <AddLeadModal website={addingWebsite} onClose={() => setAddingWebsite(null)} onAdd={addLead} currentAgentId={currentAgentId} statuses={statuses} />}
      {deletingLead && <ConfirmDeleteModal lead={deletingLead} onClose={() => setDeletingLead(null)} onConfirm={deleteLead} />}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}