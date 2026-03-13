import React from "react";
import { Plus } from "lucide-react";
import ConditionCard from "./ConditionCard";

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
}) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="px-4 py-4">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-800">Conditions</div>

          {!conditions.length ? (
            <div className="flex justify-center py-6">
              <button
                type="button"
                onClick={() => onAddCondition(rowKey)}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
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
                />
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}