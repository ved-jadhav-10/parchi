// The sample e-pharmacy account used until real orders exist: tests/fixtures/demo_orders.json.
import fixture from '../../../tests/fixtures/demo_orders.json'
import type { Order } from './types'

export const demoOrders: Order[] = fixture.orders as Order[]
