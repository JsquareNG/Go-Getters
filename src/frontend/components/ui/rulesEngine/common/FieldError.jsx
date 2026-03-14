import React from "react";

export default function FieldError({ message }) {
  if (!message) return null;

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}
