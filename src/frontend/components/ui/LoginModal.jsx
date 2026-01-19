import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "./button";
import { Input } from "./input"
import { Label } from "./label";
import { Separator } from "./separator";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

// Mock database of registered SME users (replace with real API/database)
const MOCK_USERS = [
  { email: "admin@sme.com", password: "Password123!", companyName: "SME Corp" },
  { email: "test@company.com", password: "Test1234!", companyName: "Test Company" },
];

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  // Validate login form
  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login submission
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      // Check if user exists in mock database
      const user = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );

      if (!user) {
        // User not found - prompt to register
        setIsLoading(false);
        toast({
          title: "Account Not Found",
          description: "No account exists with this email. Please create a new account.",
          variant: "destructive",
        });
        setErrors({
          email: "No account found with this email address",
        });
        return;
      }

      if (user.password !== password) {
        // Wrong password
        setIsLoading(false);
        toast({
          title: "Invalid Credentials",
          description: "The password you entered is incorrect. Please try again.",
          variant: "destructive",
        });
        setErrors({
          password: "Incorrect password. Please try again.",
        });
        return;
      }

      // Login successful - proceed to OTP verification
      setIsLoading(false);
      onClose();
      toast({
        title: "Verification Required",
        description: "Please enter the OTP sent to your email.",
      });
      navigate("/landingpage", {
        state: {
          email: email,
          companyName: user.companyName,
          redirectTo: "/dashboard",
        },
      });
    }, 1500);
  };

  // Handle Google authentication
  const handleGoogleAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onClose();
      toast({
        title: "Google Sign-In",
        description: "Please verify with OTP.",
      });
      navigate("/otp-verify", {
        state: {
          email: "user@gmail.com",
          isGoogle: true,
          redirectTo: "/dashboard",
        },
      });
    }, 1000);
  };

  // Reset form when modal closes
  const handleOpenChange = (open) => {
    if (!open) {
      setEmail("");
      setPassword("");
      setErrors({});
      onClose();
    }
  };

  // Error message component
  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <div className="flex items-center gap-1 text-destructive text-sm mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{message}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl p-8 md:p-10">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">Welcome Back</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to your SME account to continue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="modal-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="modal-email"
                type="email"
                placeholder="your@company.com"
                className={`pl-10 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
              />
            </div>
            <ErrorMessage message={errors.email} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="modal-password">Password</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() =>
                  toast({
                    title: "Reset Password",
                    description: "Password reset functionality coming soon.",
                  })
                }
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="modal-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`pl-10 pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <ErrorMessage message={errors.password} />
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-sm font-medium text-gray-500">
            OR
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          onClick={handleGoogleAuth}
          disabled={isLoading}
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Demo credentials hint */}
        <div className="mt-2 p-2 bg-muted/50 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            <strong>Demo:</strong> admin@sme.com / Password123!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;