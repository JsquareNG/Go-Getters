import React from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORY_TABS = [
  { key: "BASIC", label: "Basic Compliance" },
  { key: "KYC", label: "Know Your Customer" },
  { key: "KYB", label: "Know Your Business" },
];

function formatBasicCategoryLabel(category) {
  if (!category) return "";

  if (category === "SG") return "Singapore";
  if (category === "IND") return "Indonesia";
  if (category === "GENERAL") return "General";

  return category;
}

export default function RulesListHeader({
  activeCategory,
  formattedLastRevised,
  onCategoryChange,
  onExpandAll,
  onCollapseAll,
  onAddRule,
  basicComplianceCategories = [],
  basicComplianceFilter = "",
  onBasicComplianceFilterChange = () => {},
}) {
  const isBasicTab = activeCategory === "BASIC";

  const title =
    activeCategory === "KYC"
      ? "Know Your Customer Rules"
      : activeCategory === "KYB"
      ? "Know Your Business Rules"
      : "Basic Compliance Rules";

  const subtitle =
    activeCategory === "KYC"
      ? "Manage rules used by the rules engine for KYC."
      : activeCategory === "KYB"
      ? "Manage rules used by the rules engine for KYB."
      : "Manage rules used by the rules engine for Basic Compliance.";

  return (
    <>
      <div className="flex gap-2 border-b border-gray-200">
        {CATEGORY_TABS.map((tab) => {
          const active = activeCategory === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onCategoryChange(tab.key)}
              className={`rounded-t-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border border-b-white border-red-400 bg-white text-red-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

          <p className="text-sm text-gray-500">{subtitle}</p>

          <p className="mt-1 text-xs text-gray-500">
            Last updated: {formattedLastRevised}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isBasicTab && (
            <select
              value={basicComplianceFilter}
              onChange={(e) => onBasicComplianceFilterChange(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 outline-none focus:border-gray-900"
            >
              {basicComplianceCategories.map((category) => (
                <option key={category} value={category}>
                  {formatBasicCategoryLabel(category)}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onExpandAll}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ChevronDown size={16} />
            Expand All
          </button>

          <button
            type="button"
            onClick={onCollapseAll}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ChevronUp size={16} />
            Collapse All
          </button>

          <button
            type="button"
            onClick={onAddRule}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            <Plus size={16} />
            Add Rule
          </button>
        </div>
      </div>
    </>
  );
}