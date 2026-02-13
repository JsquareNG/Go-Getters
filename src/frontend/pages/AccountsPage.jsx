import React from "react";
import { AccountsGrid, TransactionsTable } from "@/components/ui/features";
// import TransactionsTable from "../components/ui/features/TransactionsTable";

const AccountsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12">
        <AccountsGrid />
        <TransactionsTable />
      </main>
    </div>
  );
};

export default AccountsPage;
