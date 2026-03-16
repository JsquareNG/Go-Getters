import React from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import Toggle from "./common/Toggle";
import FieldError from "./common/FieldError";

function getErrorInputClass(hasError) {
  return `w-full rounded-lg border px-3 py-2 outline-none ${
    hasError
      ? "border-red-500 bg-red-50 focus:border-red-600"
      : "border-gray-300 bg-white focus:border-gray-900"
  }`;
}

export default function RuleTableRow({
  row,
  rowKey,
  expanded,
  onToggleExpand,
  onRuleFieldChange,
  onToggleRuleActive,
  onRemoveNewRule,
  ruleErrors = {},
  showValidation = false,
}) {
  const ruleCodeError = showValidation ? ruleErrors.rule_code : "";
  const ruleNameError = showValidation ? ruleErrors.rule_name : "";
  const descriptionError = showValidation ? ruleErrors.description : "";

  return (
    <tr className={`align-top ${row.isNew ? "bg-blue-50/40" : ""}`}>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onToggleExpand(rowKey)}
          className="rounded-lg p-1 text-gray-600 hover:bg-gray-100"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </td>

      <td className="px-4 py-3 font-medium text-gray-900">
        <div>
          {row.isNew ? (
            <input
              type="text"
              value={row.rule_code}
              onChange={(e) =>
                onRuleFieldChange(
                  rowKey,
                  "rule_code",
                  e.target.value.toUpperCase()
                )
              }
              className={getErrorInputClass(Boolean(ruleCodeError))}
              placeholder="Enter Rule Code"
            />
          ) : (
            <span>{row.rule_code}</span>
          )}
          <FieldError message={ruleCodeError} />
        </div>
      </td>

      <td className="px-4 py-3 text-gray-800">
        <div>
          {row.isNew ? (
            <input
              type="text"
              value={row.rule_name}
              onChange={(e) =>
                onRuleFieldChange(rowKey, "rule_name", e.target.value)
              }
              className={getErrorInputClass(Boolean(ruleNameError))}
              placeholder="Enter Rule Name"
            />
          ) : (
            <span>{row.rule_name}</span>
          )}
          <FieldError message={ruleNameError} />
        </div>
      </td>

      <td className="min-w-[320px] px-4 py-3 text-gray-600">
        <div>
          <textarea
            value={row.description || ""}
            onChange={(e) =>
              onRuleFieldChange(rowKey, "description", e.target.value)
            }
            rows={2}
            className={`w-full resize-none rounded-lg border px-3 py-2 outline-none ${
              descriptionError
                ? "border-red-500 bg-red-50 focus:border-red-600"
                : "border-gray-300 bg-white focus:border-gray-900"
            }`}
            placeholder="Enter Description"
          />
          <FieldError message={descriptionError} />
        </div>
      </td>

      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            row.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {row.is_active ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center">
          <Toggle
            checked={row.is_active}
            onChange={() => onToggleRuleActive(rowKey)}
          />
        </div>
      </td>

      <td className="px-4 py-3 text-center">
        {row.isNew ? (
          <button
            type="button"
            onClick={() => onRemoveNewRule(row)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"
            title="Remove new rule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}