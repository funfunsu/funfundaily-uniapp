// Financial-plan mock has been retired alongside the legacy detail/edit pages.
// The API client only consults this module when config.mock is true; we keep
// a stub here so existing imports continue to resolve without dragging in any
// obsolete entity shapes.

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface MockEnvelope<T> {
  code: string
  message: string
  data: T
  traceId?: string
}

export function handleFinancialPlanMockRequest(
  _method: Method,
  _url: string,
  _data?: unknown,
): MockEnvelope<null> {
  return {
    code: 'FP_VALIDATION_FAILED',
    message: 'Financial-plan mock data has been removed; run against a real backend.',
    data: null,
  }
}
