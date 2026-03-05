import React from "react";
import { Input } from "../../primitives/Input";
import { Label } from "../../primitives/Label";

/**
 * FormFieldGroup component
 * Renders a form field with label and input/select/textarea
 * Works purely with value/onChange (no errors or touched)
 */
const FormFieldGroup = ({
  fieldName,
  label,
  placeholder,
  value,
  onChange,
  required = true,
  type = "text",
  disabled = false,
  helpText = "",
  options = [],
}) => {
  const handleChange = (e) => {
    const val = e.target.value;
    onChange?.(fieldName, val);
  };

  return (
    <div className="mb-6">
      <Label htmlFor={fieldName} className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      {type === "textarea" ? (
        <textarea
          id={fieldName}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
            disabled ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"
          }`}
          rows={4}
        />
      ) : type === "select" ? (
        <select
          id={fieldName}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
            disabled ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"
          }`}
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
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}

      {helpText && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}
    </div>
  );
};

export default FormFieldGroup;