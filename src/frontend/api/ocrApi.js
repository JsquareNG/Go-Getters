
export const extractProfileApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    "http://127.0.0.1:8000/extract/universal-basic-info",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    throw new Error("OCR extraction failed");
  }

  return await res.json();
};

export const classifyAndExtractApi = async (file) => {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(
    "http://127.0.0.1:8000/extract/classify-and-extract",
    {
      method: "POST",
      body: form,
    }
  );

  if (!res.ok) {
    throw new Error("Failed to classify document");
  }

  return await res.json();
};