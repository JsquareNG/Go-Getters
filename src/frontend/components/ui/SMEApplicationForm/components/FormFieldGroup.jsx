import React from "react";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { AlertCircle } from "lucide-react";

/**
 * FormFieldGroup component
 * Renders a form field with label, input, and error message
 * Supports all HTML input types
 */
const FormFieldGroup = ({
  fieldName,
  label,
  placeholder,
  value,
  onChange,
  error,
  touched,
  required = true,
  type = "text",
  disabled = false,
  helpText = "",
  options = [],
}) => {
  const hasError = error && touched;

  return (
    <div className="mb-6">
      <Label htmlFor={fieldName} className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      {type === "textarea" ? (
        <textarea
          id={fieldName}
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
          rows={4}
        />
      ) : type === "select" ? (
        <select
          id={fieldName}
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
            hasError ? "border-red-500" : "border-gray-300"
          } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={fieldName}
          type={type}
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={hasError ? "border-red-500" : ""}
        />
      )}

      {helpText && !hasError && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}

      {hasError && (
        <div className="text-red-500 text-sm mt-1 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FormFieldGroup;
