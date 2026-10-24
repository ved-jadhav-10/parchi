// The sample e-pharmacy account used until real orders exist: tests/fixtures/demo_history.json.
import fixture from '../../../tests/fixtures/demo_history.json'
import type { Order } from './types'

export const demoOrders: Order[] = fixture.orders as Order[]
