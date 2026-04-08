import React, { useEffect, useState } from "react";
import { getRiskConfigListNames } from "../../../api/riskConfigListApi";
import { Trash2, Plus } from "lucide-react";
import Toggle from "./common/Toggle";
import FieldError from "./common/FieldError";

const NUMERIC_OPERATOR_OPTIONS = [
  { code: "EQ", symbol: "=" },
  { code: "NE", symbol: "!=" },
  { code: "GT", symbol: ">" },
  { code: "GTE", symbol: ">=" },
  { code: "LT", symbol: "<" },
  { code: "LTE", symbol: "<=" },
];

const STRING_OPERATOR_OPTIONS = [
  { code: "EQ", symbol: "=" }
];

function formatListLabel(value) {
  if (!value) return "";

  const specialWords = {
    FATF: "FATF",
  };

  return value
    .split("_")
    .map((part) => specialWords[part] || part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function getConditionKey(condition) {
  return condition.condition_id ?? condition.__tempId;
}

function getRuleFlowMode(conditions = []) {
  if (conditions.length <= 1) return null;
  const second = conditions[1];
  if (!second) return null;
  return second.uiConnector === "AND" ? "AND" : "BRANCH";
}

function getFieldMeta(fieldOptions, fieldName, condition = null) {
  const found = fieldOptions.find((item) => item.value === fieldName);
  if (found) return found;

  if (fieldName) {
    const operator = (condition?.operator || "").toUpperCase();
    const valueType = (condition?.value_type || "").toUpperCase();

    if (operator === "IS_TRUE" || operator === "IS_FALSE" || valueType === "BOOLEAN") {
      return {
        value: fieldName,
        label: fieldName,
        kind: "boolean",
        isLegacy: true,
      };
    }

    if (operator === "IN_LIST" || valueType === "LIST") {
      return {
        value: fieldName,
        label: fieldName,
        kind: "list",
        isLegacy: true,
      };
    }

    if (valueType === "STRING") {
      return {
        value: fieldName,
        label: fieldName,
        kind: "string",
        isLegacy: true,
      };
    }

    return {
      value: fieldName,
      label: fieldName,
      kind: "number",
      isLegacy: true,
    };
  }

  return null;
}

function inputClass(hasError, base = "") {
  return `${base} rounded-lg border px-3 py-2 outline-none ${
    hasError
      ? "border-red-500 bg-red-50 focus:border-red-600"
      : "border-gray-300 bg-white focus:border-gray-900"
  }`;
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
  conditionErrors = {},
  showValidation = false,
  fieldOptions = [],
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
  const isExistingCondition = !condition.isNew;
  const [listOptions, setListOptions] = useState([]);

  const effectiveFieldName =
    isBranchRow ? firstFieldName || condition.field_name : condition.field_name;

  const fieldMeta = getFieldMeta(fieldOptions, effectiveFieldName, condition);
  const isNumeric = fieldMeta?.kind === "number";
  const isBoolean = fieldMeta?.kind === "boolean";
  const isList = fieldMeta?.kind === "list";
  const isString = fieldMeta?.kind === "string";

  const lastConditionIsElse =
    totalConditions > 0 &&
    allConditions[totalConditions - 1]?.branchType === "ELSE";

  const fieldNameError = showValidation ? conditionErrors.field_name : "";
  const numericValueError = showValidation ? conditionErrors.numeric_value : "";
  const stringValueError = showValidation ? conditionErrors.string_value : "";
  const listNameError = showValidation ? conditionErrors.list_name : "";
  const scoreError = showValidation ? conditionErrors.score : "";
  const triggerDescriptionError = showValidation
    ? conditionErrors.trigger_description
    : "";

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

  useEffect(() => {
    const fetchListOptions = async () => {
      try {
        const data = await getRiskConfigListNames();
        const formatted = (data || []).map((item) => ({
          value: item,
          label: formatListLabel(item),
        }));
        setListOptions(formatted);
      } catch (err) {
        console.error("Failed to load config list names", err);
        setListOptions([]);
      }
    };

    fetchListOptions();
  }, []);

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
        (item.uiConnector === "AND" || item === firstCondition)
    )
    .map((item) => item.field_name);

  const andFieldOptions = fieldOptions.filter(
    (option) =>
      !usedFieldNamesByOtherConditions.includes(option.value) ||
      option.value === condition.field_name
  );

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border bg-white p-4 ${
          showValidation &&
          (fieldNameError ||
            numericValueError ||
            stringValueError ||
            listNameError ||
            scoreError ||
            triggerDescriptionError)
            ? "border-red-200"
            : "border-gray-200"
        }`}
      >
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

          {condition.isNew && (
            <button
              type="button"
              onClick={() => onRemoveCondition(conditionKey)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50"
              title="Remove condition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-3 rounded-lg bg-gray-50 px-3 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-1 flex-wrap items-start gap-2 text-sm text-gray-700">
              {!isElse && (
                <>
                  <div>
                    {isFirst ? (
                      isExistingCondition ? (
                        <span
                          className={`inline-block rounded-md px-3 py-2 font-medium ${
                            fieldNameError
                              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {condition.field_name}
                        </span>
                      ) : (
                        <select
                          value={condition.field_name || ""}
                          onChange={(e) =>
                            onConditionFieldChange(
                              conditionKey,
                              "field_name",
                              e.target.value
                            )
                          }
                          className={inputClass(Boolean(fieldNameError))}
                        >
                          {fieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )
                    ) : isAndRow ? (
                      isExistingCondition ? (
                        <span
                          className={`inline-block rounded-md px-3 py-2 font-medium ${
                            fieldNameError
                              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {condition.field_name}
                        </span>
                      ) : (
                        <select
                          value={condition.field_name || ""}
                          onChange={(e) =>
                            onConditionFieldChange(
                              conditionKey,
                              "field_name",
                              e.target.value
                            )
                          }
                          className={inputClass(Boolean(fieldNameError))}
                        >
                          <option value="">Select Field Name</option>
                          {andFieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )
                    ) : (
                      <span className="inline-block rounded-md bg-gray-100 px-3 py-2 font-medium text-gray-800">
                        {effectiveFieldName}
                      </span>
                    )}
                    <FieldError message={fieldNameError} />
                  </div>

                  {isList ? (
                    <>
                      <span className="pt-2">is in</span>
                      <div>
                        <select
                          value={condition.list_name || ""}
                          onChange={(e) =>
                            onConditionFieldChange(
                              conditionKey,
                              "list_name",
                              e.target.value
                            )
                          }
                          className={inputClass(Boolean(listNameError))}
                        >
                          <option value="">Select List</option>
                          {listOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <FieldError message={listNameError} />
                      </div>
                    </>
                  ) : isBoolean ? (
                    <>
                      <span className="pt-2">is</span>
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
                  ) : isString ? (
                    <>
                      <span className="pt-2 font-medium">=</span>

                      <div>
                        <input
                          type="text"
                          value={condition.string_value ?? ""}
                          onChange={(e) =>
                            onConditionFieldChange(
                              conditionKey,
                              "string_value",
                              e.target.value
                            )
                          }
                          className={inputClass(Boolean(stringValueError), "w-40")}
                          placeholder="Value"
                          disabled={!effectiveFieldName}
                        />
                        <FieldError message={stringValueError} />
                      </div>
                    </>
                  ) : isNumeric ? (
                    <>
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

                      <div>
                        <input
                          type="number"
                          min={0}
                          value={condition.numeric_value ?? ""}
                          onKeyDown={(e) => {
                            if (e.key === "-" || e.key === "e") {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) =>
                            onConditionFieldChange(
                              conditionKey,
                              "numeric_value",
                              e.target.value
                            )
                          }
                          className={inputClass(Boolean(numericValueError), "w-28")}
                          placeholder="Value"
                          disabled={!effectiveFieldName}
                        />
                        <FieldError message={numericValueError} />
                      </div>
                    </>
                  ) : null}
                </>
              )}

              <span className="pt-2">
                {isElse ? "then score +" : "then risk score +"}
              </span>

              <div>
                <input
                  type="number"
                  min={0}
                  value={condition.score ?? ""}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) =>
                    onConditionFieldChange(conditionKey, "score", e.target.value)
                  }
                  className={inputClass(Boolean(scoreError), "w-24")}
                  placeholder="Score"
                />
                <FieldError message={scoreError} />
              </div>
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

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Trigger Description
            </label>
            <textarea
              value={condition.trigger_description || ""}
              onChange={(e) =>
                onConditionFieldChange(
                  conditionKey,
                  "trigger_description",
                  e.target.value
                )
              }
              rows={3}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                triggerDescriptionError
                  ? "border-red-500 bg-red-50 focus:border-red-600"
                  : "border-gray-300 bg-white focus:border-gray-900"
              }`}
              placeholder="Indicate the rule trigger description shown to bank staff, such as what went wrong or why this rule was triggered."
            />
            <FieldError message={triggerDescriptionError} />
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