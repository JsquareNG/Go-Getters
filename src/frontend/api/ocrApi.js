import axiosClient from "./axiosClient";

// Extract basic business info (ACRA / NIB)
export const extractProfileApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axiosClient.post(
      "/extract/universal-basic-info",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("extractProfileApi error:", err?.response?.data || err.message);
    throw new Error(
      err?.response?.data?.detail || "OCR extraction failed"
    );
  }
};


// Classify + full extract
export const classifyAndExtractApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axiosClient.post(
      "/extract/classify-and-extract",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("classifyAndExtractApi error:", err?.response?.data || err.message);
    throw new Error(
      err?.response?.data?.detail || "Failed to classify document"
    );
  }
};