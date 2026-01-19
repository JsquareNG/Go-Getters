import React from "react";
import {
  LayoutGrid,
  Wallet,
  User,
  Bell,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Avatar, AvatarFallback } from "./avatar";
import { Button } from "./button";
import dbslogo from "../../assets/dbslogo.png";

const Navbar = () => {
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutGrid, label: "Applications", to: "/landingpage" },
    { icon: Wallet, label: "Accounts", to: "/accountspage" },
  ];

  const handleLogout = () => {
    // OPTIONAL (future-proofing):
    // localStorage.removeItem("authToken");
    // sessionStorage.clear();

    navigate("/"); // Redirect to Home page
  };

  const handleProfile = () => {
    // OPTIONAL (future-proofing):
    // localStorage.removeItem("authToken");
    // sessionStorage.clear();

    navigate("/profile"); // Redirect to Home page
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <img
            src={dbslogo}
            alt="DBS SME Logo"
            className="h-6 w-auto"
          />

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "nav-item-active" : ""}`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </button>

            {/* Logout */}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-2 gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                    JC
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline-block">John Chen</span>
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
    </header>
  );
};

export default Navbar;
