import axiosClient from "./axiosClient";

// Classify + full extract
export const classifyAndExtractApi = async (file, expectedDocType = null) => {
  const formData = new FormData();
  formData.append("file", file);

  if (expectedDocType) {
    formData.append("expected_doc_type", expectedDocType);
  }

  try {
    const res = await axiosClient.post(
      "/extract/classify-and-extract",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return res.data;
  } catch (err) {
    console.error(
      "classifyAndExtractApi error:",
      err?.response?.data || err.message,
    );
    throw new Error(
      err?.response?.data?.detail || "Failed to classify document",
    );
  }
};

export const extractAdditionalDocument = async (file, requestedDocumentName) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("requested_document_name", requestedDocumentName);

  const res = await axiosClient.post(
    "/extract/extract-additional-document",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
};
