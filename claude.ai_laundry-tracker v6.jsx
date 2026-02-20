import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from "recharts";

const CUSTOMERS = ["abc", "efg", "pqr", "xyz"];
const ITEMS = ["Blanket", "Shirt", "Handkerchief"];
const QUANTITIES = Array.from({ length: 1000 }, (_, i) => i + 1);
const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#8b5cf6", "#06b6d4", "#ec4899"];
const USERS = [
  { id: 1, username: "collector1", password: "collect123", role: "collector", displayName: "Collector 1" },
  { id: 2, username: "collector2", password: "collect456", role: "collector", displayName: "Collector 2" },
  { id: 3, username: "factory",    password: "factory123", role: "receiver",  displayName: "Factory Manager" },
];

const labelStyle = { display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#1a2744", letterSpacing: "0.05em", textTransform: "uppercase" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "2px solid #d0d9ee", fontSize: 14, background: "#fff", color: "#1a2744", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border 0.2s", appearance: "none" };
const sInput = { ...inputStyle, padding: "8px 10px", fontSize: 13 };
const TOOLTIP_STYLE = { borderRadius: 10, fontFamily: "Sora, sans-serif", fontSize: 13, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" };

function smallBtn(bg, extra = {}) {
  return { background: bg, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "opacity 0.2s", whiteSpace: "nowrap", ...extra };
}
function Card({ title, children, style = {}, titleRight }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "22px 24px 26px", boxShadow: "0 4px 24px rgba(26,39,68,0.08)", marginBottom: 22, ...style }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottom: "2px solid #eef1f8", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1a2744" }}>{title}</div>
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
}
function StatBadge({ label, value, color, sub }) {
  return (
    <div style={{ background: color + "12", borderLeft: `4px solid ${color}`, borderRadius: 10, padding: "14px 18px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#1a2744", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function StatusBadge({ status }) {
  const map = { pending: { bg: "#fef9c3", color: "#854d0e", label: "⏳ Pending" }, approved: { bg: "#dcfce7", color: "#166534", label: "✅ Approved" }, deviated: { bg: "#fee2e2", color: "#991b1b", label: "⚠ Deviated" } };
  const s = map[status] || map.pending;
  return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 800 }}>{s.label}</span>;
}
function TypeBadge({ type }) {
  return <span style={{ background: type === "collection" ? "#dbeafe" : "#dcfce7", color: type === "collection" ? "#1d4ed8" : "#166534", borderRadius: 6, padding: "3px 10px", fontWeight: 800, fontSize: 11, textTransform: "uppercase" }}>{type}</span>;
}

// C1: For approved/deviated, use verifiedItems (actual received). For pending, use original.
function getEffectiveItems(record) {
  if ((record.verificationStatus === "approved" || record.verificationStatus === "deviated") && record.verifiedItems) {
    return record.verifiedItems;
  }
  return record.items;
}

function buildFlatRows(records, statusFilter) {
  const rows = [];
  records.filter(r => statusFilter.includes(r.verificationStatus)).forEach(r => {
    getEffectiveItems(r).forEach(item => {
      rows.push({
        id: r.id, collector: r.collectorName || r.collector, collectorKey: r.collector,
        customer: r.customer, item: item.name, type: r.type, timestamp: r.timestamp,
        qty: item.qty, status: r.verificationStatus,
      });
    });
  });
  return rows;
}

// ─── Signature Canvas ──────────────────────────────────────────────────────────
function SignatureCanvas({ onSave, label }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastPos = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8f9fb"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a2744"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
  }, []);
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };
  const startDraw = (e) => { e.preventDefault(); setDrawing(true); setSaved(false); const pos = getPos(e, canvasRef.current); lastPos.current = pos; const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2); ctx.fill(); setHasSig(true); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const canvas = canvasRef.current, ctx = canvas.getContext("2d"), pos = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke(); lastPos.current = pos; };
  const stopDraw = (e) => { e && e.preventDefault(); setDrawing(false); };
  const clear = () => { const ctx = canvasRef.current.getContext("2d"); ctx.fillStyle = "#f8f9fb"; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height); setHasSig(false); setSaved(false); onSave(null); };
  const save = () => { if (!hasSig) return; onSave(canvasRef.current.toDataURL()); setSaved(true); };
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative", border: "2px solid #d0d9ee", borderRadius: 10, background: "#f8f9fb", overflow: "hidden" }}>
        <canvas ref={canvasRef} width={500} height={140} style={{ width: "100%", height: 140, display: "block", cursor: "crosshair", touchAction: "none" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
          <button type="button" onClick={clear} style={smallBtn("#e74c3c")}>Clear</button>
          <button type="button" onClick={save} style={smallBtn(saved ? "#27ae60" : "#1a2744")}>{saved ? "✓ Saved" : "Save Sig"}</button>
        </div>
        {!hasSig && <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", color: "#aab4c8", fontSize: 12, pointerEvents: "none" }}>Draw signature here</div>}
      </div>
    </div>
  );
}

// ─── Collector Form (C4: delivery qty cannot exceed available stock) ───────────
function CollectorForm({ user, setRecords, records }) {
  const [customer, setCustomer] = useState("");
  const [type, setType] = useState("collection");
  const [items, setItems] = useState([{ name: "", qty: "" }]);
  const [signature, setSignature] = useState(null);
  const [incharge, setIncharge] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // C4: Net available stock per customer+item from verified records
  const getNetAvailable = (customerName, itemName) => {
    let collected = 0, delivered = 0;
    records.forEach(r => {
      if (r.customer !== customerName) return;
      if (r.verificationStatus !== "approved" && r.verificationStatus !== "deviated") return;
      getEffectiveItems(r).forEach(it => {
        if (it.name !== itemName) return;
        if (r.type === "collection") collected += it.qty;
        if (r.type === "delivery") delivered += it.qty;
      });
    });
    return Math.max(0, collected - delivered);
  };

  const addItem = () => setItems([...items, { name: "", qty: "" }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const changeItem = (i, field, val) => { const u = [...items]; u[i][field] = val; setItems(u); };

  const validate = () => {
    if (!customer) return "Please select a customer.";
    for (const it of items) if (!it.name || !it.qty) return "Please fill all item fields.";
    if (type === "delivery") {
      for (const it of items) {
        if (!it.name || !it.qty) continue;
        const available = getNetAvailable(customer, it.name);
        if (parseInt(it.qty) > available) {
          return `Delivery qty for "${it.name}" (${it.qty}) exceeds the shared customer pool for ${customer.toUpperCase()} (available: ${available}). Collections by any collector count toward this pool.`;
        }
      }
    }
    if (!incharge.trim()) return "Please enter in-charge name.";
    if (!signature) return "Please save the customer signature.";
    return null;
  };

  const handleSubmit = () => { const err = validate(); if (err) { setError(err); return; } setError(""); setShowModal(true); };
  const confirmSubmit = () => {
    const record = {
      id: Date.now(), collector: user.username, collectorName: user.displayName,
      customer, type, items: items.map(i => ({ name: i.name, qty: parseInt(i.qty) })),
      incharge, signature, timestamp: new Date().toISOString(),
      verificationStatus: "pending", verifiedItems: null, verifiedBy: null, verifiedAt: null, remark: "",
    };
    setRecords(prev => [record, ...prev]);
    setShowModal(false); setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setCustomer(""); setType("collection"); setItems([{ name: "", qty: "" }]); setSignature(null); setIncharge(""); }, 2500);
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,50,0.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", fontFamily: "inherit" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1a2744", marginBottom: 16 }}>Confirm Submission</div>
            <div style={{ fontSize: 13, color: "#5a6a8a", marginBottom: 20, lineHeight: 1.8 }}>
              <div><strong>Customer:</strong> {customer.toUpperCase()}</div>
              <div><strong>Type:</strong> {type}</div>
              <div><strong>In-Charge:</strong> {incharge}</div>
              <div style={{ marginTop: 8 }}><strong>Items:</strong></div>
              {items.map((it, i) => <div key={i} style={{ paddingLeft: 16 }}>• {it.name} × {it.qty}</div>)}
              {signature && <div style={{ marginTop: 8, color: "#27ae60" }}>✓ Signature captured</div>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "2px solid #d0d9ee", background: "#fff", color: "#1a2744", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
              <button onClick={confirmSubmit} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#1a2744,#2563eb)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Confirm & Submit</button>
            </div>
          </div>
        </div>
      )}
      {submitted && <div style={{ background: "#e8f8ef", border: "2px solid #27ae60", borderRadius: 12, padding: "14px 20px", marginBottom: 20, color: "#1a6b3a", fontWeight: 700, fontSize: 15 }}>✓ Record submitted! Awaiting factory verification.</div>}
      <Card title={`New ${type.charAt(0).toUpperCase() + type.slice(1)} Record`}>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Customer</label>
          <select value={customer} onChange={e => setCustomer(e.target.value)} style={inputStyle}>
            <option value="">Select customer</option>
            {CUSTOMERS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: 20 }}>
            {["collection", "delivery"].map(t => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 15, fontWeight: type === t ? 700 : 500, color: type === t ? "#2563eb" : "#5a6a8a" }}>
                <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} style={{ accentColor: "#2563eb", width: 18, height: 18 }} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 8, marginBottom: 6 }}>
            <label style={labelStyle}>Item Name</label><label style={labelStyle}>Qty</label><div />
          </div>
          {items.map((item, i) => {
            const available = type === "delivery" && customer && item.name ? getNetAvailable(customer, item.name) : null;
            const overLimit = available !== null && item.qty && parseInt(item.qty) > available;
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 8, alignItems: "center" }}>
                  <select value={item.name} onChange={e => changeItem(i, "name", e.target.value)} style={inputStyle}>
                    <option value="">Select item</option>
                    {ITEMS.map(it => <option key={it}>{it}</option>)}
                  </select>
                  <select value={item.qty} onChange={e => changeItem(i, "qty", e.target.value)} style={{ ...inputStyle, border: overLimit ? "2px solid #e74c3c" : "2px solid #d0d9ee" }}>
                    <option value="">—</option>
                    {QUANTITIES.map(q => <option key={q}>{q}</option>)}
                  </select>
                  {items.length > 1 ? <button type="button" onClick={() => removeItem(i)} style={{ ...smallBtn("#e74c3c"), padding: "7px 8px", fontSize: 14 }}>✕</button> : <div />}
                </div>
                {type === "delivery" && customer && item.name && (
                  <div style={{ fontSize: 11, marginTop: 4, paddingLeft: 2, color: overLimit ? "#dc2626" : available === 0 ? "#dc2626" : "#16a34a", fontWeight: overLimit || available === 0 ? 700 : 600 }}>
                    {available === 0 ? "⚠ No verified stock in customer pool for delivery" : overLimit ? `⚠ Exceeds customer pool — only ${available} available` : `✓ Customer pool available: ${available} units (all collectors)`}
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={addItem} style={{ ...smallBtn("#2563eb"), marginTop: 4, padding: "6px 14px" }}>+ Add Item</button>
        </div>
        <div style={{ marginTop: 18 }}><SignatureCanvas label="Customer Signature" onSave={setSignature} /></div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Customer In-Charge Name</label>
          <input type="text" value={incharge} onChange={e => setIncharge(e.target.value)} placeholder="Enter in-charge name" style={inputStyle} />
        </div>
        {error && <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>⚠ {error}</div>}
        <button onClick={handleSubmit} style={{ width: "100%", padding: "14px 0", background: "linear-gradient(135deg,#1a2744,#2563eb)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Submit Record</button>
      </Card>
    </div>
  );
}

function CollectorHistory({ records }) {
  const pending = records.filter(r => r.verificationStatus === "pending").length;
  const approved = records.filter(r => r.verificationStatus === "approved").length;
  const deviated = records.filter(r => r.verificationStatus === "deviated").length;
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <StatBadge label="Total Records" value={records.length} color="#2563eb" />
        <StatBadge label="Pending" value={pending} color="#f59e0b" />
        <StatBadge label="Approved" value={approved} color="#27ae60" />
        <StatBadge label="Deviated" value={deviated} color="#e74c3c" />
      </div>
      {records.length === 0
        ? <Card><div style={{ textAlign: "center", padding: 30, color: "#aab4c8" }}>No records yet.</div></Card>
        : records.map(r => <RecordCard key={r.id} record={r} isFactory={false} />)}
    </div>
  );
}

function VerifyForm({ record: r, onVerify }) {
  const [verifiedItems, setVerifiedItems] = useState(r.items.map(it => ({ name: it.name, qty: it.qty })));
  const [remark, setRemark] = useState("");
  const [done, setDone] = useState(false);
  const updateQty = (i, val) => { const u = [...verifiedItems]; u[i].qty = parseInt(val) || 0; setVerifiedItems(u); };
  const hasDeviation = verifiedItems.some((vi, i) => vi.qty !== r.items[i]?.qty);
  const handleSubmit = () => {
    if (hasDeviation && !remark.trim()) { alert("Please add a remark explaining the deviation."); return; }
    onVerify(r.id, { verifiedItems, remark, status: hasDeviation ? "deviated" : "approved" });
    setDone(true);
  };
  if (done) return <div style={{ color: "#27ae60", fontWeight: 700, fontSize: 14, textAlign: "center", padding: "20px 0" }}>✓ Verification saved!</div>;
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, fontStyle: "italic" }}>Edit quantities to match actual items received:</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 60px", gap: 6, marginBottom: 6 }}>
        {["Item", "Recorded", "Actual", "Diff"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", textTransform: "uppercase" }}>{h}</div>)}
      </div>
      {verifiedItems.map((vi, i) => {
        const orig = r.items[i]?.qty || 0, diff = vi.qty - orig;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 60px", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2744" }}>{vi.name}</div>
            <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center", background: "#f0f4ff", borderRadius: 6, padding: "6px 0" }}>{orig}</div>
            <select value={vi.qty} onChange={e => updateQty(i, e.target.value)} style={{ ...inputStyle, padding: "6px 8px", fontSize: 13, border: diff !== 0 ? "2px solid #f59e0b" : "2px solid #d0d9ee" }}>
              {QUANTITIES.map(q => <option key={q}>{q}</option>)}
            </select>
            <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center", color: diff === 0 ? "#27ae60" : diff > 0 ? "#2563eb" : "#e74c3c" }}>{diff === 0 ? "✓" : (diff > 0 ? "+" : "") + diff}</div>
          </div>
        );
      })}
      <div style={{ marginTop: 14 }}>
        <label style={{ ...labelStyle, fontSize: 11 }}>Remark{hasDeviation ? <span style={{ color: "#e74c3c" }}> *required</span> : <span style={{ color: "#9ca3af" }}> (optional)</span>}</label>
        <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder={hasDeviation ? "Describe the deviation..." : "Optional note..."} style={{ ...inputStyle, height: 72, resize: "vertical", fontSize: 13 }} />
      </div>
      <button onClick={handleSubmit} style={{ width: "100%", marginTop: 10, padding: "11px 0", borderRadius: 8, border: "none", background: hasDeviation ? "linear-gradient(135deg,#7f1d1d,#dc2626)" : "linear-gradient(135deg,#14532d,#16a34a)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
        {hasDeviation ? "⚠ Submit — Mark as Deviated" : "✅ Approve — All Quantities Match"}
      </button>
    </div>
  );
}

// ─── Record Card (C2: in-charge displayed above signature) ────────────────────
function RecordCard({ record: r, isFactory, onVerify }) {
  const [expanded, setExpanded] = useState(isFactory && r.verificationStatus === "pending");
  return (
    <div style={{ background: "#fff", borderRadius: 14, marginBottom: 14, boxShadow: "0 2px 14px rgba(26,39,68,0.07)", border: `1.5px solid ${r.verificationStatus === "deviated" ? "#fca5a5" : r.verificationStatus === "approved" ? "#86efac" : "#eef1f8"}`, overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", cursor: "pointer", flexWrap: "wrap" }}>
        <TypeBadge type={r.type} />
        <span style={{ fontWeight: 800, color: "#1a2744", textTransform: "uppercase", fontSize: 14 }}>{r.customer}</span>
        <span style={{ color: "#6b7280", fontSize: 13, fontWeight: 600 }}>{r.collectorName}</span>
        <span style={{ color: "#9ca3af", fontSize: 12 }}>{new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span style={{ fontSize: 13, color: "#374151" }}>{r.items.map(i => `${i.name}×${i.qty}`).join(", ")} <span style={{ color: "#9ca3af" }}>(Total: {r.items.reduce((a, i) => a + i.qty, 0)})</span></span>
        <StatusBadge status={r.verificationStatus} />
        <span style={{ color: "#9ca3af", fontSize: 14, marginLeft: "auto" }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: "1.5px solid #eef1f8" }}>
          <div style={{ display: "grid", gridTemplateColumns: isFactory ? "1fr 1fr" : "1fr", gap: 0 }}>
            <div style={{ padding: "20px 22px", borderRight: isFactory ? "1.5px solid #eef1f8" : "none" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>📦 Collector's Recorded Data</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                <thead><tr style={{ background: "#eff6ff" }}>
                  <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, color: "#1d4ed8", fontSize: 11 }}>Item</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: "#1d4ed8", fontSize: 11 }}>Qty</th>
                </tr></thead>
                <tbody>
                  {r.items.map((it, i) => <tr key={i} style={{ borderTop: "1px solid #eef1f8" }}><td style={{ padding: "8px 10px", color: "#374151" }}>{it.name}</td><td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>{it.qty}</td></tr>)}
                  <tr style={{ borderTop: "2px solid #c7d2fe", background: "#eff6ff" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 800 }}>Total</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 900, color: "#2563eb" }}>{r.items.reduce((a, i) => a + i.qty, 0)}</td>
                  </tr>
                </tbody>
              </table>
              {/* C2: In-charge shown above signature */}
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "#f0f4ff", borderRadius: 10, border: "1.5px solid #c7d2fe" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>👤 Customer In-Charge</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1a2744" }}>{r.incharge || "—"}</div>
              </div>
              {r.signature && <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Customer Signature</div>
                <img src={r.signature} alt="sig" style={{ maxHeight: 56, border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8f9fb" }} />
              </div>}
            </div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>🏭 Factory Verification</div>
              {isFactory && r.verificationStatus === "pending" && <VerifyForm record={r} onVerify={onVerify} />}
              {!isFactory && r.verificationStatus === "pending" && <div style={{ textAlign: "center", padding: "30px 0", color: "#f59e0b", fontWeight: 700 }}>⏳ Awaiting factory verification</div>}
              {r.verificationStatus !== "pending" && r.verifiedItems && (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                    <thead><tr style={{ background: r.verificationStatus === "approved" ? "#f0fdf4" : "#fff7ed" }}>
                      <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, color: r.verificationStatus === "approved" ? "#166534" : "#9a3412", fontSize: 11 }}>Item</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: r.verificationStatus === "approved" ? "#166534" : "#9a3412", fontSize: 11 }}>Actual Qty</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: r.verificationStatus === "approved" ? "#166534" : "#9a3412", fontSize: 11 }}>Diff</th>
                    </tr></thead>
                    <tbody>
                      {r.verifiedItems.map((vi, i) => { const orig = r.items.find(it => it.name === vi.name); const diff = vi.qty - (orig ? orig.qty : 0); return (
                        <tr key={i} style={{ borderTop: "1px solid #eef1f8" }}>
                          <td style={{ padding: "8px 10px" }}>{vi.name}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>{vi.qty}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 800, color: diff === 0 ? "#27ae60" : diff > 0 ? "#2563eb" : "#e74c3c" }}>{diff === 0 ? "✓" : (diff > 0 ? "+" : "") + diff}</td>
                        </tr>
                      ); })}
                      <tr style={{ borderTop: "2px solid #d0d9ee", background: r.verificationStatus === "approved" ? "#f0fdf4" : "#fff7ed" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 800 }}>Total</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 900 }}>{r.verifiedItems.reduce((a, i) => a + i.qty, 0)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 900 }}>{(() => { const d = r.verifiedItems.reduce((a,i)=>a+i.qty,0)-r.items.reduce((a,i)=>a+i.qty,0); return <span style={{ color: d===0?"#27ae60":"#e74c3c" }}>{d===0?"✓":(d>0?"+":"")+d}</span>; })()}</td>
                      </tr>
                    </tbody>
                  </table>
                  {r.remark && <div style={{ background: "#fff7ed", border: "2px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#9a3412", textTransform: "uppercase", marginBottom: 4 }}>⚠ Deviation Remark</div>
                    <div style={{ fontSize: 13, color: "#7c2d12" }}>{r.remark}</div>
                  </div>}
                  <div style={{ fontSize: 11, color: "#9ca3af", borderTop: "1px solid #eef1f8", paddingTop: 10 }}>Verified by <strong style={{ color: "#374151" }}>{r.verifiedBy}</strong> · {new Date(r.verifiedAt).toLocaleString()}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Summary View (used by SummaryDashboard & PreVerificationDashboard) ─
function SummaryContent({ flatRows, noticeEl }) {
  const [fCollector, setFCollector] = useState("");
  const [fCustomer, setFCustomer] = useState("");
  const [fItem, setFItem] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("customer");
  const [chartType, setChartType] = useState("bar");

  const collectors = [...new Set(flatRows.map(r => r.collectorKey))];
  const filtered = flatRows.filter(row => {
    if (fCollector && row.collectorKey !== fCollector) return false;
    if (fCustomer && row.customer !== fCustomer) return false;
    if (fItem && row.item !== fItem) return false;
    if (fDateFrom && new Date(row.timestamp) < new Date(fDateFrom)) return false;
    if (fDateTo && new Date(row.timestamp) > new Date(fDateTo + "T23:59:59")) return false;
    return true;
  });

  const collectionRows = filtered.filter(r => r.type === "collection");
  const deliveryRows = filtered.filter(r => r.type === "delivery");
  const totalCollected = collectionRows.reduce((a, r) => a + r.qty, 0);
  const totalDelivered = deliveryRows.reduce((a, r) => a + r.qty, 0);
  const netPending = totalCollected - totalDelivered;

  // Group by customer+item only — any collector can deliver for any customer
  const tableMap = {};
  filtered.forEach(row => {
    const key = `${row.customer}||${row.item}`;
    if (!tableMap[key]) tableMap[key] = { customer: row.customer, item: row.item, collected: 0, delivered: 0, collectTS: null, deliverTS: null, collectors: new Set(), deliverers: new Set() };
    if (row.type === "collection") {
      tableMap[key].collected += row.qty;
      tableMap[key].collectors.add(row.collector);
      if (!tableMap[key].collectTS || new Date(row.timestamp) < new Date(tableMap[key].collectTS)) tableMap[key].collectTS = row.timestamp;
    } else {
      tableMap[key].delivered += row.qty;
      tableMap[key].deliverers.add(row.collector);
      if (!tableMap[key].deliverTS || new Date(row.timestamp) > new Date(tableMap[key].deliverTS)) tableMap[key].deliverTS = row.timestamp;
    }
  });
  const tableRows = Object.values(tableMap).map(r => ({ ...r, collectors: [...r.collectors].join(", "), deliverers: [...r.deliverers].join(", ") }));
  const grandCollected = tableRows.reduce((a, r) => a + r.collected, 0);
  const grandDelivered = tableRows.reduce((a, r) => a + r.delivered, 0);

  const buildChartData = () => {
    const map = {};
    filtered.forEach(row => {
      const key = groupBy === "customer" ? row.customer : groupBy === "collector" ? row.collector : groupBy === "item" ? row.item : new Date(row.timestamp).toLocaleDateString();
      if (!map[key]) map[key] = { name: key, Collected: 0, Delivered: 0 };
      if (row.type === "collection") map[key].Collected += row.qty; else map[key].Delivered += row.qty;
    });
    return Object.values(map).sort((a, b) => a.name > b.name ? 1 : -1);
  };
  const chartData = buildChartData();
  const pieData = [{ name: "Collected", value: totalCollected }, { name: "Delivered", value: totalDelivered }, { name: "Net Pending", value: Math.max(0, netPending) }].filter(d => d.value > 0);
  const itemMap = {};
  filtered.forEach(row => { if (!itemMap[row.item]) itemMap[row.item] = 0; itemMap[row.item] += row.qty; });
  const itemPieData = Object.entries(itemMap).map(([name, value]) => ({ name, value }));
  const fmtDate = ts => ts ? new Date(ts).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <div>
      {noticeEl}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <StatBadge label="Total Qty Collected" value={totalCollected} color="#2563eb" sub={`${collectionRows.length} line items`} />
        <StatBadge label="Total Qty Delivered" value={totalDelivered} color="#16a34a" sub={`${deliveryRows.length} line items`} />
        <StatBadge label="Net Pending Return" value={Math.max(0, netPending)} color="#f59e0b" sub="collected − delivered" />
      </div>
      <Card title="🔍 Filters & Grouping">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>Collector</label><select value={fCollector} onChange={e => setFCollector(e.target.value)} style={sInput}><option value="">All</option>{collectors.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>Customer</label><select value={fCustomer} onChange={e => setFCustomer(e.target.value)} style={sInput}><option value="">All</option>{CUSTOMERS.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>Item</label><select value={fItem} onChange={e => setFItem(e.target.value)} style={sInput}><option value="">All</option>{ITEMS.map(i => <option key={i}>{i}</option>)}</select></div>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>From Date</label><input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={sInput} /></div>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>To Date</label><input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={sInput} /></div>
          <div style={{ display: "flex", alignItems: "flex-end" }}><button onClick={() => { setFCollector(""); setFCustomer(""); setFItem(""); setFDateFrom(""); setFDateTo(""); }} style={{ ...smallBtn("#6b7280"), width: "100%", padding: "9px 0" }}>Clear All</button></div>
        </div>
      </Card>
      <Card title="📋 Grand Total Summary" titleRight={<span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{tableRows.length} rows</span>}>
        {tableRows.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#aab4c8" }}>No data yet.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg,#1a2744,#1e3a8a)" }}>
                  {["Customer","Item","Collected By","Delivered By","Collection Date","Delivery Date","Qty Collected","Qty Delivered","Net Pending"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: "#fff", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, idx) => {
                  const net = Math.max(0, row.collected - row.delivered);
                  return (
                    <tr key={idx} style={{ borderTop: "1px solid #eef1f8", background: idx % 2 === 0 ? "#fff" : "#f8faff" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>{row.customer}</td>
                      <td style={{ padding: "10px 14px" }}><span style={{ background: "#f0f4ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{row.item}</span></td>
                      <td style={{ padding: "10px 14px", color: "#374151", fontSize: 12 }}>{row.collectors || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#374151", fontSize: 12 }}>{row.deliverers || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#374151", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(row.collectTS)}</td>
                      <td style={{ padding: "10px 14px", color: "#374151", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(row.deliverTS)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}><span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 8, padding: "4px 14px", fontWeight: 900, fontSize: 14 }}>{row.collected}</span></td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}><span style={{ background: "#dcfce7", color: "#166534", borderRadius: 8, padding: "4px 14px", fontWeight: 900, fontSize: 14 }}>{row.delivered}</span></td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}><span style={{ background: net > 0 ? "#fff7ed" : "#f0fdf4", color: net > 0 ? "#c2410c" : "#166534", borderRadius: 8, padding: "4px 14px", fontWeight: 900, fontSize: 14 }}>{net}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "linear-gradient(135deg,#1a2744,#1e3a8a)", borderTop: "3px solid #1a2744" }}>
                  <td colSpan={6} style={{ padding: "12px 14px", fontWeight: 900, color: "#fff", fontSize: 14, textTransform: "uppercase" }}>Grand Total</td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}><span style={{ background: "#60a5fa", color: "#fff", borderRadius: 8, padding: "5px 16px", fontWeight: 900, fontSize: 15 }}>{grandCollected}</span></td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}><span style={{ background: "#4ade80", color: "#166534", borderRadius: 8, padding: "5px 16px", fontWeight: 900, fontSize: 15 }}>{grandDelivered}</span></td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}><span style={{ background: "#f59e0b", color: "#fff", borderRadius: 8, padding: "5px 16px", fontWeight: 900, fontSize: 15 }}>{Math.max(0, grandCollected - grandDelivered)}</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      {chartData.length > 0 && (
        <Card title="📊 Graphical Analysis" titleRight={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Group:</span>
            {[["customer","Customer"],["collector","Collector"],["item","Item"],["date","Date"]].map(([k,l]) => (
              <button key={k} onClick={() => setGroupBy(k)} style={{ ...smallBtn(groupBy===k?"#2563eb":"#e5e7eb"), color: groupBy===k?"#fff":"#374151", padding: "4px 12px" }}>{l}</button>
            ))}
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Chart:</span>
            {[["bar","Bar"],["line","Line"]].map(([k,l]) => (
              <button key={k} onClick={() => setChartType(k)} style={{ ...smallBtn(chartType===k?"#8b5cf6":"#e5e7eb"), color: chartType===k?"#fff":"#374151", padding: "4px 12px" }}>{l}</button>
            ))}
          </div>
        }>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2744", marginBottom: 14 }}>Collected vs Delivered — by {groupBy.charAt(0).toUpperCase()+groupBy.slice(1)}</div>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === "bar"
                ? <BarChart data={chartData} margin={{ top:5,right:20,left:0,bottom:5 }}><CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/><XAxis dataKey="name" tick={{ fontSize:12,fill:"#6b7280" }}/><YAxis tick={{ fontSize:12,fill:"#6b7280" }}/><Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/><Bar dataKey="Collected" fill="#2563eb" radius={[6,6,0,0]}/><Bar dataKey="Delivered" fill="#16a34a" radius={[6,6,0,0]}/></BarChart>
                : <LineChart data={chartData} margin={{ top:5,right:20,left:0,bottom:5 }}><CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/><XAxis dataKey="name" tick={{ fontSize:12,fill:"#6b7280" }}/><YAxis tick={{ fontSize:12,fill:"#6b7280" }}/><Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/><Line type="monotone" dataKey="Collected" stroke="#2563eb" strokeWidth={3} dot={{ r:5,fill:"#2563eb" }}/><Line type="monotone" dataKey="Delivered" stroke="#16a34a" strokeWidth={3} dot={{ r:5,fill:"#16a34a" }}/></LineChart>
              }
            </ResponsiveContainer>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:"#1a2744",marginBottom:14,textAlign:"center" }}>Collection vs Delivery Split</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>{pieData.map((_,i) => <Cell key={i} fill={["#2563eb","#16a34a","#f59e0b"][i]||CHART_COLORS[i]}/>)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE}/></PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:"#1a2744",marginBottom:14,textAlign:"center" }}>Item-wise Breakdown</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart><Pie data={itemPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>{itemPieData.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/></PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── C1 Fix: Summary uses verified quantities for approved AND deviated ─────────
function SummaryDashboard({ records }) {
  const verifiedCount = records.filter(r => r.verificationStatus === "approved" || r.verificationStatus === "deviated").length;
  const flatRows = buildFlatRows(records, ["approved", "deviated"]);
  return (
    <SummaryContent
      flatRows={flatRows}
      noticeEl={
        <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 10, padding: "10px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>
            ✅ Verified records only (approved + deviated with actual quantities) — {verifiedCount} of {records.length} records verified
          </span>
        </div>
      }
    />
  );
}

// ─── C3: Pre-Verification Dashboard ──────────────────────────────────────────
function PreVerificationDashboard({ records }) {
  const pendingCount = records.filter(r => r.verificationStatus === "pending").length;
  const flatRows = buildFlatRows(records, ["pending"]);
  return (
    <SummaryContent
      flatRows={flatRows}
      noticeEl={
        <div style={{ background: "#fef9c3", border: "2px solid #fde047", borderRadius: 10, padding: "10px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#854d0e", fontWeight: 700 }}>
            ⏳ Pre-Verification View — {pendingCount} records awaiting factory verification. Quantities are collector-recorded (unverified).
          </span>
        </div>
      }
    />
  );
}

// ─── C5: Management Dashboard ─────────────────────────────────────────────────
function ManagementDashboard({ records }) {
  const [fCustomer, setFCustomer] = useState("");
  const [fCollector, setFCollector] = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  const collectors = [...new Set(records.map(r => r.collector))];

  const filteredRecords = records.filter(r => {
    if (fCustomer && r.customer !== fCustomer) return false;
    if (fCollector && r.collector !== fCollector) return false;
    if (fDateFrom && new Date(r.timestamp) < new Date(fDateFrom)) return false;
    if (fDateTo && new Date(r.timestamp) > new Date(fDateTo + "T23:59:59")) return false;
    return true;
  });

  const approved = filteredRecords.filter(r => r.verificationStatus === "approved");
  const deviated = filteredRecords.filter(r => r.verificationStatus === "deviated");
  const pending = filteredRecords.filter(r => r.verificationStatus === "pending");

  const verifiedFlat = buildFlatRows(filteredRecords, ["approved", "deviated"]);
  const collectionFlat = verifiedFlat.filter(r => r.type === "collection");
  const deliveryFlat = verifiedFlat.filter(r => r.type === "delivery");
  const totalCollected = collectionFlat.reduce((a, r) => a + r.qty, 0);
  const totalDelivered = deliveryFlat.reduce((a, r) => a + r.qty, 0);
  const netPending = Math.max(0, totalCollected - totalDelivered);

  const verifiedTotal = approved.length + deviated.length;
  const deviationRate = verifiedTotal > 0 ? ((deviated.length / verifiedTotal) * 100).toFixed(1) : "0.0";
  const deliveryRate = totalCollected > 0 ? ((totalDelivered / totalCollected) * 100).toFixed(1) : "0.0";

  // Status pie
  const statusPie = [{ name:"Approved",value:approved.length },{ name:"Deviated",value:deviated.length },{ name:"Pending",value:pending.length }].filter(d=>d.value>0);

  // Daily trend
  const dailyMap = {};
  verifiedFlat.forEach(r => {
    const day = new Date(r.timestamp).toLocaleDateString();
    if (!dailyMap[day]) dailyMap[day] = { date: day, Collected: 0, Delivered: 0 };
    if (r.type === "collection") dailyMap[day].Collected += r.qty;
    else dailyMap[day].Delivered += r.qty;
  });
  const dailyData = Object.values(dailyMap).sort((a,b) => new Date(a.date)-new Date(b.date));

  // Customer perf
  const customerMap = {};
  CUSTOMERS.forEach(c => { customerMap[c] = { name: c.toUpperCase(), Collected:0, Delivered:0, Pending:0 }; });
  verifiedFlat.forEach(r => {
    if (!customerMap[r.customer]) customerMap[r.customer] = { name: r.customer.toUpperCase(), Collected:0, Delivered:0, Pending:0 };
    if (r.type==="collection") customerMap[r.customer].Collected += r.qty;
    else customerMap[r.customer].Delivered += r.qty;
  });
  Object.values(customerMap).forEach(c => { c.Pending = Math.max(0, c.Collected - c.Delivered); });
  const customerData = Object.values(customerMap).filter(c => c.Collected > 0 || c.Delivered > 0);

  // Collector perf
  const collectorMap = {};
  verifiedFlat.forEach(r => {
    if (!collectorMap[r.collectorKey]) collectorMap[r.collectorKey] = { name: r.collector, Collected:0, Delivered:0 };
    if (r.type==="collection") collectorMap[r.collectorKey].Collected += r.qty;
    else collectorMap[r.collectorKey].Delivered += r.qty;
  });
  const collectorData = Object.values(collectorMap);

  // Item perf
  const itemMap = {};
  verifiedFlat.forEach(r => {
    if (!itemMap[r.item]) itemMap[r.item] = { name: r.item, Collected:0, Delivered:0 };
    if (r.type==="collection") itemMap[r.item].Collected += r.qty;
    else itemMap[r.item].Delivered += r.qty;
  });
  const itemData = Object.values(itemMap);

  // Deviation per customer
  const devMap = {};
  filteredRecords.filter(r=>r.verificationStatus!=="pending").forEach(r => {
    if (!devMap[r.customer]) devMap[r.customer] = { name: r.customer.toUpperCase(), Approved:0, Deviated:0 };
    if (r.verificationStatus==="approved") devMap[r.customer].Approved++;
    else devMap[r.customer].Deviated++;
  });
  const deviationData = Object.values(devMap);

  // Collector deviation rate
  const colDevMap = {};
  filteredRecords.filter(r=>r.verificationStatus!=="pending").forEach(r => {
    if (!colDevMap[r.collector]) colDevMap[r.collector] = { name: r.collectorName||r.collector, total:0, deviated:0 };
    colDevMap[r.collector].total++;
    if (r.verificationStatus==="deviated") colDevMap[r.collector].deviated++;
  });
  const colDevData = Object.values(colDevMap).map(c => ({ ...c, rate: c.total>0 ? +((c.deviated/c.total)*100).toFixed(1) : 0 }));

  // Radar
  const radarData = ITEMS.map(item => {
    const d = { item };
    CUSTOMERS.forEach(c => { d[c.toUpperCase()] = collectionFlat.filter(r => r.customer===c && r.item===item).reduce((a,r)=>a+r.qty,0); });
    return d;
  });

  return (
    <div>
      <Card title="🔍 Filters">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>Customer</label><select value={fCustomer} onChange={e=>setFCustomer(e.target.value)} style={sInput}><option value="">All</option>{CUSTOMERS.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>Collector</label><select value={fCollector} onChange={e=>setFCollector(e.target.value)} style={sInput}><option value="">All</option>{collectors.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>From Date</label><input type="date" value={fDateFrom} onChange={e=>setFDateFrom(e.target.value)} style={sInput}/></div>
          <div><label style={{ ...labelStyle, fontSize: 11 }}>To Date</label><input type="date" value={fDateTo} onChange={e=>setFDateTo(e.target.value)} style={sInput}/></div>
          <div style={{ display:"flex",alignItems:"flex-end" }}><button onClick={()=>{setFCustomer("");setFCollector("");setFDateFrom("");setFDateTo("");}} style={{ ...smallBtn("#6b7280"), width:"100%", padding:"9px 0" }}>Clear</button></div>
        </div>
      </Card>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { icon:"📋", label:"Total Records", value: filteredRecords.length, color:"#2563eb" },
          { icon:"✅", label:"Approved",       value: approved.length,       color:"#16a34a" },
          { icon:"⚠",  label:"Deviated",       value: deviated.length,       color:"#dc2626" },
          { icon:"⏳", label:"Pending",         value: pending.length,        color:"#f59e0b" },
          { icon:"📦", label:"Qty Collected",   value: totalCollected,        color:"#2563eb" },
          { icon:"🚚", label:"Qty Delivered",   value: totalDelivered,        color:"#16a34a" },
          { icon:"🔄", label:"Net Pending Qty", value: netPending,            color:"#f59e0b" },
          { icon:"📉", label:"Deviation Rate",  value: `${deviationRate}%`,   color:"#dc2626" },
          { icon:"📈", label:"Delivery Rate",   value: `${deliveryRate}%`,    color:"#8b5cf6" },
        ].map(k => (
          <div key={k.label} style={{ background:"#fff", borderRadius:14, padding:"16px 14px", boxShadow:"0 2px 12px rgba(26,39,68,0.08)", borderTop:`4px solid ${k.color}`, textAlign:"center" }}>
            <div style={{ fontSize:22 }}>{k.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#1a2744", marginTop:4 }}>{k.value}</div>
            <div style={{ fontSize:10, color:"#6b7280", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Status Donut + Daily Trend */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
        <Card title="🥧 Record Status Distribution">
          {statusPie.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No records yet</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={65} outerRadius={100} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                  {statusPie.map((_,i)=><Cell key={i} fill={["#16a34a","#dc2626","#f59e0b"][i]}/>)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="📈 Daily Trend — Collected vs Delivered">
          {dailyData.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No verified data yet</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData} margin={{ top:5,right:20,left:0,bottom:5 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.25}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/>
                <XAxis dataKey="date" tick={{ fontSize:11,fill:"#6b7280" }}/>
                <YAxis tick={{ fontSize:11,fill:"#6b7280" }}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/>
                <Area type="monotone" dataKey="Collected" stroke="#2563eb" strokeWidth={2} fill="url(#gc)"/>
                <Area type="monotone" dataKey="Delivered" stroke="#16a34a" strokeWidth={2} fill="url(#gd)"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 2: Customer Performance */}
      <Card title="🏪 Customer-wise Performance (Collected / Delivered / Pending)">
        {customerData.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No verified data yet</div> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={customerData} margin={{ top:5,right:20,left:0,bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/>
              <XAxis dataKey="name" tick={{ fontSize:12,fill:"#6b7280" }}/>
              <YAxis tick={{ fontSize:12,fill:"#6b7280" }}/>
              <Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/>
              <Bar dataKey="Collected" fill="#2563eb" radius={[4,4,0,0]}/>
              <Bar dataKey="Delivered" fill="#16a34a" radius={[4,4,0,0]}/>
              <Bar dataKey="Pending"   fill="#f59e0b" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Row 3: Collector perf + Deviation rate */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
        <Card title="👤 Collector Performance">
          {collectorData.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No data</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={collectorData} layout="vertical" margin={{ top:5,right:30,left:60,bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/>
                <XAxis type="number" tick={{ fontSize:11,fill:"#6b7280" }}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize:12,fill:"#6b7280" }} width={90}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/>
                <Bar dataKey="Collected" fill="#2563eb" radius={[0,4,4,0]}/>
                <Bar dataKey="Delivered" fill="#16a34a" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="⚠ Deviation Rate by Collector">
          {colDevData.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No data</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={colDevData} margin={{ top:5,right:20,left:0,bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/>
                <XAxis dataKey="name" tick={{ fontSize:12,fill:"#6b7280" }}/>
                <YAxis tick={{ fontSize:12,fill:"#6b7280" }} unit="%"/>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>[`${v}%`,"Deviation Rate"]}/>
                <Bar dataKey="rate" fill="#dc2626" radius={[6,6,0,0]} name="Deviation %"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 4: Item perf + Deviation per customer */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
        <Card title="🧺 Item-wise Collected vs Delivered">
          {itemData.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No data</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={itemData} margin={{ top:5,right:20,left:0,bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/>
                <XAxis dataKey="name" tick={{ fontSize:12,fill:"#6b7280" }}/>
                <YAxis tick={{ fontSize:12,fill:"#6b7280" }}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/>
                <Bar dataKey="Collected" fill="#8b5cf6" radius={[6,6,0,0]}/>
                <Bar dataKey="Delivered" fill="#06b6d4" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="🔍 Deviation Breakdown by Customer">
          {deviationData.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No verified records yet</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deviationData} margin={{ top:5,right:20,left:0,bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8"/>
                <XAxis dataKey="name" tick={{ fontSize:12,fill:"#6b7280" }}/>
                <YAxis tick={{ fontSize:12,fill:"#6b7280" }}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/><Legend/>
                <Bar dataKey="Approved" fill="#16a34a" stackId="a"/>
                <Bar dataKey="Deviated" fill="#dc2626" stackId="a" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 5: Radar + Item Pie */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
        <Card title="🕸 Customer × Item Collection Radar">
          {verifiedFlat.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No data</div> : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#eef1f8"/>
                <PolarAngleAxis dataKey="item" tick={{ fontSize:12,fill:"#6b7280" }}/>
                <PolarRadiusAxis tick={{ fontSize:10,fill:"#9ca3af" }}/>
                {CUSTOMERS.map((c,i) => <Radar key={c} name={c.toUpperCase()} dataKey={c.toUpperCase()} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15}/>)}
                <Legend/><Tooltip contentStyle={TOOLTIP_STYLE}/>
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="🥧 Item-wise Total Quantity Share">
          {itemData.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No data</div> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={itemData.map(d=>({ name:d.name, value:d.Collected+d.Delivered }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent })=>`${name} ${(percent*100).toFixed(0)}%`}>
                  {itemData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>[v,"Total Qty"]}/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Executive Summary Table */}
      <Card title="📋 Executive Summary Table">
        {filteredRecords.length === 0 ? <div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No records to display.</div> : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"linear-gradient(135deg,#1a2744,#1e3a8a)" }}>
                  {["Customer","Collector","Type","Items","Recorded Qty","Verified Qty","Status","Date"].map(h=>(
                    <th key={h} style={{ padding:"10px 12px",textAlign:"left",fontWeight:700,color:"#fff",fontSize:11,textTransform:"uppercase",whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map((r,idx)=>{
                  const recQty = r.items.reduce((a,i)=>a+i.qty,0);
                  const verQty = r.verifiedItems ? r.verifiedItems.reduce((a,i)=>a+i.qty,0) : "—";
                  return (
                    <tr key={r.id} style={{ borderTop:"1px solid #eef1f8",background:idx%2===0?"#fff":"#f8faff" }}>
                      <td style={{ padding:"9px 12px",fontWeight:800,color:"#2563eb",textTransform:"uppercase" }}>{r.customer}</td>
                      <td style={{ padding:"9px 12px",color:"#374151" }}>{r.collectorName}</td>
                      <td style={{ padding:"9px 12px" }}><TypeBadge type={r.type}/></td>
                      <td style={{ padding:"9px 12px",color:"#374151",fontSize:12 }}>{r.items.map(i=>`${i.name}(${i.qty})`).join(", ")}</td>
                      <td style={{ padding:"9px 12px",textAlign:"center",fontWeight:700 }}>{recQty}</td>
                      <td style={{ padding:"9px 12px",textAlign:"center",fontWeight:700,color:verQty!=="—"&&verQty!==recQty?"#dc2626":"#374151" }}>{verQty}</td>
                      <td style={{ padding:"9px 12px" }}><StatusBadge status={r.verificationStatus}/></td>
                      <td style={{ padding:"9px 12px",color:"#6b7280",fontSize:12,whiteSpace:"nowrap" }}>{new Date(r.timestamp).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Factory Dashboard ────────────────────────────────────────────────────────
function FactoryDashboard({ records, setRecords, user }) {
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCollector, setFilterCollector] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const collectors = [...new Set(records.map(r => r.collector))];
  const filtered = records.filter(r => {
    if (activeTab !== "all" && r.verificationStatus !== activeTab) return false;
    if (filterCustomer && r.customer !== filterCustomer) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterCollector && r.collector !== filterCollector) return false;
    if (dateFrom && new Date(r.timestamp) < new Date(dateFrom)) return false;
    if (dateTo && new Date(r.timestamp) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const totalCollected = records.filter(r=>r.type==="collection").reduce((s,r)=>s+r.items.reduce((a,i)=>a+i.qty,0),0);
  const totalDelivered = records.filter(r=>r.type==="delivery").reduce((s,r)=>s+r.items.reduce((a,i)=>a+i.qty,0),0);

  const handleVerify = (id, { verifiedItems, remark, status }) => {
    setRecords(prev => prev.map(r => r.id!==id ? r : { ...r, verificationStatus:status, verifiedItems, remark, verifiedBy:user.username, verifiedAt:new Date().toISOString() }));
  };

  const tabs = [
    { key:"pending",  label:"⏳ Pending",  count: records.filter(r=>r.verificationStatus==="pending").length },
    { key:"approved", label:"✅ Approved", count: records.filter(r=>r.verificationStatus==="approved").length },
    { key:"deviated", label:"⚠ Deviated", count: records.filter(r=>r.verificationStatus==="deviated").length },
    { key:"all",      label:"📋 All",      count: records.length },
  ];

  return (
    <div>
      <div style={{ display:"flex",gap:12,marginBottom:22,flexWrap:"wrap" }}>
        <StatBadge label="Total Collected" value={totalCollected} color="#2563eb"/>
        <StatBadge label="Total Delivered" value={totalDelivered} color="#27ae60"/>
        <StatBadge label="Pending Verification" value={records.filter(r=>r.verificationStatus==="pending").length} color="#f59e0b"/>
        <StatBadge label="Deviations Found" value={records.filter(r=>r.verificationStatus==="deviated").length} color="#e74c3c"/>
      </div>
      <Card title="🔍 Filters">
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12 }}>
          <div><label style={{ ...labelStyle,fontSize:11 }}>Customer</label><select value={filterCustomer} onChange={e=>setFilterCustomer(e.target.value)} style={sInput}><option value="">All</option>{CUSTOMERS.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={{ ...labelStyle,fontSize:11 }}>Type</label><select value={filterType} onChange={e=>setFilterType(e.target.value)} style={sInput}><option value="">All</option><option value="collection">Collection</option><option value="delivery">Delivery</option></select></div>
          <div><label style={{ ...labelStyle,fontSize:11 }}>Collector</label><select value={filterCollector} onChange={e=>setFilterCollector(e.target.value)} style={sInput}><option value="">All</option>{collectors.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={{ ...labelStyle,fontSize:11 }}>From Date</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={sInput}/></div>
          <div><label style={{ ...labelStyle,fontSize:11 }}>To Date</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={sInput}/></div>
          <div style={{ display:"flex",alignItems:"flex-end" }}><button onClick={()=>{setFilterCustomer("");setFilterType("");setFilterCollector("");setDateFrom("");setDateTo("");}} style={{ ...smallBtn("#6b7280"),width:"100%",padding:"9px 0" }}>Clear</button></div>
        </div>
      </Card>
      <div style={{ display:"flex",gap:0,marginBottom:18,background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px rgba(26,39,68,0.07)",border:"1.5px solid #eef1f8" }}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{ flex:1,padding:"13px 8px",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:activeTab===t.key?800:600,fontSize:13,background:activeTab===t.key?"linear-gradient(135deg,#1a2744,#2563eb)":"transparent",color:activeTab===t.key?"#fff":"#6b7280",transition:"all 0.2s" }}>
            {t.label} <span style={{ marginLeft:4,background:activeTab===t.key?"rgba(255,255,255,0.25)":"#eef1f8",color:activeTab===t.key?"#fff":"#374151",borderRadius:10,padding:"1px 8px",fontSize:11,fontWeight:900 }}>{t.count}</span>
          </button>
        ))}
      </div>
      {filtered.length===0
        ? <Card><div style={{ textAlign:"center",padding:40,color:"#aab4c8" }}>No records in this category.</div></Card>
        : filtered.map(r=><RecordCard key={r.id} record={r} isFactory={true} onVerify={handleVerify}/>)
      }
    </div>
  );
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const handleLogin = () => {
    const user = USERS.find(u => u.username===username && u.password===password);
    if (user) onLogin(user); else setError("Invalid username or password.");
  };
  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0f172a 0%,#1a2744 55%,#1e3a8a 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Sora',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { from { transform:translateY(0) rotate(0deg); } to { transform:translateY(-18px) rotate(4deg); } }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none" }}>
        {[...Array(5)].map((_,i)=><div key={i} style={{ position:"absolute",borderRadius:"50%",background:`rgba(37,99,235,${0.04+i*0.02})`,width:(180+i*80)+"px",height:(180+i*80)+"px",top:(8+i*14)+"%",left:(4+i*16)+"%",animation:`float ${6+i}s ease-in-out infinite alternate` }}/>)}
      </div>
      <div style={{ background:"rgba(255,255,255,0.97)",borderRadius:24,padding:"44px 40px",width:"100%",maxWidth:400,boxShadow:"0 32px 80px rgba(0,0,0,0.4)",position:"relative",zIndex:1,animation:"fadeUp 0.5s ease" }}>
        <div style={{ textAlign:"center",marginBottom:32 }}>
          <div style={{ fontSize:46,marginBottom:8 }}>🧺</div>
          <div style={{ fontSize:26,fontWeight:900,color:"#1a2744",letterSpacing:"-0.02em" }}>LaundryTrack</div>
          <div style={{ fontSize:13,color:"#6b7280",marginTop:4 }}>Collection & Delivery Management</div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Username</label>
          <input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
        </div>
        {error && <div style={{ color:"#e74c3c",fontSize:13,marginBottom:14,fontWeight:600,textAlign:"center" }}>⚠ {error}</div>}
        <button onClick={handleLogin} style={{ width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#1a2744,#2563eb)",color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>Sign In</button>
        <div style={{ marginTop:22,background:"#f0f4ff",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#4b5563",lineHeight:1.9 }}>
          <div style={{ fontWeight:700,marginBottom:2,color:"#1a2744" }}>Demo Credentials</div>
          <div>Collector 1: <code>collector1</code> / <code>collect123</code></div>
          <div>Collector 2: <code>collector2</code> / <code>collect456</code></div>
          <div>Factory: <code>factory</code> / <code>factory123</code></div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("form");

  if (!user) return <LoginScreen onLogin={(u)=>{ setUser(u); setActiveTab(u.role==="receiver"?"verify":"form"); }}/>;

  const factoryTabs = [
    ["management","📊 Management"],
    ["summary","📈 Summary"],
    ["preverify","⏳ Pre-Verify"],
    ["verify","🏭 Verification"],
  ];
  const collectorTabs = [["form","📝 New Record"],["history","📋 My Records"]];

  return (
    <div style={{ fontFamily:"'Sora',sans-serif",minHeight:"100vh",background:"#eef2fa" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; }
        select,input,textarea { font-family:'Sora',sans-serif !important; }
      `}</style>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a8a)",padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(10,30,80,0.4)" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:62,gap:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:22 }}>🧺</span>
            <span style={{ fontSize:17,fontWeight:900,color:"#fff" }}>LaundryTrack</span>
            {user.role==="receiver"&&<span style={{ background:"#f59e0b",color:"#451a03",borderRadius:5,padding:"2px 9px",fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.06em" }}>Factory</span>}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
            <div style={{ display:"flex",background:"rgba(255,255,255,0.1)",borderRadius:8,overflow:"hidden" }}>
              {(user.role==="collector"?collectorTabs:factoryTabs).map(([key,label])=>(
                <button key={key} onClick={()=>setActiveTab(key)} style={{ background:activeTab===key?"rgba(255,255,255,0.22)":"transparent",color:"#fff",border:"none",padding:"9px 14px",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12,borderRight:"1px solid rgba(255,255,255,0.1)" }}>{label}</button>
              ))}
            </div>
            <span style={{ fontSize:13,color:"rgba(255,255,255,0.8)" }}>👤 <span style={{ color:"#fff",fontWeight:700 }}>{user.displayName}</span></span>
            <button onClick={()=>setUser(null)} style={{ ...smallBtn("rgba(255,255,255,0.12)"),border:"1px solid rgba(255,255,255,0.22)",padding:"7px 14px" }}>Sign Out</button>
          </div>
        </div>
      </div>
      <div style={{ maxWidth:1200,margin:"0 auto",padding:"30px 20px" }}>
        {user.role==="collector" ? (
          activeTab==="form"
            ? <CollectorForm user={user} setRecords={setRecords} records={records}/>
            : <><div style={{ fontSize:22,fontWeight:800,color:"#1a2744",marginBottom:20 }}>My Submitted Records</div><CollectorHistory records={records.filter(r=>r.collector===user.username)}/></>
        ) : (
          <>
            {activeTab==="management"&&(
              <>
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:22,fontWeight:900,color:"#1a2744" }}>📊 Management Dashboard</div>
                  <div style={{ fontSize:13,color:"#6b7280",marginTop:4 }}>Executive overview — KPIs, trends, deviation analysis, collector & customer performance</div>
                </div>
                <ManagementDashboard records={records}/>
              </>
            )}
            {activeTab==="summary"&&(
              <>
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:22,fontWeight:900,color:"#1a2744" }}>📈 Verified Summary Dashboard</div>
                  <div style={{ fontSize:13,color:"#6b7280",marginTop:4 }}>Approved + deviated records with actual verified quantities</div>
                </div>
                <SummaryDashboard records={records}/>
              </>
            )}
            {activeTab==="preverify"&&(
              <>
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:22,fontWeight:900,color:"#1a2744" }}>⏳ Pre-Verification Dashboard</div>
                  <div style={{ fontSize:13,color:"#6b7280",marginTop:4 }}>Pending records awaiting factory verification — collector-recorded quantities</div>
                </div>
                <PreVerificationDashboard records={records}/>
              </>
            )}
            {activeTab==="verify"&&(
              <>
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:22,fontWeight:900,color:"#1a2744" }}>🏭 Factory Verification</div>
                  <div style={{ fontSize:13,color:"#6b7280",marginTop:4 }}>Review collector records · verify quantities · approve or flag deviations</div>
                </div>
                <FactoryDashboard records={records} setRecords={setRecords} user={user}/>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
