import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Car, CarPartHistoryItem } from '../types';

export async function createCar(car: Car) {
  if (!db) {
    const id = `demo-car-${Date.now()}`;
    const cars = JSON.parse(localStorage.getItem('demo-garage') ?? '[]') as Car[];
    localStorage.setItem('demo-garage', JSON.stringify([{ ...car, id }, ...cars]));
    return { id };
  }
  return addDoc(collection(db, 'garage'), car);
}

export async function getUserCars(userId: string) {
  if (!db) return (JSON.parse(localStorage.getItem('demo-garage') ?? '[]') as Car[]).filter((car) => car.userId === userId);
  const snapshot = await getDocs(query(collection(db, 'garage'), where('userId', '==', userId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Car[];
}

export async function updateCarPhoto(carId: string, photoUrl: string) {
  if (!db) {
    const cars = JSON.parse(localStorage.getItem('demo-garage') ?? '[]') as Car[];
    localStorage.setItem('demo-garage', JSON.stringify(cars.map((car) => (car.id === carId ? { ...car, photoUrl } : car))));
    return;
  }
  await updateDoc(doc(db, 'garage', carId), { photoUrl });
}

export async function appendCarPartHistory(carId: string, partsHistory: CarPartHistoryItem[]) {
  if (!db) return;
  await updateDoc(doc(db, 'garage', carId), { partsHistory });
}
