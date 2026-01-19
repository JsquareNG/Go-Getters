import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Shield, Zap, Globe } from "lucide-react";
import LoginModal from "../components/ui/LoginModal"

const Home = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

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

            {/* Right Content - Registration Form Preview */}
            <div className="relative animate-scale-in">
              <div className="card-elevated p-8">
                <h3 className="text-xl font-semibold text-red-500 mb-6">
                  Register
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Name
                    </label>
                    <div className="h-11 bg-secondary rounded-md border border-border"></div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <div className="h-11 bg-secondary rounded-md border border-border"></div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <div className="h-11 bg-secondary rounded-md border border-border"></div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border border-border rounded bg-background"></div>
                    <span>I agree to Terms, Privacy Policy and Fees</span>
                  </div>

                  <Button className="w-full" size="lg">
                    Register
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary cursor-pointer hover:underline font-medium"
                    onClick={() => setIsLoginOpen(true)}
                  >
                    Login
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

      {/* ✅ Your shadcn Dialog-based login modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          // optional: open your register modal here if you have one
          // e.g. setIsRegisterOpen(true)
        }}
      />
    </>
  );
};

export default Home;
