// src/js/utils/debounce_utils.ts

/** Configuration options for debounce */
export interface DebounceOptions {
  leading?: boolean
  trailing?: boolean
}

/**
 * A debounced function with cancel and flush methods
 */
export interface DebouncedFunction<F extends (...args: any[]) => any> {
  (...args: Parameters<F>): ReturnType<F> | undefined
  cancel: () => void
  flush: () => ReturnType<F> | undefined
}

/**
 * Enhanced debounce function with immediate execution option and cancellation
 *
 * @param fn - Function to debounce
 * @param wait - Debounce wait time in milliseconds (default: 300)
 * @param options.leading - Execute on leading edge (default: false)
 * @param options.trailing - Execute on trailing edge (default: true)
 * @returns Debounced function
 */
export default function debounce<
  F extends (...args: any[]) => any
>(
  fn: F,
  wait: number = 300,
  options: DebounceOptions = {}
): DebouncedFunction<F> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<F> | null = null
  let lastThis: any = null
  let result: ReturnType<F> | undefined

  const { leading = false, trailing = true } = options

  const invokeFunc = (): ReturnType<F> | undefined => {
    if (lastArgs) {
      result = fn.apply(lastThis, lastArgs)
      lastArgs = lastThis = null
    }
    return result
  }

  const cancel = (): void => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  const later = (): void => {
    timeout = null
    if (trailing && lastArgs) {
      invokeFunc()
    }
  }

  const debounced = function (
    this: any,
    ...args: Parameters<F>
  ): ReturnType<F> | undefined {
    lastArgs = args
    lastThis = this

    const shouldCallLeading = leading && !timeout

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)

    if (shouldCallLeading) {
      result = invokeFunc()
    }

    return result
  } as DebouncedFunction<F>

  debounced.cancel = (): void => {
    cancel()
    lastArgs = lastThis = null
  }

  debounced.flush = (): ReturnType<F> | undefined => {
    if (timeout) {
      cancel()
      return invokeFunc()
    }
    return result
  }

  return debounced
}