import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Globe,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

const accountTypes = [
  {
    id: "sme-business",
    icon: Building2,
    title: "SME Business Account",
    description:
      "For small and medium enterprises looking for comprehensive banking solutions",
    features: ["Multi-currency support", "Online banking", "Business debit card"],
  },
  {
    id: "cross-border",
    icon: Globe,
    title: "Cross-Border Payments",
    description:
      "Streamlined international payments for businesses with global operations",
    features: ["Competitive FX rates", "Fast transfers", "150+ countries"],
  },
  {
    id: "multi-currency",
    icon: CreditCard,
    title: "Multi-Currency Account",
    description:
      "Hold, send and receive money in multiple currencies from one account",
    features: ["12 currencies", "Real-time conversion", "No hidden fees"],
  },
  {
    id: "ecommerce",
    icon: Briefcase,
    title: "E-Commerce Account",
    description:
      "Tailored solutions for online businesses and digital merchants",
    features: ["Payment gateway", "Settlement reports", "API integration"],
  },
];

export default function NewApplication() {
  const navigate = useNavigate();

  const handleSelectType = (typeId) => {
    // In a real app, this would start the application flow
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 animate-fade-in">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/landingpage")}
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>

        {/* Page Header */}
        <div className="max-w-2xl mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Create New Application
          </h1>
          <p className="text-muted-foreground">
            Select the type of account you'd like to open. Each account type is
            designed to meet specific business needs.
          </p>
        </div>

        {/* Account Type Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          {accountTypes.map((type, index) => (
            <Card
              key={type.id}
              className="group cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:border-primary/30 animate-fade-in"
              style={{ animationDelay: `${index * 75}ms` }}
              onClick={() => handleSelectType(type.id)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <type.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {type.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {type.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {type.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary group-hover:bg-primary/10"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Not sure which account type is right for you?{" "}
            <button className="text-primary hover:underline font-medium">
              Contact our business advisors
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
