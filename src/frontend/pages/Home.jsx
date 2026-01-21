import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import {
  Shield,
  Zap,
  Globe,
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

// Mock database of registered SME users (TODO: replace with real API/database)
const MOCK_USERS = [
  { email: "admin@sme.com", password: "Password123!" },
  {
    email: "staff@dbs.com",
    password: "Staff1234!",
  },
];

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState("login"); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    agree: false,
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

    if (mode === "register" && !formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (mode === "register" && !formData.agree) {
      newErrors.agree = "You must agree to the terms";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    if (mode === "login") {
      // Mock login - check only email for prototype simplicity**
      const user = MOCK_USERS.find((u) => u.email === formData.email);
      if (user) {
        toast({
          title: "Login successful",
          description: `Welcome back, ${user.companyName}!`,
        });
        // Set auth user in localStorage
        const role = user.email === "admin@sme.com" ? "sme" : "dbs";
        localStorage.setItem(
          "authUser",
          JSON.stringify({
            email: user.email,
            role,
            companyName: user.companyName,
          }),
        );
        // Navigate based on role
        if (role === "sme") {
          navigate("/landingpage");
        } else {
          navigate("/staff-landingpage");
        }
      } else {
        setErrors({ general: "Invalid email or password" });
      }
    } else {
      // Mock register
      const existingUser = MOCK_USERS.find((u) => u.email === formData.email);
      if (existingUser) {
        setErrors({ general: "Email already registered" });
      } else {
        toast({
          title: "Registration successful",
          description: "Your account has been created!",
        });
        // Set auth user for new registration (assume SME role)
        localStorage.setItem(
          "authUser",
          JSON.stringify({
            email: formData.email,
            role: "sme",
            companyName: formData.name,
          }),
        );
        navigate("/landingpage");
        setMode("login");
        setFormData({ name: "", email: "", password: "", agree: false });
      }
    }

    setIsLoading(false);
  };

  return (
    <>
      <section className="pt-24 pb-16 md:pt-8 md:pb-24 bg-gradient-to-b from-secondary/50 to-background">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse-soft"></span>
                SME Cross-Border Payments
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Experience <span className="text-red-500">hassle-free</span>{" "}
                banking
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                Experience simple, secure, and stress-free banking. Say goodbye
                to long queues and complex procedures and hello to hassle-free
                banking with DBS Bank.
              </p>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm">Bank-grade security</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-sm">Fast processing</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="text-sm">Global reach</span>
                </div>
              </div>
            </div>

            {/* Right Content - Login/Register Form */}
            <div className="relative animate-scale-in">
              <div className="card-elevated p-8">
                <h3 className="text-xl font-semibold text-red-500 mb-6">
                  {mode === "login" ? "Login" : "Register"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "register" && (
                    <div>
                      <Label
                        htmlFor="name"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.name}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
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
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
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

                  {mode === "register" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        id="agree"
                        checked={formData.agree}
                        onChange={(e) =>
                          handleInputChange("agree", e.target.checked)
                        }
                        className="w-4 h-4 border border-border rounded bg-background"
                      />
                      <Label htmlFor="agree" className="cursor-pointer">
                        I agree to Terms, Privacy Policy and Fees
                      </Label>
                    </div>
                  )}
                  {errors.agree && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.agree}
                    </p>
                  )}

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
                  >
                    {isLoading
                      ? "Processing..."
                      : mode === "login"
                        ? "Login"
                        : "Register"}
                  </Button>
                </form>

                <Separator className="my-6" />

                <p className="text-center text-sm text-muted-foreground">
                  {mode === "login"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    className="text-primary cursor-pointer hover:underline font-medium"
                    onClick={() => {
                      setMode(mode === "login" ? "register" : "login");
                      setErrors({});
                      setFormData({
                        name: "",
                        email: "",
                        password: "",
                        agree: false,
                      });
                    }}
                  >
                    {mode === "login" ? "Register" : "Login"}
                  </button>
                </p>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent rounded-full opacity-60 blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full opacity-60 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
