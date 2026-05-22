/** Resolve relative upload paths to a fetchable URL (uses Vite proxy in dev). */
export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
  }
  const apiBase = import.meta.env.VITE_API_URL || '';
  const origin = apiBase
    ? apiBase.replace(/\/api\/?$/, '')
    : 'http://localhost:5005';
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
};

export const isImageFile = (fileType, url) => {
  const t = (fileType || '').toLowerCase();
  if (t.includes('image')) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(url || '');
};

export const isVideoFile = (fileType, url) => {
  const t = (fileType || '').toLowerCase();
  if (t.includes('video')) return true;
  return /\.(mp4|mov|avi|wmv|webm|mkv)$/i.test(url || '');
};

export const isDocumentFile = (fileType, url) => {
  if (isImageFile(fileType, url) || isVideoFile(fileType, url)) return false;
  const t = (fileType || '').toLowerCase();
  if (t.includes('document') || t.includes('spreadsheet') || t.includes('archive')) return true;
  return /\.(pdf|docx?|xlsx?|xls|pptx?|ppt|txt|csv|zip|rar|7z)$/i.test(url || '');
};

export const fileDisplayName = (msg) => {
  if (!msg) return 'File';
  const fromContent = msg.content?.replace(/^Shared (a )?file:?\s*/i, '').trim();
  if (fromContent) return fromContent;
  const url = msg.fileUrl || '';
  return url.split('/').pop() || 'File';
};
