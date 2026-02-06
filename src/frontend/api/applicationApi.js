import axiosClient from "./axiosClient";

export const getApplicationsByUserId = async (userId) => {
  // Using the specific endpoint you provided
  const res = await axiosClient.get(`/applications/byUserID/${userId}`);
  return res.data;
};

export const getApplicationByAppId = async (id) => {
  const res = await axiosClient.get(`/applications/byAppID/${id}`);
  return res.data;
};

export const submitApplicationApi = async (business_country, business_name, user_id, business_type, email, firstName) => {
  const res = await axiosClient.post("/", {
    business_country,
    business_name,
    user_id,
    business_type,
    email,
    firstName
  });
  return res.data;
};

/*
{
  "business_country": "South Korea",
  "business_name": "Samsung Enterprise Pte Ltd",
  "user_id": "00000007",
  "business_type":"Electronics",
  "email": "jingjie27@gmail.com",
  "firstName": "JJ"
}
*/
