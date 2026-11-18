export function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Opens a downloaded file in a new tab. If the browser blocks the new tab, it downloads the file instead.
export function openBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank');
  if (tab) {
    tab.opener = null;
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}