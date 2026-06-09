import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

export async function uploadVinPhoto(userId: string, file: File): Promise<string> {
  const path = `vin-requests/${userId}/${Date.now()}-${file.name}`;
  const snapshot = await uploadBytes(ref(storage, path), file);
  return getDownloadURL(snapshot.ref);
}
