import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

export async function uploadVinPhoto(userId: string, file: File): Promise<string> {
  if (!storage) return fileToDataUrl(file);
  const path = `vin-requests/${userId}/${Date.now()}-${file.name}`;
  const snapshot = await uploadBytes(ref(storage, path), file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadCarPhoto(userId: string, carId: string, file: File): Promise<string> {
  if (!storage) return fileToDataUrl(file);
  const path = `garage/${userId}/${carId}/${Date.now()}-${file.name}`;
  const snapshot = await uploadBytes(ref(storage, path), file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadReturnPhoto(userId: string, orderId: string, file: File): Promise<string> {
  if (!storage) return fileToDataUrl(file);
  const path = `returns/${userId}/${orderId}/${Date.now()}-${file.name}`;
  const snapshot = await uploadBytes(ref(storage, path), file);
  return getDownloadURL(snapshot.ref);
}

export async function deleteStorageFile(pathOrUrl: string) {
  if (!storage) return;
  await deleteObject(ref(storage, pathOrUrl));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
