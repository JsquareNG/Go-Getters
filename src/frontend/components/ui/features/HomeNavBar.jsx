import React, { useState } from "react";
import { Button } from "../primitives";
import { Menu, X } from "lucide-react";
import dbslogo from "@/assets/dbslogo.png";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="section-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="w-auto h-8 bg-primary rounded flex items-center justify-center">
                <img src={dbslogo} alt="DBS SME Logo" className="h-6 w-auto" />
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                How It Works
              </a>
              <a
                href="#benefits"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Benefits
              </a>
              <a
                href="#contact"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Contact
              </a>

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button variant="outline" className="w-full">
                  Login
                </Button>
                <Button variant="default" className="w-full">
                  Get Started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export { Header };
