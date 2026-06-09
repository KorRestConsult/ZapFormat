import type { OrderStatus } from '../types';

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: 'новая заявка',
  checking: 'проверяется',
  price_confirmed: 'цена подтверждена',
  awaiting_payment: 'ожидает оплаты',
  ordered_from_supplier: 'заказано у поставщика',
  in_transit: 'в пути',
  ready_for_pickup: 'готово к выдаче',
  issued: 'выдано',
  cancelled: 'отменено',
};
