import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const LandingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { email, redirectTo } = location.state || {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">OTP Verification</h1>
        <p className="text-gray-600 mb-6">
          Enter the OTP sent to <strong>{email}</strong>
        </p>

        <Button
          className="w-full"
          onClick={() => navigate(redirectTo || "/")}
        >
          Verify & Continue
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;
