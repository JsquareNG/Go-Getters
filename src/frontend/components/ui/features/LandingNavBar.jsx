import React from "react";
import {
  LayoutDashboard,
  LayoutGrid,
  FileSearch,
  Wallet,
  User,
  Bell,
  LogOut,
  Columns3Cog
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./DropdownMenu";
import { Avatar, AvatarFallback, Button } from "../primitives";
import dbslogo from "@/assets/dbslogo.png";

import { useDispatch, useSelector } from "react-redux";
import { selectUser, logout } from "@/store/authSlice";

const LandingNavBar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Access user data from Redux
  const user = useSelector(selectUser);
  const userRole = user?.role; // "STAFF" | "SME" | undefined

  // Define navigation items based on user roles
  const navItems = [
    {
      icon: FileSearch,
      label: "Staff Landing",
      to: "/staff-landingpage",
      roles: ["STAFF"],
    },
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      to: "/dashboard",
      roles: ["STAFF"],
    },
    {
      icon: Columns3Cog,
      label: "Admin Config",
      to: "/admin-config",
      roles: ["STAFF"],
    },
    {
      icon: LayoutGrid,
      label: "Applications",
      to: "/landingpage",
      roles: ["SME"],
    },
    {
      icon: Wallet,
      label: "Accounts",
      to: "/accountspage",
      roles: ["SME"],
    },
  ];

  // Filter items by current user role
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  // Helper function to get initials from first and last name if available
  const getInitials = () => {
    if (!user?.first_name) return "U";
    const firstInitial = user.first_name.charAt(0);
    const lastInitial = user.last_name ? user.last_name.charAt(0) : "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* LOGO: Left-aligned */}
          <img src={dbslogo} alt="DBS SME Logo" className="h-6 w-auto" />

          {/* RIGHT-ALIGNED GROUP: Nav + Notifications + Profile */}
          <div className="flex items-center gap-8">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-2">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-green-600 bg-green-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Notification and User Dropdown */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-3 px-2 hover:bg-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-bold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm font-semibold text-gray-700 md:inline-block">
                        {user?.first_name} {user?.last_name || ""}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <button
                      onClick={handleProfile}
                      className="nav-item text-muted-foreground hover:text-foreground"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <button
                      onClick={handleLogout}
                      className="nav-item text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export { LandingNavBar };
