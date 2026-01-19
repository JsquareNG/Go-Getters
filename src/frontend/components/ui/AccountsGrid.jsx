import React from "react";
import AccountCard from "./AccountCard";

const AccountsGrid = () => {
  const accounts = [
    {
      id: 1,
      name: "SGD Operating Account",
      balance: "125,800.00",
      currency: "S$",
      country: "Singapore",
    },
    {
      id: 2,
      name: "USD Trade Account",
      balance: "45,230.50",
      currency: "US$",
      country: "United States",
    },
    {
      id: 3,
      name: "EUR Business Account",
      balance: "32,150.00",
      currency: "€",
      country: "European Union",
    },
  ];

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-6">
        Accounts
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((account) => (
          <AccountCard
            key={account.id ?? "add"}
            account={account}
          />
        ))}
      </div>
    </section>
  );
};

export default AccountsGrid;
