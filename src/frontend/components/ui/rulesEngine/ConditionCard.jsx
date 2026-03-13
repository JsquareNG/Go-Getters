import React from "react";
import { Trash2, Plus } from "lucide-react";
import Toggle from "./common/Toggle";

const FIELD_OPTIONS = [
  { value: "years_incorporated", label: "years_incorporated", kind: "number" },
  { value: "ownership_pct", label: "ownership_pct", kind: "number" },
  { value: "is_signatory", label: "is_signatory", kind: "boolean" },
  {
    value: "country_of_incorporation",
    label: "country_of_incorporation",
    kind: "list",
  },
  { value: "business_country", label: "business_country", kind: "list" },
  { value: "industry", label: "industry", kind: "list" },
];

const NUMERIC_OPERATOR_OPTIONS = [
  { code: "EQ", symbol: "=" },
  { code: "NE", symbol: "!=" },
  { code: "GT", symbol: ">" },
  { code: "GTE", symbol: ">=" },
  { code: "LT", symbol: "<" },
  { code: "LTE", symbol: "<=" },
];

const LIST_OPTIONS = [
  { value: "HIGH_RISK_COUNTRIES", label: "High Risk Countries" },
  { value: "FATF_BLACKLIST", label: "FATF Blacklist" },
  { value: "HIGH_RISK_INDUSTRIES", label: "High Risk Industries" },
];

function getConditionKey(condition) {
  return condition.condition_id ?? condition.__tempId;
}

function getRuleFlowMode(conditions = []) {
  if (conditions.length <= 1) return null;
  const second = conditions[1];
  if (!second) return null;
  return second.uiConnector === "AND" ? "AND" : "BRANCH";
}

function getFieldMeta(fieldName) {
  return FIELD_OPTIONS.find((item) => item.value === fieldName) || null;
}

export default function ConditionCard({
  condition,
  index,
  totalConditions,
  allConditions,
  onConditionTypeChange,
  onConditionFieldChange,
  onToggleConditionActive,
  onRemoveCondition,
  onAddCondition,
}) {
  const conditionKey = getConditionKey(condition);
  const ruleFlowMode = getRuleFlowMode(allConditions);
  const firstCondition = allConditions[0];
  const firstFieldName = firstCondition?.field_name || "";
  const isFirst = index === 0;
  const isLast = index === totalConditions - 1;
  const isElse = condition.branchType === "ELSE";
  const isAndRow = !isFirst && condition.uiConnector === "AND";
  const isBranchRow = !isFirst && condition.uiConnector !== "AND";

  const effectiveFieldName =
    isBranchRow ? firstFieldName || condition.field_name : condition.field_name;

  const fieldMeta = getFieldMeta(effectiveFieldName);
  const isNumeric = fieldMeta?.kind === "number";
  const isBoolean = fieldMeta?.kind === "boolean";
  const isList = fieldMeta?.kind === "list";

  const lastConditionIsElse =
    totalConditions > 0 &&
    allConditions[totalConditions - 1]?.branchType === "ELSE";

  let conditionTypeOptions = [];
  if (!isFirst) {
    if (index === 1) {
      conditionTypeOptions = isLast
        ? [
            { value: "AND", label: "AND" },
            { value: "ELSE_IF", label: "Else If" },
            { value: "ELSE", label: "Else" },
          ]
        : [
            { value: "AND", label: "AND" },
            { value: "ELSE_IF", label: "Else If" },
          ];
    } else if (ruleFlowMode === "AND") {
      conditionTypeOptions = [{ value: "AND", label: "AND" }];
    } else {
      conditionTypeOptions = isLast
        ? [
            { value: "ELSE_IF", label: "Else If" },
            { value: "ELSE", label: "Else" },
          ]
        : [{ value: "ELSE_IF", label: "Else If" }];
    }
  }

  const selectedConditionType = isFirst
    ? "IF"
    : condition.uiConnector === "AND"
    ? "AND"
    : condition.branchType === "ELSE"
    ? "ELSE"
    : "ELSE_IF";

  const usedFieldNamesByOtherConditions = allConditions
    .filter(
      (item) =>
        getConditionKey(item) !== conditionKey &&
        item.field_name &&
        item.uiConnector === "AND"
    )
    .map((item) => item.field_name);

  if (firstFieldName && getConditionKey(firstCondition) !== conditionKey) {
    usedFieldNamesByOtherConditions.push(firstFieldName);
  }

  const andFieldOptions = FIELD_OPTIONS.filter(
    (option) =>
      !usedFieldNamesByOtherConditions.includes(option.value) ||
      option.value === condition.field_name
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-800">
            {isFirst ? (
              "If"
            ) : (
              <select
                value={selectedConditionType}
                onChange={(e) =>
                  onConditionTypeChange(conditionKey, e.target.value)
                }
                disabled={conditionTypeOptions.length === 1}
                className={`rounded-lg border px-3 py-2 text-sm outline-none ${
                  conditionTypeOptions.length === 1
                    ? "border-gray-300 bg-gray-100 text-gray-700"
                    : "border-gray-300 bg-white focus:border-gray-900"
                }`}
              >
                {conditionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={() => onRemoveCondition(conditionKey)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"
            title="Remove condition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2 text-sm text-gray-700">
              {!isElse && (
                <>
                  {isFirst ? (
                    <select
                      value={condition.field_name || ""}
                      onChange={(e) =>
                        onConditionFieldChange(
                          conditionKey,
                          "field_name",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900"
                    >
                      {FIELD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : isAndRow ? (
                    <select
                      value={condition.field_name || ""}
                      onChange={(e) =>
                        onConditionFieldChange(
                          conditionKey,
                          "field_name",
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900"
                    >
                      <option value="">Select Field Name</option>
                      {andFieldOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md bg-gray-100 px-3 py-2 font-medium text-gray-800">
                      {effectiveFieldName}
                    </span>
                  )}

                  {isList ? (
                    <>
                      <span>is in</span>
                      <select
                        value={condition.list_name || ""}
                        onChange={(e) =>
                          onConditionFieldChange(
                            conditionKey,
                            "list_name",
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900"
                      >
                        <option value="">Select List</option>
                        {LIST_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : isBoolean ? (
                    <>
                      <span>is</span>
                      <select
                        value={String(condition.boolean_value)}
                        onChange={(e) =>
                          onConditionFieldChange(
                            conditionKey,
                            "boolean_value",
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </>
                  ) : isNumeric ? (
                    <>
                      <span>is</span>
                      <select
                        value={condition.operator || ""}
                        onChange={(e) =>
                          onConditionFieldChange(
                            conditionKey,
                            "operator",
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900"
                        disabled={!effectiveFieldName}
                      >
                        <option value="">Select</option>
                        {NUMERIC_OPERATOR_OPTIONS.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.symbol}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        value={condition.numeric_value ?? ""}
                        onChange={(e) =>
                          onConditionFieldChange(
                            conditionKey,
                            "numeric_value",
                            e.target.value
                          )
                        }
                        className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900"
                        placeholder="Value"
                        disabled={!effectiveFieldName}
                      />
                    </>
                  ) : null}
                </>
              )}

              <span>{isElse ? "then score +" : "then risk score +"}</span>

              <input
                type="number"
                value={condition.score ?? ""}
                onChange={(e) =>
                  onConditionFieldChange(conditionKey, "score", e.target.value)
                }
                className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-900"
                placeholder="Score"
              />
            </div>

            <div className="flex items-center gap-12">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  condition.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {condition.is_active ? "Active" : "Inactive"}
              </span>

              <Toggle
                checked={condition.is_active}
                onChange={() => onToggleConditionActive(conditionKey)}
              />
            </div>
          </div>
        </div>
      </div>

      {isLast && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={lastConditionIsElse ? undefined : onAddCondition}
            disabled={lastConditionIsElse}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
              lastConditionIsElse
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-dashed border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            }`}
            title={
              lastConditionIsElse
                ? "You cannot add more conditions after Else."
                : "Add Condition"
            }
          >
            <Plus className="h-4 w-4" />
            Add Condition
          </button>
        </div>
      )}
    </div>
  );
}