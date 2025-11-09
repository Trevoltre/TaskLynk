// Rediafile API Integration for File Upload/Download
// Using the provided API keys for TaskLynk project

const REDIAFILE_API_URL = "https://apps.rediafile.com/api/v2/";
const REDIAFILE_KEY1 = "CCHpAitHtboY3wI1Fa40eqaEM1ktUmQq7R7Yk0hrGbSEZpQYA2XLhqQJOXQ67iei";
const REDIAFILE_KEY2 = "LwfbwlIGSxv3b1ddCcfTuvRI7gmVaOVcZzMWqbhEjhH2VcY8ncB7otoYN6DFhfMJ";

// Cache for access token to avoid repeated authorization calls
let cachedToken: { access_token: string; account_id: string; expires_at: number } | null = null;

/**
 * Authorize and get access token from Rediafile
 * Caches token for 1 hour to reduce API calls
 */
export async function getRediafileAuth() {
  // Return cached token if still valid (expires in 1 hour)
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return {
      access_token: cachedToken.access_token,
      account_id: cachedToken.account_id
    };
  }

  try {
    const response = await fetch(`${REDIAFILE_API_URL}authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        key1: REDIAFILE_KEY1,
        key2: REDIAFILE_KEY2,
      }),
    });

    const data = await response.json();

    if (data._status !== "success") {
      throw new Error(data._response || "Authorization failed");
    }

    // Cache the token for 1 hour
    cachedToken = {
      access_token: data.data.access_token,
      account_id: data.data.account_id,
      expires_at: Date.now() + 3600000, // 1 hour
    };

    return {
      access_token: cachedToken.access_token,
      account_id: cachedToken.account_id,
    };
  } catch (error) {
    console.error("Rediafile authorization failed:", error);
    throw error;
  }
}

/**
 * Upload a file to Rediafile
 * @param file - File object to upload
 * @returns Download URL and file info
 */
export async function uploadToRediafile(file: File) {
  try {
    const auth = await getRediafileAuth();

    const formData = new FormData();
    formData.append("access_token", auth.access_token);
    formData.append("account_id", auth.account_id);
    formData.append("upload_file", file);

    const response = await fetch(`${REDIAFILE_API_URL}file/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data._status !== "success") {
      throw new Error(data._response || "Upload failed");
    }

    const fileInfo = data.data[0];
    
    return {
      url: fileInfo.url,
      filename: fileInfo.name,
      size: fileInfo.size,
      fileId: fileInfo.id,
    };
  } catch (error) {
    console.error("Rediafile upload failed:", error);
    throw error;
  }
}

/**
 * Delete a file from Rediafile
 * @param fileId - Rediafile file ID
 */
export async function deleteFromRediafile(fileId: string) {
  try {
    const auth = await getRediafileAuth();

    const response = await fetch(`${REDIAFILE_API_URL}file/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        access_token: auth.access_token,
        account_id: auth.account_id,
        file_id: fileId,
      }),
    });

    const data = await response.json();

    if (data._status !== "success") {
      throw new Error(data._response || "Delete failed");
    }

    return true;
  } catch (error) {
    console.error("Rediafile delete failed:", error);
    throw error;
  }
}

/**
 * Get file info from Rediafile
 * @param fileId - Rediafile file ID
 */
export async function getRediafileInfo(fileId: string) {
  try {
    const auth = await getRediafileAuth();

    const response = await fetch(`${REDIAFILE_API_URL}file/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        access_token: auth.access_token,
        account_id: auth.account_id,
        file_id: fileId,
      }),
    });

    const data = await response.json();

    if (data._status !== "success") {
      throw new Error(data._response || "Get file info failed");
    }

    return data.data;
  } catch (error) {
    console.error("Rediafile get info failed:", error);
    throw error;
  }
}
