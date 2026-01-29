import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Separator } from "./separator";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
// import { useToast } from "../../hooks/use-toast";
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../api/usersApi";

// Mock database of registered SME users (replace with real API/database)
// const MOCK_USERS = [
//   { email: "admin@sme.com", password: "Password123!", companyName: "SME Corp" },
//   {
//     email: "test@company.com",
//     password: "Test1234!",
//     companyName: "Test Company",
//   },
// ];

const LoginForm = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  // const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const data = await loginUser(formData.email, formData.password);

      toast({
        title: "Login successful",
        description: `Welcome back, ${data.first_name}!`,
      });
      //TODO: to be changed to state management later
      localStorage.setItem(
        "authUser",
        JSON.stringify({
          user_id: data.user_id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role, // sme or staff
        }),
      );

      // Navigate based on role
      if (role === "sme") {
        navigate("/landingpage");
      } else if (role === "staff") {
        navigate("/staff-landingpage");
      } else {
        navigate("/"); // fallback
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Invalid email or password";

      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label
          htmlFor="email"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Email Address *
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
          />
        </div>
        {errors.email && (
          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <Label
          htmlFor="password"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Password *
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.password}
          </p>
        )}
      </div>

      {errors.general && (
        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {errors.general}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isLoading}
        onClick={handleSubmit}
      >
        {isLoading ? "Logging In..." : "Log In"}
      </Button>

      <Separator className="my-6" />

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button
          type="button"
          className="text-primary cursor-pointer hover:underline font-medium"
          onClick={onSwitchToRegister}
        >
          Register
        </button>
      </p>
    </div>
  );
};

export default LoginForm;
