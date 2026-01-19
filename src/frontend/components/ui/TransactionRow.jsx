import React from "react";
import { Plus, Minus } from "lucide-react";

const TransactionRow = ({ transaction }) => {
  const isPositive = transaction.type === "credit";

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "status-completed";
      case "pending":
        return "status-pending";
      case "canceled":
        return "status-canceled";
      default:
        return "status-pending";
    }
  };

  return (
    <tr className="border-b border-border hover:bg-secondary/50 transition-colors">
      <td className="py-4 px-4">
        <div
          className={
            isPositive
              ? "transaction-icon-positive"
              : "transaction-icon-negative"
          }
        >
          {isPositive ? (
            <Plus className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
        </div>
      </td>

      <td className="py-4 px-4">
        <div>
          <p className="font-medium text-foreground text-sm">
            {transaction.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {transaction.country}
          </p>
        </div>
      </td>

      <td className="py-4 px-4 text-sm text-muted-foreground">
        {transaction.type === "credit"
          ? "Incoming Transfer"
          : "Cross-Border Payment"}
      </td>

      <td className="py-4 px-4 text-sm text-muted-foreground">
        {transaction.date}
      </td>

      <td className="py-4 px-4 text-sm font-medium">
        <span className={isPositive ? "amount-positive" : "amount-negative"}>
          {isPositive ? "+" : "-"}
          {transaction.currency}
          {transaction.amount}
        </span>
      </td>

      <td className="py-4 px-4">
        <span className={`status-badge ${getStatusClass(transaction.status)}`}>
          {transaction.status}
        </span>
      </td>
    </tr>
  );
};

export default TransactionRow;
