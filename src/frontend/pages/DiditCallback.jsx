import React, { useEffect, useState } from "react";

export default function DiditCallback() {
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const verificationSessionId = params.get("verificationSessionId");
    const returnedStatus = params.get("status");

    setSessionId(verificationSessionId || "");
    setStatus(returnedStatus || "");

    if (verificationSessionId) {
      fetch(`http://127.0.0.1:8000/didit/session/${verificationSessionId}/decision`)
        .then((res) => res.json())
        .then((data) => {
          setDecision(data);
          setLoading(false);
        })
        .catch((err) => {
          setDecision({ error: err.message });
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: "24px", fontFamily: "Arial" }}>
      <h2>Didit Verification Result</h2>

      <p><strong>Session ID:</strong> {sessionId || "N/A"}</p>
      <p><strong>Redirect Status:</strong> {status || "N/A"}</p>

      {loading ? (
        <p>Loading final decision...</p>
      ) : (
        <>
          <h3>Decision Response</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "12px",
              borderRadius: "8px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(decision, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}