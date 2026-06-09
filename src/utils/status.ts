import type { OrderStatus, PaymentMethod, ReturnReason } from '../types';

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: 'новый',
  checking: 'проверяю',
  awaiting_payment: 'ожидает оплаты',
  ordered: 'заказан',
  in_transit: 'в пути',
  arrived: 'пришел',
  ready_for_pickup: 'готов к выдаче',
  issued: 'выдан',
  cancelled: 'отменен',
  return: 'возврат',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'наличные',
  transfer: 'перевод',
  sbp: 'СБП',
};

export const returnReasonLabels: Record<ReturnReason, string> = {
  not_fit: 'не подошло',
  defect: 'брак',
  other: 'другое',
};
