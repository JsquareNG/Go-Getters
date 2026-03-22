import React from "react";
import { Plus } from "lucide-react";
import ConditionCard from "./ConditionCard";
import FieldError from "./common/FieldError";

function getConditionKey(condition) {
  return condition.condition_id ?? condition.__tempId;
}

export default function RuleConditionsPanel({
  rowKey,
  conditions,
  onAddCondition,
  onConditionTypeChange,
  onConditionFieldChange,
  onToggleConditionActive,
  onRemoveCondition,
  ruleErrors = {},
  conditionErrors = {},
  showValidation = false,
  fieldOptions = [],
}) {
  const conditionsError = showValidation ? ruleErrors.conditions : "";

  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="px-4 py-4">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-800">Conditions</div>

          <FieldError message={conditionsError} />

          {!conditions.length ? (
            <div className="flex justify-center py-6">
              <button
                type="button"
                onClick={() => onAddCondition(rowKey)}
                className={`inline-flex items-center gap-2 rounded-xl border border-dashed px-5 py-3 text-sm font-medium ${
                  conditionsError
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <Plus className="h-4 w-4" />
                Add First Condition
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {conditions.map((condition, index) => (
                <ConditionCard
                  key={getConditionKey(condition)}
                  condition={condition}
                  index={index}
                  totalConditions={conditions.length}
                  allConditions={conditions}
                  onConditionTypeChange={onConditionTypeChange}
                  onConditionFieldChange={onConditionFieldChange}
                  onToggleConditionActive={onToggleConditionActive}
                  onRemoveCondition={(conditionKey) =>
                    onRemoveCondition(rowKey, conditionKey)
                  }
                  onAddCondition={() => onAddCondition(rowKey)}
                  conditionErrors={
                    conditionErrors[getConditionKey(condition)] || {}
                  }
                  showValidation={showValidation}
                  fieldOptions={fieldOptions}
                />
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}