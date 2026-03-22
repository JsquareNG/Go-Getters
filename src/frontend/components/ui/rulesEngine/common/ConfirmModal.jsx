import React from "react";
import { Save, AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  confirmVariant = "dark",
  type = "warning",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-full p-2 ${
              type === "save"
                ? "bg-blue-100 text-blue-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {type === "save" ? <Save size={18} /> : <AlertTriangle size={18} />}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
              confirmVariant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : confirmVariant === "primary"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-900 hover:bg-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}