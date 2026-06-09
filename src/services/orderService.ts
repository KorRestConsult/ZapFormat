import { addDoc, collection, doc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Order, OrderStatus, PaymentStatus, ReturnRequest, VinRequest } from '../types';

export async function createOrder(order: Order) {
  if (!db) {
    const id = `demo-order-${Date.now()}`;
    const orders = JSON.parse(localStorage.getItem('demo-orders') ?? '[]') as Order[];
    localStorage.setItem('demo-orders', JSON.stringify([{ ...order, id }, ...orders]));
    return { id };
  }
  const created = await addDoc(collection(db, 'orders'), order);
  await setDoc(doc(db, 'clientOrders', created.id), makeClientOrder(order));
  const notifyUrl = import.meta.env.VITE_TELEGRAM_ORDER_WEBHOOK_URL;
  if (notifyUrl) {
    fetch(notifyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: created.id, ...order }),
    }).catch(() => undefined);
  }
  return created;
}

export async function createVinRequest(request: VinRequest) {
  if (!db) return { id: `demo-vin-${Date.now()}` };
  return addDoc(collection(db, 'vinRequests'), request);
}

export async function getUserOrders(userId: string) {
  if (!db) return (JSON.parse(localStorage.getItem('demo-orders') ?? '[]') as Order[]).filter((order) => order.userId === userId);
  const snapshot = await getDocs(query(collection(db, 'clientOrders'), where('userId', '==', userId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Order[];
}

export async function getAllOrders() {
  if (!db) return JSON.parse(localStorage.getItem('demo-orders') ?? '[]') as Order[];
  const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Order[];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, adminComment: string) {
  if (!db) return;
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    adminComment,
    internalComment: adminComment,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'clientOrders', orderId), {
    status,
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);
}

export async function updateOrderPrice(orderId: string, totalClientPrice: number, adminComment: string) {
  if (!db) return;
  await updateDoc(doc(db, 'orders', orderId), {
    totalClientPrice,
    adminComment,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'clientOrders', orderId), {
    totalClientPrice,
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);
}

export async function updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
  if (!db) return;
  await updateDoc(doc(db, 'orders', orderId), {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, 'clientOrders', orderId), {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);
}

export async function createReturnRequest(request: ReturnRequest) {
  if (!db) {
    const id = `demo-return-${Date.now()}`;
    const returns = JSON.parse(localStorage.getItem('demo-returns') ?? '[]') as ReturnRequest[];
    localStorage.setItem('demo-returns', JSON.stringify([{ ...request, id }, ...returns]));
    return { id };
  }
  return addDoc(collection(db, 'returns'), request);
}

export async function getUserReturns(userId: string) {
  if (!db) return (JSON.parse(localStorage.getItem('demo-returns') ?? '[]') as ReturnRequest[]).filter((item) => item.userId === userId);
  const snapshot = await getDocs(query(collection(db, 'returns'), where('userId', '==', userId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ReturnRequest[];
}

function makeClientOrder(order: Order): Order {
  return {
    ...order,
    totalPurchasePrice: 0,
    totalBasePrice: 0,
    totalMargin: 0,
    internalComment: '',
    adminComment: '',
    items: order.items.map((item) => ({
      ...item,
      purchasePrice: 0,
      basePrice: 0,
      marginRub: 0,
      supplier: '',
    })),
  };
}
