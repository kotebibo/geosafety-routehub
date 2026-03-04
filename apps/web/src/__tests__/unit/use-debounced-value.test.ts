import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 500))

    expect(result.current).toBe('hello')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    })

    expect(result.current).toBe('initial')

    // Change the value
    rerender({ value: 'updated', delay: 300 })

    // Before timer fires, still shows old value
    expect(result.current).toBe('initial')

    // Advance time past the delay
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current).toBe('updated')
  })

  it('should cancel previous timer on rapid updates', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'a', delay: 500 },
    })

    // Rapid updates
    rerender({ value: 'ab', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'abc', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'abcd', delay: 500 })

    // Only 400ms have passed since the first update, still showing initial
    expect(result.current).toBe('a')

    // Advance past the final delay
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should show only the last value, intermediate values are skipped
    expect(result.current).toBe('abcd')
  })

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'start', delay: 100 },
    })

    rerender({ value: 'end', delay: 100 })

    // Advance 50ms - not yet
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('start')

    // Advance another 50ms (total 100ms) - now it should update
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('end')
  })

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'first', delay: 0 },
    })

    rerender({ value: 'second', delay: 0 })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe('second')
  })

  it('should work with non-string types', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 42, delay: 200 },
    })

    expect(result.current).toBe(42)

    rerender({ value: 99, delay: 200 })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe(99)
  })

  it('should reset timer when delay changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'hello', delay: 300 },
    })

    // Change both value and delay
    rerender({ value: 'world', delay: 600 })

    // Advance 300ms - old delay would have fired, but new delay is 600ms
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('hello')

    // Advance another 300ms (total 600ms for the new delay)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('world')
  })
})
