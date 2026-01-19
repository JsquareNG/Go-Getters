import React from "react";
import AccountsGrid from "../components/ui/AccountsGrid";
import TransactionsTable from "../components/ui/TransactionsTable";

const AccountsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8">
        <AccountsGrid />
        <TransactionsTable />
      </main>
    </div>
  );
};

export default AccountsPage;
