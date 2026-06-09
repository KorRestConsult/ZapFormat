import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Order, OrderStatus, PaymentStatus, VinRequest } from '../types';

export async function createOrder(order: Order) {
  return addDoc(collection(db, 'orders'), order);
}

export async function createVinRequest(request: VinRequest) {
  return addDoc(collection(db, 'vinRequests'), request);
}

export async function getUserOrders(userId: string) {
  const snapshot = await getDocs(query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Order[];
}

export async function getAllOrders() {
  const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Order[];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, adminComment: string) {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    adminComment,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateOrderPrice(orderId: string, totalClientPrice: number, adminComment: string) {
  await updateDoc(doc(db, 'orders', orderId), {
    totalClientPrice,
    adminComment,
    updatedAt: new Date().toISOString(),
  });
}

export async function updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
  await updateDoc(doc(db, 'orders', orderId), {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  });
}
