import React from "react";
import { Save } from "lucide-react";

export default function RulesListFooterActions({
  hasChanges,
  saving,
  onRevert,
  onSave,
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-6 border-t border-gray-200 bg-white/95 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
        <button
          type="button"
          onClick={onRevert}
          disabled={!hasChanges || saving}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            hasChanges && !saving
              ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
              : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
          }`}
        >
          Revert
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges || saving}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
            hasChanges && !saving
              ? "bg-gray-900 text-white hover:bg-black"
              : "cursor-not-allowed bg-gray-300 text-gray-500"
          }`}
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}