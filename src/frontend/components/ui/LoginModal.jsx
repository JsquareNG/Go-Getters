import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

// Mock database of registered users
// TODO: replace with real API/database)
const MOCK_USERS = [
  {
    email: "admin@sme.com",
    password: "Password123!",
    companyName: "SME Corp",
    role: "sme",
  },
  {
    email: "staff@dbs.com",
    password: "Staff1234!",
    role: "dbs",
  },
  {
    email: "staff@yourapp.com",
    password: "Staff1234!",
    name: "Staff Account",
    role: "dbs",
  },
];

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Decide where to route based on role
const getLandingRoute = (role) => {
  if (role === "dbs") return "/staff-landingpage";
  return "/landingpage"; // default for SME users
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
  const handleLogin = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    setTimeout(() => {
      const user = MOCK_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );

      if (!user) {
        setIsLoading(false);
        toast({
          title: "Account Not Found",
          description: "No account exists with this email.",
          variant: "destructive",
        });
        setErrors({ email: "No account found with this email address" });
        return;
      }

      if (user.password !== password) {
        setIsLoading(false);
        toast({
          title: "Invalid Credentials",
          description: "Incorrect password. Please try again.",
          variant: "destructive",
        });
        setErrors({ password: "Incorrect password" });
        return;
      }

      //Login successful
      setIsLoading(false);
      onClose();

      // OPTIONAL: save user info (so you can check role elsewhere)
      localStorage.setItem(
        "authUser",
        JSON.stringify({
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          name: user.name,
        }),
      );

      toast({
        title: "Login Successful",
        description: `Welcome back${user.role === "staff" ? ", staff" : ""}!`,
      });

      // ✅ Role-based routing
      navigate(getLandingRoute(user.role));
    }, 1200);
  };

  // Handle Google authentication (mock)
  const handleGoogleAuth = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onClose();

      // In real life, Google sign-in response should tell you role from your backend.
      // For now, default to SME:
      const googleUser = { email: "googleuser@example.com", role: "sme" };
      localStorage.setItem("authUser", JSON.stringify(googleUser));

      toast({
        title: "Login Successful",
        description: "Signed in with Google.",
      });

      navigate(getLandingRoute(googleUser.role));
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
      <div className="flex items-center gap-1 text-red-500 text-sm mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{message}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl p-8 md:p-10">
        <DialogHeader className="space-y-2 mb-4">
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome Back
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Sign in to your account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-6 mt-6">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="modal-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="modal-email"
                type="email"
                placeholder="your@company.com"
                className={`pl-10 h-12 ${
                  errors.email
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
              />
            </div>
            <ErrorMessage message={errors.email} />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="modal-password">Password</Label>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="modal-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`pl-10 pr-10 h-12 ${
                  errors.password
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <ErrorMessage message={errors.password} />

            <button
              type="button"
              className="text-xs text-red-500 hover:underline"
              onClick={() =>
                toast({
                  title: "Forgot Password",
                  description: "Password reset coming soon.",
                })
              }
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-red-500 hover:bg-red-600"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
