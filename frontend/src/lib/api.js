const API_URL = import.meta.env.VITE_API_URL || "/api";

// Xóa token giả lập local cũ nếu có để tránh lỗi xác thực
if (typeof localStorage !== "undefined") {
  const existingToken = localStorage.getItem("baby-shop-token");
  if (existingToken && existingToken.startsWith("local-")) {
    localStorage.removeItem("baby-shop-token");
    localStorage.removeItem("baby-shop-user");
  }
}

export const seedData = {};

async function request(resource, options = {}) {
  const token = localStorage.getItem("baby-shop-token");
  let response;
  try {
    response = await fetch(`${API_URL}/${resource}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    error.isNetworkError = true;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) {
    const error = new Error(payload?.message || `Máy chủ trả về lỗi ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload || {};
}

export async function listRecords(resource) {
  const result = await request(resource);
  return result.data || [];
}

export async function saveRecord(resource, record) {
  const recordId = record.id || record._id;
  const cleanBody = { ...record };
  delete cleanBody._isEditing;
  delete cleanBody.isEditing;

  // Nếu bản ghi có id (ObjectId hoặc mã định danh đang sửa), gửi PUT
  const isMongoId = Boolean(recordId && typeof recordId === "string" && /^[0-9a-fA-F]{24}$/.test(recordId));
  const isEdit = Boolean(record._isEditing || record.isEditing || isMongoId);

  const endpoint = isEdit && recordId ? `${resource}/${recordId}` : resource;
  const method = isEdit && recordId ? "PUT" : "POST";
  const result = await request(endpoint, { method, body: JSON.stringify(cleanBody) });
  return result.data;
}

export async function deleteRecord(resource, id) {
  return await request(`${resource}/${id}`, { method: "DELETE" });
}

export async function login(username, password) {
  const result = await request("auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  localStorage.setItem("baby-shop-token", result.token);
  localStorage.setItem("baby-shop-user", JSON.stringify(result.user));
  return result.user;
}

export async function logout() {
  try {
    await request("auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("baby-shop-token");
    localStorage.removeItem("baby-shop-user");
  }
}

export async function getReport(name) {
  return await request(`reports/${name}`);
}

/** POST tới một endpoint tùy ý (không qua saveRecord logic) */
export async function postRequest(resource, body) {
  const result = await request(resource, { method: "POST", body: JSON.stringify(body) });
  return result;
}

/** GET tới một endpoint tùy ý, trả về result.data */
export async function getRequest(resource) {
  const result = await request(resource);
  return result.data || result;
}
