import React from "react";
import {
  LayoutGrid,
  Wallet,
  ArrowLeftRight,
  Globe,
  User,
  Bell,
  LogOut,
} from "lucide-react";
import dbslogo from "../../assets/dbslogo.png"

const Navbar = () => {
  const navItems = [
    { icon: LayoutGrid, label: "Overview", href: "#overview", active: false },
    { icon: Wallet, label: "Accounts", href: "#accounts", active: true },
    {
      icon: ArrowLeftRight,
      label: "Transactions",
      href: "#transactions",
      active: false,
    },
    {
      icon: Globe,
      label: "Cross-Border",
      href: "#crossborder",
      active: false,
    },
    { icon: User, label: "Profile", href: "#profile", active: false },
  ];

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
              <a
                key={item.label}
                href={item.href}
                className={`nav-item ${
                  item.active ? "nav-item-active" : ""
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </button>

            <button className="nav-item text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
