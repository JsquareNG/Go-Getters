import React, { useState } from "react";

export default function DiditKycTest() {
  const [applicationId, setApplicationId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startVerification = async () => {
    console.log("Start button clicked");

    setLoading(true);
    setResult(null);

    try {
      // application_id becomes OPTIONAL
      const payload = applicationId
        ? { application_id: applicationId }
        : {};

      console.log("Payload being sent:", payload);

      const response = await fetch(
        "http://127.0.0.1:8000/didit/create-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

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

      console.log("Decision data:", data);

      setResult(data);

    } catch (error) {
      console.error("Check result error:", error);
      setResult({ error: error.message });
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial" }}>
      <h2>Didit NRIC + Video Liveness Test</h2>

      <div style={{ marginBottom: "12px" }}>
        <label>Application ID (Optional)</label>
        <br />
        <input
          placeholder="Leave empty if no application yet"
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
          <p>
            <strong>Session ID:</strong> {sessionId}
          </p>

          <pre
            style={{
              background: "#f4f4f4",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
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