import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Car } from '../types';

export async function createCar(car: Car) {
  return addDoc(collection(db, 'cars'), car);
}

export async function getUserCars(userId: string) {
  const snapshot = await getDocs(query(collection(db, 'cars'), where('userId', '==', userId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Car[];
}
