import React from "react";
import { ArrowRight } from "lucide-react";
import TransactionRow from "./TransactionRow";

const TransactionsTable = () => {
  const transactions = [
    {
      id: 1,
      name: "Alibaba Group Holdings",
      country: "China",
      type: "debit",
      date: "15 Jan 2024 - 14:32",
      amount: "15,000.00",
      currency: "US$",
      status: "Completed",
    },
    {
      id: 2,
      name: "Tokyo Electronics Co.",
      country: "Japan",
      type: "credit",
      date: "14 Jan 2024 - 09:15",
      amount: "8,500.00",
      currency: "US$",
      status: "Completed",
    },
    {
      id: 3,
      name: "Berlin Tech GmbH",
      country: "Germany",
      type: "debit",
      date: "13 Jan 2024 - 16:45",
      amount: "12,300.00",
      currency: "€",
      status: "Pending",
    },
    {
      id: 4,
      name: "Mumbai Textiles Ltd",
      country: "India",
      type: "credit",
      date: "12 Jan 2024 - 11:20",
      amount: "5,750.00",
      currency: "US$",
      status: "Completed",
    },
    {
      id: 5,
      name: "Sydney Imports Pty",
      country: "Australia",
      type: "debit",
      date: "11 Jan 2024 - 08:55",
      amount: "9,200.00",
      currency: "A$",
      status: "Canceled",
    },
    {
      id: 6,
      name: "London Trading Corp",
      country: "United Kingdom",
      type: "credit",
      date: "10 Jan 2024 - 15:10",
      amount: "18,400.00",
      currency: "£",
      status: "Completed",
    },
    {
      id: 7,
      name: "Seoul Manufacturing",
      country: "South Korea",
      type: "debit",
      date: "09 Jan 2024 - 13:25",
      amount: "7,800.00",
      currency: "US$",
      status: "Pending",
    },
  ];

  return (
    <section className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">
          Cross-Border Transactions
        </h2>

        <a
          className="flex items-center gap-1 text-accent text-sm font-medium hover:underline"
        >
          View All <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="py-3 px-4 w-12"></th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Beneficiary
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default TransactionsTable;
