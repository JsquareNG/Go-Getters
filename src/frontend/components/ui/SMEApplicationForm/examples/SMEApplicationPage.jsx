/**
 * Example Usage of SMEApplicationForm
 * This is a sample page showing how to integrate the form into your application
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { SMEApplicationForm } from "@/components/ui/SMEApplicationForm";
import { useToast } from "@/hooks/use-toast";

/**
 * SMEApplicationPage
 * Complete page component wrapping the SMEApplicationForm
 */
const SMEApplicationPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Handle successful form submission
   * @param {object} result - Response from API
   */
  const handleSubmitSuccess = (result) => {
    console.log("Application submitted successfully:", result);

    // Show success message
    toast({
      title: "Application Submitted!",
      description: `Your application ID is: ${result.applicationId}. We'll review it shortly.`,
    });

    // Redirect to success page or dashboard
    // setTimeout(() => {
    //   navigate("/application-success", {
    //     state: { applicationId: result.applicationId },
    //   });
    // }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Optional: Header Navigation */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Go-Getters</h1>
            <p className="text-sm text-gray-600">
              SME Cross-Border Payment Platform
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Form Component */}
      <main>
        <SMEApplicationForm
          onSubmitSuccess={handleSubmitSuccess}
          apiEndpoint="/api/sme/application"
        />
      </main>

      {/* Optional: Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>
            © 2026 Go-Getters. For support, email{" "}
            <a
              href="mailto:support@go-getters.com"
              className="text-red-500 hover:underline"
            >
              support@go-getters.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SMEApplicationPage;

/**
 * Alternative: Minimal Integration
 *
 * If you want just the form component with minimal wrapper:
 *
 * import { SMEApplicationForm } from "@/components/ui/SMEApplicationForm";
 *
 * export default function MinimalPage() {
 *   return <SMEApplicationForm />;
 * }
 */

/**
 * Advanced: Custom Configuration
 *
 * import { SMEApplicationForm, useSMEApplicationForm } from "@/components/ui/SMEApplicationForm";
 *
 * export default function AdvancedPage() {
 *   const handleSubmitSuccess = (result) => {
 *     console.log(result);
 *     // Custom logic here
 *   };
 *
 *   return (
 *     <SMEApplicationForm
 *       onSubmitSuccess={handleSubmitSuccess}
 *       apiEndpoint="/api/v1/sme/applications"
 *     />
 *   );
 * }
 */
