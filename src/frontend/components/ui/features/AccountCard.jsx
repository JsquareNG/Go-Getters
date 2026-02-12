import React, { useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "../primitives/Button";

const AccountCard = ({ account }) => {
  const [showBalance, setShowBalance] = useState(true);

  if (account.isAddCard) {
    return (
      <div className="account-card flex flex-col items-center justify-center min-h-[160px] border-dashed cursor-pointer hover:border-accent transition-colors before:hidden">
        <Plus className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">Add Account</p>
        <p className="text-lg font-bold text-muted-foreground mt-2">
          {account.currency} 00,000.00
        </p>
      </div>
    );
  }

  return (
    <div className="account-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-accent font-medium text-sm">{account.name}</h3>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {showBalance ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-2xl font-bold text-foreground mb-4">
        {account.currency} {showBalance ? account.balance : "••••••"}
      </p>

      {account.country && (
        <p className="text-xs text-muted-foreground mb-3">{account.country}</p>
      )}
    </div>
  );
};

export { AccountCard };
