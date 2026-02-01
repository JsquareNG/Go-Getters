import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function extractSignedUrl(obj) {
  return (
    obj?.signedUrl ||
    obj?.signedURL ||
    obj?.url ||
    obj?.data?.signedUrl ||
    obj?.data?.signedURL ||
    obj?.data?.url ||
    null
  );
}

function prettyBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function TestDocumentMulti() {
  // ---------------------------
  // Application fields
  // ---------------------------
  const [business_country, setBusinessCountry] = useState("Singapore");
  const [business_name, setBusinessName] = useState("Demo Pte Ltd");
  const [user_id, setUserId] = useState("00000001");
  const [reviewer_id, setReviewerId] = useState("00000002");

  // After submit
  const [applicationId, setApplicationId] = useState(null);
  const [msg, setMsg] = useState("");

  // ---------------------------
  // Required sections (these keys MUST match your backend REQUIRED_TYPES)
  // ---------------------------
  const REQUIRED_SECTIONS = [
    { key: "bank_statement", label: "Section 1: Bank Statement (Required)" },
    { key: "business_registration", label: "Section 2: Business Registration (Required)" },
    { key: "directors_info", label: "Section 3: Directors’ Info (Required)" },
  ];

  // Local-only docs until submit
  const [requiredFiles, setRequiredFiles] = useState(() => {
    const init = {};
    for (const s of REQUIRED_SECTIONS) init[s.key] = { file: null, blobUrl: null };
    return init;
  });
  const [supportingFiles, setSupportingFiles] = useState([]); // [{id, file, blobUrl}]

  const requiredInputRefs = useRef({});
  const supportingInputRef = useRef(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(requiredFiles).forEach((v) => v?.blobUrl && URL.revokeObjectURL(v.blobUrl));
      supportingFiles.forEach((x) => x?.blobUrl && URL.revokeObjectURL(x.blobUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ensurePdf(file) {
    if (!file) return false;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return false;
    }
    return true;
  }

  function openBlob(blobUrl) {
    if (!blobUrl) return;
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  }

  function setRequiredFile(sectionKey, file) {
    if (!ensurePdf(file)) return;

    setRequiredFiles((prev) => {
      const existing = prev[sectionKey];
      if (existing?.blobUrl) URL.revokeObjectURL(existing.blobUrl);
      return { ...prev, [sectionKey]: { file, blobUrl: URL.createObjectURL(file) } };
    });

    setMsg(`Selected "${file.name}" for ${sectionKey} (local only).`);
  }

  function clearRequiredFile(sectionKey) {
    setRequiredFiles((prev) => {
      const existing = prev[sectionKey];
      if (existing?.blobUrl) URL.revokeObjectURL(existing.blobUrl);
      return { ...prev, [sectionKey]: { file: null, blobUrl: null } };
    });
    const input = requiredInputRefs.current[sectionKey];
    if (input) input.value = "";
  }

  function addSupportingFiles(fileList) {
    const files = Array.from(fileList || []);
    const pdfs = files.filter((f) => ensurePdf(f));
    if (pdfs.length === 0) return;

    setSupportingFiles((prev) => [
      ...prev,
      ...pdfs.map((f) => ({
        id: crypto?.randomUUID?.() || `${Date.now()}_${Math.random()}`,
        file: f,
        blobUrl: URL.createObjectURL(f),
      })),
    ]);

    if (supportingInputRef.current) supportingInputRef.current.value = "";
    setMsg(`Added ${pdfs.length} supporting document(s) (local only).`);
  }

  function removeSupportingFile(id) {
    setSupportingFiles((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.blobUrl) URL.revokeObjectURL(item.blobUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  function validateBeforeSubmit() {
    const missing = REQUIRED_SECTIONS.filter((s) => !requiredFiles[s.key]?.file);
    if (missing.length > 0) {
      setMsg(
        `Missing required document(s):\n- ${missing.map((m) => m.label).join("\n- ")}`
      );
      return false;
    }
    return true;
  }

  async function persistOneDocument({ appId, document_type, file }) {
    const initRes = await fetch(`${API_BASE}/documents/init-persist-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: appId,
        document_type,          // <-- IMPORTANT: this determines the storage name
        filename: file.name,
        mime_type: file.type,
      }),
    });

    if (!initRes.ok) {
      const t = await initRes.text();
      throw new Error(`init-persist-upload failed (${document_type}): ${t}`);
    }

    const initData = await initRes.json();
    const uploadUrl = extractSignedUrl(initData.signed_upload);
    if (!uploadUrl) throw new Error(`Could not parse signed upload URL (${document_type}).`);

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!putRes.ok) {
      const t = await putRes.text();
      throw new Error(`Storage PUT upload failed (${document_type}): ${putRes.status} ${t}`);
    }

    const confirmRes = await fetch(`${API_BASE}/documents/confirm-persist-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: initData.document_id }),
    });

    if (!confirmRes.ok) {
      const t = await confirmRes.text();
      throw new Error(`confirm-persist-upload failed (${document_type}): ${t}`);
    }

    return initData;
  }

  async function handleSubmitApplication() {
    console.log("✅ handleSubmitApplication clicked");
    setMsg("");

    if (!validateBeforeSubmit()) {
      console.log("❌ validation failed");
      return;
    }
    console.log("✅ validation passed, going to POST /applications/submit");


    try {
      setMsg("Creating application...");

      // 1) create application
      const submitRes = await fetch(`${API_BASE}/applications/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_country,
          business_name,
          user_id,
          reviewer_id,
        }),
      });

      if (!submitRes.ok) {
        const t = await submitRes.text();
        throw new Error(`Submit application failed: ${t}`);
      }

      const submitData = await submitRes.json();
      const newAppId = submitData.application_id;
      setApplicationId(newAppId);

      // 2) Upload required docs with their OWN section names
      setMsg("Uploading required documents...");
      for (const s of REQUIRED_SECTIONS) {
        const f = requiredFiles[s.key].file;
        await persistOneDocument({ appId: newAppId, document_type: s.key, file: f });
      }

      // 3) Upload supporting docs as "supporting"
      if (supportingFiles.length > 0) {
        setMsg(`Uploading ${supportingFiles.length} supporting document(s)...`);
        for (let i = 0; i < supportingFiles.length; i++) {
          await persistOneDocument({
            appId: newAppId,
            document_type: "supporting", // backend will name supporting_1, supporting_2, ...
            file: supportingFiles[i].file,
          });
          setMsg(`Uploaded supporting document ${i + 1}/${supportingFiles.length}...`);
        }
      }

      setMsg(
        `Submitted! application_id=${newAppId}. Uploaded 3 required doc(s)` +
          (supportingFiles.length ? ` + ${supportingFiles.length} supporting doc(s).` : ".")
      );
    } catch (err) {
      setMsg(err?.message || "Submit failed.");
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "32px auto", fontFamily: "Arial, sans-serif" }}>
      <h2>Upload 3 Required Sections + Supporting (Persist on Submit)</h2>

      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 12, display: "grid", gap: 14 }}>
        {/* A) App fields */}
        <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>A) Application Fields</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            Business Country
            <input
              value={business_country}
              onChange={(e) => setBusinessCountry(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            Business Name
            <input
              value={business_name}
              onChange={(e) => setBusinessName(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "block" }}>
              User ID
              <input
                value={user_id}
                onChange={(e) => setUserId(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>

            <label style={{ display: "block" }}>
              Reviewer ID
              <input
                value={reviewer_id}
                onChange={(e) => setReviewerId(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>
          </div>
        </section>

        {/* B) Required docs */}
        <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>B) Required Documents</h3>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>
            These 3 files are uploaded with document_type equal to the section name:
            <code> bank_statement</code>, <code> business_registration</code>, <code> directors_info</code>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {REQUIRED_SECTIONS.map((s) => {
              const current = requiredFiles[s.key];
              return (
                <div
                  key={s.key}
                  style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        stored as: <code>{s.key}.pdf</code>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={() => openBlob(current?.blobUrl)}
                        disabled={!current?.blobUrl}
                        style={{ padding: "8px 10px", cursor: current?.blobUrl ? "pointer" : "not-allowed" }}
                      >
                        View (local)
                      </button>

                      <button
                        onClick={() => requiredInputRefs.current[s.key]?.click?.()}
                        style={{ padding: "8px 10px", cursor: "pointer" }}
                      >
                        Upload / Replace
                      </button>

                      <button
                        onClick={() => clearRequiredFile(s.key)}
                        disabled={!current?.file}
                        style={{ padding: "8px 10px", cursor: current?.file ? "pointer" : "not-allowed" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <input
                    ref={(el) => (requiredInputRefs.current[s.key] = el)}
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) setRequiredFile(s.key, f);
                      e.target.value = "";
                    }}
                  />

                  <div style={{ fontSize: 13, color: "#444" }}>
                    {current?.file ? (
                      <>
                        Selected: <b>{current.file.name}</b> ({prettyBytes(current.file.size)})
                      </>
                    ) : (
                      <span style={{ color: "#b00" }}>No file selected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* C) Supporting */}
        <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>C) Supporting Documents (optional)</h3>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>
            These upload with <code>document_type="supporting"</code> and backend stores as{" "}
            <code>supporting_1.pdf</code>, <code>supporting_2.pdf</code>, ...
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <button
              onClick={() => supportingInputRef.current?.click?.()}
              style={{ padding: "8px 10px", cursor: "pointer" }}
            >
              Add supporting document(s)
            </button>

            <input
              ref={supportingInputRef}
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: "none" }}
              onChange={(e) => addSupportingFiles(e.target.files)}
            />

            <div style={{ fontSize: 13, color: "#444" }}>
              Count: <b>{supportingFiles.length}</b>
            </div>
          </div>

          {supportingFiles.length === 0 ? (
            <div style={{ fontSize: 13, color: "#666" }}>No supporting documents added.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {supportingFiles.map((x, idx) => (
                <div
                  key={x.id}
                  style={{
                    border: "1px solid #f0f0f0",
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>
                      Supporting (local) #{idx + 1}: {x.file.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {prettyBytes(x.file.size)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => openBlob(x.blobUrl)}
                      style={{ padding: "8px 10px", cursor: "pointer" }}
                    >
                      View (local)
                    </button>

                    <button
                      onClick={() => removeSupportingFile(x.id)}
                      style={{ padding: "8px 10px", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* D) Submit */}
        <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>D) Submit</h3>

          <button onClick={handleSubmitApplication} style={{ padding: 12, cursor: "pointer" }}>
            Submit Application (upload all documents)
          </button>

          {applicationId && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#444" }}>
              Submitted Application ID: <b>{applicationId}</b>
            </div>
          )}

          {msg && (
            <div style={{ marginTop: 10, background: "#f6f6f6", padding: 10, borderRadius: 8, whiteSpace: "pre-wrap" }}>
              {msg}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
