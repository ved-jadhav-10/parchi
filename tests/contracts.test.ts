import { describe, it, expect } from 'vitest'
import demo from './fixtures/demo_rx.json'

describe('demo fixture', () => {
  it('has seven prescription lines', () => {
    expect(demo.expected.resolver).toHaveLength(7)
  })
})
