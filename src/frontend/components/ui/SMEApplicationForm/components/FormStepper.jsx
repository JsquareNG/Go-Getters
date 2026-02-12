import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

/**
 * FormStepper component
 * Displays progress indicator showing current step and completed steps
 */
const FormStepper = ({ currentStep, totalSteps, stepLabels = [] }) => {
  const defaultLabels = Array.from(
    { length: totalSteps },
    (_, i) => `Step ${i + 1}`,
  );
  const labels = stepLabels.length > 0 ? stepLabels : defaultLabels;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-medium text-center max-w-[80px] ${
                    isActive || isCompleted ? "text-gray-900" : "text-gray-600"
                  }`}
                >
                  {labels[index]}
                </p>
              </div>

              {/* Connector Line */}
              {stepNumber < totalSteps && (
                <div
                  className="flex-1 h-1 mx-2 mb-8 rounded-full"
                  style={{
                    background: isCompleted ? "#22c55e" : "#e5e7eb",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 w-full bg-gray-200 rounded-full h-1">
        <div
          className="bg-red-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default FormStepper;
