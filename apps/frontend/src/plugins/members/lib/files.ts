import axios from 'axios';
import { OpenAPI } from '@helix-x-rawla/client-sdk';

/**
 * Save a protected file under its own name.
 *
 * The generated client types download routes as `Blob` but requests them as
 * JSON, so binary content arrives mangled. This goes through the same global
 * axios instance, base URL and token as the client and only adds
 * `responseType: 'blob'`. The `events` plugin carries the same few lines:
 * plugins do not import each other.
 */
export async function downloadPortalFile(path: string, filename: string): Promise<void> {
  const token =
    typeof OpenAPI.TOKEN === 'function'
      ? await OpenAPI.TOKEN({ method: 'GET', url: path })
      : OpenAPI.TOKEN;
  const response = await axios.get<Blob>(`${OpenAPI.BASE}${path}`, {
    responseType: 'blob',
    withCredentials: OpenAPI.WITH_CREDENTIALS,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const url = URL.createObjectURL(response.data);
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
