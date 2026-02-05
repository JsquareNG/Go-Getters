import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";
const APPLICATION_ID = "00000053"; // hardcode for now (no login yet)

// ---- helpers ----
function extractSignedUrl(obj) {
  return (
    obj?.signedUrl ||
    obj?.signedURL ||
    obj?.url ||
    obj?.data?.signedUrl ||
    obj?.data?.signedURL ||
    obj?.data?.url ||
    obj?.signed_download?.signedUrl ||
    obj?.signed_download?.signedURL ||
    obj?.signed_download?.url ||
    obj?.signed_download ||
    obj?.signed_upload?.signedUrl ||
    obj?.signed_upload?.signedURL ||
    obj?.signed_upload?.url ||
    obj?.signed_upload?.data?.signedUrl ||
    obj?.signed_upload?.data?.signedURL ||
    obj?.signed_upload?.data?.url ||
    null
  );
}

function formatDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString();
}

function isPdf(file) {
  if (!file) return false;
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function safeId() {
  return crypto?.randomUUID?.() || `${Date.now()}_${Math.random()}`;
}

export default function ViewSubmittedApplication() {
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState(null);
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState("");

  // staged changes (do NOT hit DB/storage until Save)
  // { [document_id]: { file: File, previewUrl: string } }
  const [pendingReplacements, setPendingReplacements] = useState({});
  // { [document_id]: true }   (supporting only)
  const [pendingDeletes, setPendingDeletes] = useState({});
  // [{ id, file, previewUrl }]
  const [pendingNewSupporting, setPendingNewSupporting] = useState([]);

  const [saving, setSaving] = useState(false);

  // Hidden file inputs per existing doc row (replace)
  const fileInputsRef = useRef({});
  // Hidden file input for new supporting files
  const addSupportingRef = useRef(null);

  const uploadedDocs = useMemo(() => docs.filter((d) => d.status === "uploaded"), [docs]);

  const requiredDocs = useMemo(() => {
    const requiredTypes = ["bank_statement", "business_registration", "directors_info"];
    const map = {};
    for (const t of requiredTypes) {
      map[t] = uploadedDocs.find((d) => d.document_type === t) || null;
    }
    return map;
  }, [uploadedDocs]);

  const supportingDocs = useMemo(
    () => uploadedDocs.filter((d) => d.document_type === "supporting"),
    [uploadedDocs]
  );

  // ---- API calls ----
  async function fetchApplication() {
    const res = await fetch(`${API_BASE}/applications/byAppID/${APPLICATION_ID}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchDocuments() {
    const res = await fetch(`${API_BASE}/documents/by-application/${APPLICATION_ID}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function refreshDocuments() {
    const docsData = await fetchDocuments();
    setDocs(Array.isArray(docsData) ? docsData : []);
  }

  // ---- View document ----
  // Priority:
  // 1) If staged delete -> block
  // 2) If staged replace -> open local preview
  // 3) Otherwise -> signed download from backend
  async function openDoc(document_id) {
    setError("");

    if (pendingDeletes[document_id]) {
      setError("This document is marked for deletion. Undo delete to view it.");
      return;
    }

    const pending = pendingReplacements[document_id];
    if (pending?.previewUrl) {
      window.open(pending.previewUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const res = await fetch(`${API_BASE}/documents/download-url/${document_id}`);
    if (!res.ok) {
      const txt = await res.text();
      setError(`Failed to get download URL: ${res.status} ${txt}`);
      return;
    }

    const data = await res.json();
    const url = extractSignedUrl(data);
    if (!url) {
      setError(`Download URL response missing URL. Got: ${JSON.stringify(data)}`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ---- Existing supporting delete (staged) ----
  function toggleDeleteSupporting(document_id, shouldDelete) {
    setError("");

    setPendingDeletes((prev) => {
      const next = { ...prev };
      if (shouldDelete) next[document_id] = true;
      else delete next[document_id];
      return next;
    });

    // if deleting, also discard any staged replacement for that doc
    if (shouldDelete) {
      setPendingReplacements((prev) => {
        if (!prev[document_id]) return prev;
        const next = { ...prev };
        const oldUrl = next[document_id]?.previewUrl;
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        delete next[document_id];
        return next;
      });
    }
  }

  // ---- Replace existing (staged, local only) ----
  function clickReplace(document_id) {
    setError("");
    if (pendingDeletes[document_id]) {
      setError("Undo delete first before replacing this supporting document.");
      return;
    }
    const el = fileInputsRef.current[document_id];
    if (el) el.click();
  }

  function onPickReplaceFile(document_id, file) {
    if (!file) return;
    setError("");

    if (!isPdf(file)) {
      setError("Only PDF supported for now. Please select a .pdf file.");
      const el = fileInputsRef.current[document_id];
      if (el) el.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setPendingReplacements((prev) => {
      const old = prev[document_id]?.previewUrl;
      if (old) URL.revokeObjectURL(old);

      return { ...prev, [document_id]: { file, previewUrl } };
    });

    // reset input
    const el = fileInputsRef.current[document_id];
    if (el) el.value = "";
  }

  function cancelPendingReplace(document_id) {
    setPendingReplacements((prev) => {
      const next = { ...prev };
      const old = next[document_id]?.previewUrl;
      if (old) URL.revokeObjectURL(old);
      delete next[document_id];
      return next;
    });
  }

  // ---- Add new supporting docs (staged, local only) ----
  function clickAddSupporting() {
    setError("");
    addSupportingRef.current?.click?.();
  }

  function onPickNewSupportingFiles(fileList) {
    setError("");
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const pdfs = [];
    for (const f of files) {
      if (!isPdf(f)) {
        // skip non-pdf
        continue;
      }
      pdfs.push(f);
    }

    if (pdfs.length === 0) {
      setError("Only PDF supported for now. Please select .pdf file(s).");
      if (addSupportingRef.current) addSupportingRef.current.value = "";
      return;
    }

    setPendingNewSupporting((prev) => [
      ...prev,
      ...pdfs.map((f) => ({ id: safeId(), file: f, previewUrl: URL.createObjectURL(f) })),
    ]);

    if (addSupportingRef.current) addSupportingRef.current.value = "";
  }

  function removePendingNewSupporting(id) {
    setPendingNewSupporting((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  function viewPendingNewSupporting(id) {
    const item = pendingNewSupporting.find((x) => x.id === id);
    if (item?.previewUrl) window.open(item.previewUrl, "_blank", "noopener,noreferrer");
  }

  // ---- SAVE: apply staged changes to backend ----
  async function saveChanges() {
    setError("");

    const hasDeletes = Object.keys(pendingDeletes).length > 0;
    const hasReplaces = Object.keys(pendingReplacements).length > 0;
    const hasNewSupporting = pendingNewSupporting.length > 0;

    if (!hasDeletes && !hasReplaces && !hasNewSupporting) return;

    try {
      setSaving(true);

      // 1) DELETE supporting docs marked for deletion
      // Requires backend endpoint:
      //   DELETE /documents/{document_id}
      // (If you named it differently, change it here.)
      if (hasDeletes) {
        for (const document_id of Object.keys(pendingDeletes)) {
          const res = await fetch(`${API_BASE}/documents/${document_id}`, { method: "DELETE" });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Delete failed (${document_id}): ${res.status} ${txt}`);
          }
        }
      }

      // 2) REPLACE uploads (backend uploads to storage + updates db)
      // Using your existing endpoint:
      //   POST /documents/replace-upload/{document_id} (multipart/form-data file)
      if (hasReplaces) {
        for (const [document_id, { file }] of Object.entries(pendingReplacements)) {
          const form = new FormData();
          form.append("file", file);

          const res = await fetch(`${API_BASE}/documents/replace-upload/${document_id}`, {
            method: "POST",
            body: form,
          });

          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Replace failed (${document_id}): ${res.status} ${txt}`);
          }
        }
      }

      // 3) ADD new supporting docs using existing init-persist-upload flow
      //    (NO new endpoint needed)
      if (hasNewSupporting) {
        for (const item of pendingNewSupporting) {
          const file = item.file;

          // init
          const initRes = await fetch(`${API_BASE}/documents/init-persist-upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              application_id: APPLICATION_ID,
              document_type: "supporting",
              filename: file.name,
              mime_type: "application/pdf",
            }),
          });
          if (!initRes.ok) throw new Error(`init-persist-upload failed: ${await initRes.text()}`);
          const initData = await initRes.json();

          const uploadUrl = extractSignedUrl(initData?.signed_upload);
          if (!uploadUrl) {
            throw new Error(`Missing signed upload URL. Got: ${JSON.stringify(initData)}`);
          }

          // PUT to signed url (NO apikey/auth headers)
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/pdf" },
            body: file,
          });
          if (!putRes.ok) {
            const txt = await putRes.text();
            throw new Error(`Storage PUT failed: ${putRes.status} ${txt}`);
          }

          // confirm
          const confirmRes = await fetch(`${API_BASE}/documents/confirm-persist-upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document_id: initData.document_id }),
          });
          if (!confirmRes.ok) {
            const txt = await confirmRes.text();
            throw new Error(`confirm-persist-upload failed: ${confirmRes.status} ${txt}`);
          }
        }
      }

      // 4) refresh from DB
      await refreshDocuments();

      // 5) cleanup + reset staged states
      for (const { previewUrl } of Object.values(pendingReplacements)) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      }
      for (const { previewUrl } of pendingNewSupporting) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      }

      setPendingReplacements({});
      setPendingDeletes({});
      setPendingNewSupporting([]);
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Cleanup blob urls on unmount
  useEffect(() => {
    return () => {
      for (const { previewUrl } of Object.values(pendingReplacements)) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      }
      for (const x of pendingNewSupporting) {
        if (x?.previewUrl) URL.revokeObjectURL(x.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [appData, docsData] = await Promise.all([fetchApplication(), fetchDocuments()]);
        if (cancelled) return;

        setApp(appData);
        setDocs(Array.isArray(docsData) ? docsData : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingReplaceCount = Object.keys(pendingReplacements).length;
  const pendingDeleteCount = Object.keys(pendingDeletes).length;
  const pendingNewCount = pendingNewSupporting.length;
  const pendingTotal = pendingReplaceCount + pendingDeleteCount + pendingNewCount;

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>Application {APPLICATION_ID}</h2>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900 }}>
      <h2 style={{ marginBottom: 6 }}>Submitted Application</h2>
      <div style={{ color: "#555", marginBottom: 16 }}>
        Application ID: <b>{APPLICATION_ID}</b>
      </div>

      {error && (
        <div
          style={{
            background: "#ffe7e7",
            border: "1px solid #ffb3b3",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {/* Save bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={saveChanges}
          disabled={saving || pendingTotal === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: saving || pendingTotal === 0 ? "#f7f7f7" : "white",
            cursor: saving || pendingTotal === 0 ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {saving ? "Saving..." : `Save Changes${pendingTotal ? ` (${pendingTotal})` : ""}`}
        </button>

        {pendingTotal > 0 && (
          <div style={{ fontSize: 12, color: "#666" }}>
            Pending: {pendingReplaceCount} replace, {pendingDeleteCount} delete, {pendingNewCount} new
            supporting.
          </div>
        )}
      </div>

      {/* Application Info */}
      <section
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Application Details</h3>

        {!app ? (
          <p style={{ margin: 0 }}>No application data found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Business Name" value={app.business_name} />
            <Field label="Business Country" value={app.business_country} />
            <Field label="Status" value={app.status} />
            <Field label="User ID" value={app.user_id} />
            <Field label="Reviewer ID" value={app.reviewer_id} />
            <Field label="Last Edited" value={formatDate(app.last_edited)} />
          </div>
        )}
      </section>

      {/* Documents */}
      <section
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Documents</h3>

        <h4 style={{ marginBottom: 8 }}>Required</h4>
        <DocRow
          title="Bank Statement"
          doc={requiredDocs.bank_statement}
          type="required"
          onOpen={openDoc}
          onReplaceClick={clickReplace}
          onPickReplaceFile={onPickReplaceFile}
          fileInputsRef={fileInputsRef}
          pendingReplace={!!pendingReplacements[requiredDocs.bank_statement?.document_id]}
          pendingDelete={!!pendingDeletes[requiredDocs.bank_statement?.document_id]}
          onUndoReplace={cancelPendingReplace}
          saving={saving}
        />
        <DocRow
          title="Business Registration"
          doc={requiredDocs.business_registration}
          type="required"
          onOpen={openDoc}
          onReplaceClick={clickReplace}
          onPickReplaceFile={onPickReplaceFile}
          fileInputsRef={fileInputsRef}
          pendingReplace={!!pendingReplacements[requiredDocs.business_registration?.document_id]}
          pendingDelete={!!pendingDeletes[requiredDocs.business_registration?.document_id]}
          onUndoReplace={cancelPendingReplace}
          saving={saving}
        />
        <DocRow
          title="Directors Info"
          doc={requiredDocs.directors_info}
          type="required"
          onOpen={openDoc}
          onReplaceClick={clickReplace}
          onPickReplaceFile={onPickReplaceFile}
          fileInputsRef={fileInputsRef}
          pendingReplace={!!pendingReplacements[requiredDocs.directors_info?.document_id]}
          pendingDelete={!!pendingDeletes[requiredDocs.directors_info?.document_id]}
          onUndoReplace={cancelPendingReplace}
          saving={saving}
        />

        <h4 style={{ marginTop: 18, marginBottom: 8 }}>Supporting</h4>

        {/* Add new supporting (staged) */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <button
            onClick={clickAddSupporting}
            disabled={saving}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: saving ? "#f7f7f7" : "white",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            + Add supporting document(s)
          </button>

          <input
            ref={addSupportingRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            style={{ display: "none" }}
            onChange={(e) => onPickNewSupportingFiles(e.target.files)}
          />

          {pendingNewCount > 0 && (
            <div style={{ fontSize: 12, color: "#666" }}>
              {pendingNewCount} new supporting file(s) staged (not saved yet).
            </div>
          )}
        </div>

        {/* Staged new supporting list */}
        {pendingNewSupporting.length > 0 && (
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {pendingNewSupporting.map((x, idx) => (
              <div
                key={x.id}
                style={{
                  border: "1px dashed #e5e5e5",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: "#0f766e" }}>
                    New supporting (staged) #{idx + 1}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {x.file?.name || "file"} • application/pdf
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => viewPendingNewSupporting(x.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => removePendingNewSupporting(x.id)}
                    disabled={saving}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: saving ? "#f7f7f7" : "white",
                      cursor: saving ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Existing supporting docs */}
        {supportingDocs.length === 0 ? (
          <p style={{ margin: 0, color: "#666" }}>No supporting documents.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {supportingDocs.map((d, idx) => (
              <DocRow
                key={d.document_id}
                title={`Supporting ${idx + 1}`}
                doc={d}
                type="supporting"
                onOpen={openDoc}
                onReplaceClick={clickReplace}
                onPickReplaceFile={onPickReplaceFile}
                fileInputsRef={fileInputsRef}
                pendingReplace={!!pendingReplacements[d.document_id]}
                pendingDelete={!!pendingDeletes[d.document_id]}
                onUndoReplace={cancelPendingReplace}
                onToggleDelete={toggleDeleteSupporting}
                saving={saving}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ padding: 10, border: "1px solid #f2f2f2", borderRadius: 10 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 600 }}>
        {value === null || value === undefined || value === "" ? "-" : String(value)}
      </div>
    </div>
  );
}

function DocRow({
  title,
  doc,
  type, // "required" | "supporting"
  onOpen,
  onReplaceClick,
  onPickReplaceFile,
  fileInputsRef,
  pendingReplace,
  pendingDelete,
  onUndoReplace,
  onToggleDelete, // only for supporting
  saving,
}) {
  const hasDoc = !!doc;
  const docId = doc?.document_id;

  const disabled = !hasDoc || saving;

  return (
    <div
      style={{
        border: "1px solid #f2f2f2",
        borderRadius: 10,
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        opacity: pendingDelete ? 0.6 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>

        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
          {hasDoc
            ? `${doc.original_filename || "uploaded file"} • ${doc.mime_type || ""} • ${formatDate(
                doc.created_at
              )}`
            : "Not uploaded"}
        </div>

        {pendingReplace && (
          <div style={{ fontSize: 12, color: "#b45309", marginTop: 4, fontWeight: 800 }}>
            Pending replacement (not saved)
          </div>
        )}

        {pendingDelete && (
          <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4, fontWeight: 900 }}>
            Marked for deletion (will delete on Save)
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          disabled={!hasDoc || pendingDelete}
          onClick={() => hasDoc && !pendingDelete && onOpen(doc.document_id)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: !hasDoc || pendingDelete ? "#f7f7f7" : "white",
            cursor: !hasDoc || pendingDelete ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          View
        </button>

        <button
          disabled={disabled || pendingDelete}
          onClick={() => hasDoc && !pendingDelete && onReplaceClick(doc.document_id)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: disabled || pendingDelete ? "#f7f7f7" : "white",
            cursor: disabled || pendingDelete ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          Replace
        </button>

        {pendingReplace && (
          <button
            disabled={saving}
            onClick={() => docId && onUndoReplace(docId)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: saving ? "#f7f7f7" : "white",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            Undo replace
          </button>
        )}

        {/* Supporting-only delete / undo delete */}
        {type === "supporting" && (
          <>
            {!pendingDelete ? (
              <button
                disabled={disabled}
                onClick={() => docId && onToggleDelete?.(docId, true)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: disabled ? "#f7f7f7" : "white",
                  cursor: disabled ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Delete
              </button>
            ) : (
              <button
                disabled={saving}
                onClick={() => docId && onToggleDelete?.(docId, false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: saving ? "#f7f7f7" : "white",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                Undo delete
              </button>
            )}
          </>
        )}

        {/* Hidden file input (replace) */}
        {hasDoc && (
          <input
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: "none" }}
            ref={(el) => {
              if (el) fileInputsRef.current[doc.document_id] = el;
            }}
            onChange={(e) => onPickReplaceFile(doc.document_id, e.target.files?.[0])}
          />
        )}
      </div>
    </div>
  );
}
