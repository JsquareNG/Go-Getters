import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  Label,
  Textarea,
} from "@/components/ui/primitives";
import { useToast } from "@/hooks/use-toast";

import { useDispatch, useSelector } from "react-redux";
import { setConfig, resetConfig } from "../store/smeFormConfigSlice";

export default function AdminConfigPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { countries, businessTypes, documentTypes } = useSelector(
    (state) => state.smeFormConfig,
  );

  const [countriesJson, setCountriesJson] = useState("");
  const [businessTypesJson, setBusinessTypesJson] = useState("");
  const [documentTypesJson, setDocumentTypesJson] = useState("");
  const [activeTab, setActiveTab] = useState("countries");

  // Sync Redux → JSON editors
  useEffect(() => {
    setCountriesJson(JSON.stringify(countries, null, 2));
    setBusinessTypesJson(JSON.stringify(businessTypes, null, 2));
    setDocumentTypesJson(JSON.stringify(documentTypes, null, 2));
  }, [countries, businessTypes, documentTypes]);

  const handleSaveConfig = () => {
    try {
      dispatch(
        setConfig({
          countries: JSON.parse(countriesJson),
          businessTypes: JSON.parse(businessTypesJson),
          documentTypes: JSON.parse(documentTypesJson),
        }),
      );

      toast({
        title: "Config Saved",
        description: "Saved to Redux and persisted",
      });
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Please fix JSON errors before saving",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const payload = {
      countries: JSON.parse(countriesJson || "{}"),
      businessTypes: JSON.parse(businessTypesJson || "{}"),
      documentTypes: JSON.parse(documentTypesJson || "{}"),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sme_form_config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);

        if (
          !parsed.countries ||
          !parsed.businessTypes ||
          !parsed.documentTypes
        ) {
          toast({
            title: "Invalid File",
            description:
              "File must contain countries, businessTypes, and documentTypes",
            variant: "destructive",
          });
          return;
        }

        setCountriesJson(JSON.stringify(parsed.countries, null, 2));
        setBusinessTypesJson(JSON.stringify(parsed.businessTypes, null, 2));
        setDocumentTypesJson(JSON.stringify(parsed.documentTypes, null, 2));

        toast({
          title: "File Loaded",
          description: "Config loaded — click Save to apply",
        });
      } catch {
        toast({
          title: "Parse Error",
          description: "Invalid JSON file",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  };

  const handleReset = () => {
    dispatch(resetConfig());
    toast({ title: "Reset", description: "Defaults restored" });
  };

  const Preview = () => {
    const countryKeys = Object.keys(countries || {});
    const typeKeys = Object.keys(businessTypes || {});
    const docTypeKeys = Object.keys(documentTypes || {});

    return (
      <div className="space-y-4">
        {/* Countries Preview - Only show when Countries tab is active */}
        {activeTab === "countries" && (
          <Card className="p-4">
            <CardContent>
              <h3 className="text-sm font-semibold mb-2">
                Countries ({countryKeys.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {countryKeys.slice(0, 10).map((k) => (
                  <span
                    key={k}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                  >
                    {countries[k]?.name || k}
                  </span>
                ))}
                {countryKeys.length > 10 && (
                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold">
                    +{countryKeys.length - 10} more
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Business Types Preview - Only show when Business Types tab is active */}
        {activeTab === "businessTypes" && (
          <Card className="p-4">
            <CardContent>
              <h3 className="text-sm font-semibold mb-2">
                Business Types ({typeKeys.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {typeKeys.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                  >
                    {businessTypes[k]?.label || k}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Types Preview - Only show when Document Types tab is active */}
        {activeTab === "documentTypes" && (
          <Card className="p-4">
            <CardContent>
              <h3 className="text-sm font-semibold mb-2">
                Document Types ({docTypeKeys.length})
              </h3>
              <div className="space-y-2">
                {docTypeKeys.map((k) => (
                  <div
                    key={k}
                    className="flex items-start gap-2 p-2 bg-orange-50 rounded border border-orange-200"
                  >
                    <span className="text-orange-600 font-semibold text-xs mt-0.5">
                      📄
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">
                        {documentTypes[k]?.label || k}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {documentTypes[k]?.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <Button
            onClick={() => navigate("/applications/form")}
            className="w-full"
          >
            Open Form Demo
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Static Header */}
      <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            SME Application Form Config
          </h1>
          <p className="text-gray-600 mt-1">
            Manage countries, business types, and document types
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Editor Section */}
            <div className="lg:col-span-2">
              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-gray-200">
                {[
                  { id: "countries", label: "Countries" },
                  { id: "businessTypes", label: "Business Types" },
                  { id: "documentTypes", label: "Document Types" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <Card className="mb-4">
                <CardContent className="space-y-4">
                  {activeTab === "countries" && (
                    <div>
                      <Label className="block mb-2">
                        Countries Configuration (JSON)
                      </Label>
                      <Textarea
                        value={countriesJson}
                        onChange={(e) => setCountriesJson(e.target.value)}
                        className="h-[calc(100vh-340px)] min-h-[32rem] font-mono text-xs border border-gray-300 rounded p-3"
                        placeholder="Paste countries JSON config here..."
                      />
                    </div>
                  )}

                  {activeTab === "businessTypes" && (
                    <div>
                      <Label className="block mb-2">
                        Business Types Configuration (JSON)
                      </Label>
                      <Textarea
                        value={businessTypesJson}
                        onChange={(e) => setBusinessTypesJson(e.target.value)}
                        className="h-80 font-mono text-xs border border-gray-300 rounded p-3"
                        placeholder="Paste business types JSON config here..."
                      />
                    </div>
                  )}

                  {activeTab === "documentTypes" && (
                    <div>
                      <Label className="block mb-2">
                        Document Types Configuration (JSON)
                      </Label>
                      <Textarea
                        value={documentTypesJson}
                        onChange={(e) => setDocumentTypesJson(e.target.value)}
                        className="h-80 font-mono text-xs border border-gray-300 rounded p-3"
                        placeholder="Paste document types JSON config here..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSaveConfig} className="flex-1">
                  Save Changes
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1"
                >
                  Download Config
                </Button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="w-full">
                    Upload Config
                  </Button>
                </label>
                <Button onClick={handleReset} variant="ghost">
                  Reset to Default
                </Button>
              </div>
            </div>

            {/* Preview Section */}
            <div className="lg:col-span-1">
              <div className="sticky" style={{ top: "24px" }}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Configuration Preview
                </h2>
                <Preview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
