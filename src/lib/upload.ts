export const uploadFileViaBackend = async (file: File | Blob, folder: string, user: any, customFileName?: string): Promise<string> => {
  if (!user) throw new Error("User must be logged in to upload files.");
  const token = await user.getIdToken();
  const arrayBuf = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);
  
  // Safe base64 conversion that won't stack overflow
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  const base64 = btoa(binary);
  
  const originalName = customFileName || (file as File).name || 'file';
  const randomID = Math.random().toString(36).substring(2, 8);
  const safeName = `${Date.now()}_${randomID}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const res = await fetch('/api/admin/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      base64,
      mimeType: file.type,
      fileName: safeName,
      folder
    }),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
};
