import axios from 'axios';
import { OpenAPI } from '@helix-x-rawla/client-sdk';

/**
 * Fetch a protected file as a Blob.
 *
 * The generated client types these routes as `Blob` but requests them as JSON,
 * so binary content arrives mangled. This goes through the same global axios
 * instance and the same `OpenAPI` base URL and token the client uses — it only
 * adds `responseType: 'blob'`.
 */
export async function fetchPortalBlob(path: string): Promise<Blob> {
  const token =
    typeof OpenAPI.TOKEN === 'function'
      ? await OpenAPI.TOKEN({ method: 'GET', url: path })
      : OpenAPI.TOKEN;
  const response = await axios.get<Blob>(`${OpenAPI.BASE}${path}`, {
    responseType: 'blob',
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

/** Save a protected file under its own name. */
export async function downloadPortalFile(path: string, filename: string): Promise<void> {
  const url = URL.createObjectURL(await fetchPortalBlob(path));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Revoked after the click has been handed to the browser.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
