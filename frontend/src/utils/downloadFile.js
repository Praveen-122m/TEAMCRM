import { resolveMediaUrl } from './mediaUrl';

/** Force browser download (works with Vite /uploads proxy). */
export async function downloadMediaFile(url, filename = 'download') {
  const fullUrl = resolveMediaUrl(url);
  if (!fullUrl) return;

  try {
    const res = await fetch(fullUrl, { credentials: 'include' });
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
