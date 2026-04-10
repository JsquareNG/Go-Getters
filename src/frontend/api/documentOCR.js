import axiosClient from "./axiosClient";

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