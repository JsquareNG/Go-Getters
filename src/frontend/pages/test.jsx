import React, { useState } from "react";

export default function DiditKycTest() {
  const [applicationId, setApplicationId] = useState("APP-0001");
  const [sessionId, setSessionId] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startVerification = async () => {
    console.log("Start button clicked");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/didit/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application_id: applicationId,
        }),
      });

      console.log("Backend response status:", response.status);

      const data = await response.json();
      console.log("Backend response data:", data);

      setSessionId(data.session_id || "");
      setVerificationUrl(data.verification_url || "");
      setResult(data);

      if (data.verification_url) {
        window.location.href = data.verification_url;
      } else {
        alert("No verification_url returned. Check console and backend logs.");
      }
    } catch (error) {
      console.error("Frontend error:", error);
      setResult({ error: error.message });
    }

    setLoading(false);
  };

  const checkResult = async () => {
    if (!sessionId) {
      alert("No session yet");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/didit/session/${sessionId}/decision`
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial" }}>
      <h2>Didit NRIC + Video Liveness Test</h2>

      <div style={{ marginBottom: "12px" }}>
        <label>Application ID</label>
        <br />
        <input
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          style={{ padding: "8px", width: "280px" }}
        />
      </div>

      <button onClick={startVerification} disabled={loading}>
        {loading ? "Creating session..." : "Start KYC Verification"}
      </button>

      <button
        onClick={checkResult}
        disabled={!sessionId}
        style={{ marginLeft: "10px" }}
      >
        Check Result
      </button>

      {verificationUrl && (
        <div style={{ marginTop: "16px" }}>
          <p>Session ID: {sessionId}</p>
          <pre style={{ background: "#f4f4f4", padding: "12px" }}>
            {verificationUrl}
          </pre>
        </div>
      )}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>Result</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "12px",
              borderRadius: "8px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}