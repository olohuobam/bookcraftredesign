import crypto from 'crypto'

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const LULU_CONFIG = {
  clientId: process.env.LULU_CLIENT_ID,
  clientSecret: process.env.LULU_CLIENT_SECRET,
  apiUrl: process.env.LULU_API_URL || (
    process.env.NODE_ENV === 'production'
      ? 'https://api.lulu.com'
      : 'https://api.sandbox.lulu.com'
  ),
  authUrl: process.env.LULU_AUTH_URL || (
    process.env.NODE_ENV === 'production'
      ? 'https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token'
      : 'https://api.sandbox.lulu.com/auth/realms/glasstree/protocol/openid-connect/token'
  ),
  webhookSecret: process.env.LULU_WEBHOOK_SECRET,
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type LuluPrintJobStatus =
  | 'CREATED'
  | 'UNPAID'
  | 'PAYMENT_IN_PROGRESS'
  | 'PRODUCTION_DELAY'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'CANCELLED'
  | 'ERROR'

export type LuluShippingLevel =
  | 'MAIL'
  | 'PRIORITY_MAIL'
  | 'GROUND_HD'
  | 'GROUND_BUS'
  | 'GROUND'
  | 'EXPEDITED'
  | 'EXPRESS'

export type LuluCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'

export interface LuluShippingAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state_code?: string
  country_code: string
  postcode: string
  phone_number?: string
}

export interface LuluLineItem {
  id?: string
  external_id?: string
  product_id?: string
  pod_package_id?: string
  quantity: number
  title: string
  print_cost?: string
  status?: string
  printable_normalization?: {
    cover?: { source_url: string }
    interior?: { source_url: string }
  }
}

export interface LuluPrintJob {
  id: string
  contact_email: string
  external_id?: string
  status: LuluPrintJobStatus
  line_items: Array<{
    id: string
    external_id?: string
    product_id: string
    quantity: number
    title: string
    print_cost: string
    status: string
  }>
  shipping_address: LuluShippingAddress
  shipping_level: LuluShippingLevel
  total_cost_excl_tax: string
  total_cost_incl_tax: string
  created: string
  updated: string
}

export interface CreatePrintJobParams {
  contact_email: string
  external_id?: string
  line_items: LuluLineItem[]
  production_delay?: number
  shipping_address: LuluShippingAddress
  shipping_level: LuluShippingLevel | string
}

export interface LuluShippingOption {
  id: string
  name: string
  description?: string
  delivery_time_min?: number
  delivery_time_max?: number
  cost?: string
}

export interface ShippingParams {
  country_code?: string
  state_code?: string
}

export interface PricingParams {
  line_items: Array<{
    pod_package_id: string
    quantity: number
  }>
  shipping_address: {
    city: string
    country_code: string
    postcode: string
    state_code?: string
    street1: string
    phone_number: string
  }
  shipping_option: LuluShippingLevel
  currency?: LuluCurrency
}

export interface LuluPricingResponse {
  currency: LuluCurrency
  total_cost_excl_tax: string
  total_cost_incl_tax: string
  total_tax: string
  total_discount_amount: string
  shipping_cost: {
    tax_rate: string
    total_cost_excl_tax: string
    total_cost_incl_tax: string
    total_tax: string
  }
  fulfillment_cost: {
    tax_rate: string
    total_cost_excl_tax: string
    total_cost_incl_tax: string
    total_tax: string
  }
  line_item_costs: Array<{
    pod_package_id: string
    quantity: number
    total_cost_excl_tax: string
    total_cost_incl_tax: string
    total_tax: string
    tax_rate: string
  }>
  shipping_address: {
    city: string
    country_code: string
    is_business: boolean
    name?: string
    phone_number: string
    postcode: string
    state_code: string
    street1: string
    street2: string
    warnings: Record<string, unknown>
    suggested_address: Record<string, unknown>
  }
  fees: Array<{
    fee_name: string
    fee_cost_excl_tax: string
    fee_cost_incl_tax: string
    fee_tax: string
    tax_rate: string
  }>
}

/** Named alias matching the task spec; semantically identical to PricingParams */
export type LuluPricingRequest = PricingParams

export interface LuluProductSpec {
  id: string
  pod_package_id: string
  name: string
  description?: string
  cover_dimensions?: { width: number; height: number }
  interior_dimensions?: { width: number; height: number }
  binding_type?: string
  paper_type?: string
  color_type?: string
}

export interface LuluWebhookPayload {
  topic: string
  data: LuluPrintJob
  webhook_id: string
  submission_id: string
}

export interface LuluWebhook {
  id: string
  is_active: boolean
  topics: string[]
  url: string
  created: string
  updated: string
}

// Legacy aliases
export type LuluCostCalculation = LuluPricingResponse
/** @deprecated Use LuluWebhookPayload */
export type LuluWebhookEvent = LuluWebhookPayload

// ─────────────────────────────────────────────
// Pod Package ID Map
// ─────────────────────────────────────────────

// Pod Package ID format: {size}{color}{quality}{binding}{paper}{cover_coating}
// Verified against Lulu Production API (2026-03-13)
// Key rules:
// - Full Color (FC) only works on white paper (060UW)
// - BW works on white (060UW), cream (060UC), and premium white (080CW)
// - Hardcover (HC) not available for these formats
// - Coil (CO) available for 6x9 only
// - Cover coating: MXX = matte, GXX = gloss
const POD_PACKAGE_MAP: Record<string, string> = {
  // ── Text Books (BW, various paper) ──────────────────────────────
  // 6x9 — standard novel
  '6x9_paperback_white_bw':         '0600X0900BWSTDPB060UW444MXX',
  '6x9_paperback_cream_bw':         '0600X0900BWSTDPB060UC444MXX',
  '6x9_paperback_premium_bw':       '0600X0900BWSTDPB080CW444MXX',
  '6x9_coil_white_bw':              '0600X0900BWSTDCO060UW444MXX',
  // 5.5x8.5 — compact novel
  '5.5x8.5_paperback_white_bw':     '0550X0850BWSTDPB060UW444MXX',
  '5.5x8.5_paperback_cream_bw':     '0550X0850BWSTDPB060UC444MXX',
  // 8.5x11 — large format text
  '8.5x11_paperback_white_bw':      '0850X1100BWSTDPB060UW444MXX',
  '8.5x11_paperback_cream_bw':      '0850X1100BWSTDPB060UC444MXX',

  // ── Picture Books (FC, white paper only) ────────────────────────
  // 8.5x8.5 — square picture book (recommended)
  '8.5x8.5_paperback_white_color':  '0850X0850FCSTDPB060UW444GXX',
  '8.5x8.5_paperback_premium_color':'0850X0850FCSTDPB080CW444GXX',
  // 7.5x7.5 — compact square
  '7.5x7.5_paperback_white_color':  '0750X0750FCSTDPB060UW444GXX',
  '7.5x7.5_paperback_premium_color':'0750X0750FCSTDPB080CW444GXX',
  // 8.5x11 — large portrait
  '8.5x11_paperback_white_color':   '0850X1100FCSTDPB060UW444GXX',
  '8.5x11_paperback_premium_color': '0850X1100FCSTDPB080CW444GXX',
  // 6x9 — portrait color
  '6x9_paperback_white_color':      '0600X0900FCSTDPB060UW444GXX',
  '6x9_coil_white_color':           '0600X0900FCSTDCO060UW444GXX',
}

// ─────────────────────────────────────────────
// Token Cache
// ─────────────────────────────────────────────

let tokenCache: {
  access_token?: string
  expires_at?: number
  refresh_token?: string
} = {}

// ─────────────────────────────────────────────
// LuluAPI Class
// ─────────────────────────────────────────────

export class LuluAPI {

  static async getToken(): Promise<string> {
    if (!LULU_CONFIG.clientId || !LULU_CONFIG.clientSecret) {
      throw new Error('Lulu API credentials not configured. Set LULU_CLIENT_ID and LULU_CLIENT_SECRET.')
    }
    if (tokenCache.access_token && tokenCache.expires_at && Date.now() < tokenCache.expires_at) {
      return tokenCache.access_token
    }
    const credentials = Buffer.from(
      `${LULU_CONFIG.clientId}:${LULU_CONFIG.clientSecret}`
    ).toString('base64')
    const response = await fetch(LULU_CONFIG.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Lulu token error: ${response.status} - ${text}`)
    }
    const data = await response.json()
    tokenCache = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
    }
    return data.access_token
  }

  /** @deprecated Use getToken() */
  static async generateToken(): Promise<string> {
    return this.getToken()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken()
    const response = await fetch(`${LULU_CONFIG.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers,
      },
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Lulu API ${response.status}: ${text}`)
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  /** @deprecated */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    return this.request(endpoint, options)
  }

  static async createPrintJob(params: CreatePrintJobParams): Promise<LuluPrintJob> {
    return this.request<LuluPrintJob>('/print-jobs/', { method: 'POST', body: JSON.stringify(params) })
  }

  static async createPrintJobWithBuffers(
    params: CreatePrintJobParams,
    coverPDF: Buffer,
    interiorPDF: Buffer
  ): Promise<LuluPrintJob> {
    const token = await this.getToken()
    const formData = new FormData()
    formData.append('print_job', JSON.stringify(params))
    formData.append('cover_file', new Blob([new Uint8Array(coverPDF)], { type: 'application/pdf' }), 'cover.pdf')
    formData.append('interior_file', new Blob([new Uint8Array(interiorPDF)], { type: 'application/pdf' }), 'interior.pdf')
    const response = await fetch(`${LULU_CONFIG.apiUrl}/print-jobs/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Lulu API ${response.status}: ${text}`)
    }
    return response.json()
  }

  static async getPrintJob(id: string): Promise<LuluPrintJob> {
    return this.request<LuluPrintJob>(`/print-jobs/${id}/`)
  }

  static async listPrintJobs(params?: {
    page?: number; page_size?: number; created_after?: string; created_before?: string; status?: string
  }): Promise<LuluPrintJob[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = params ? '?' + new URLSearchParams(params as any).toString() : ''
    const result = await this.request<{ results: LuluPrintJob[] } | LuluPrintJob[]>(`/print-jobs/${query}`)
    return Array.isArray(result) ? result : result.results
  }

  static async cancelPrintJob(id: string): Promise<void> {
    return this.request<void>(`/print-jobs/${id}/`, { method: 'DELETE' })
  }

  static async getShippingOptions(params?: ShippingParams): Promise<LuluShippingOption[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = params ? '?' + new URLSearchParams(params as any).toString() : ''
    const result = await this.request<{ results: LuluShippingOption[] } | LuluShippingOption[]>(`/shipping-options/${query}`)
    return Array.isArray(result) ? result : result.results
  }

  static async calculatePrice(params: PricingParams): Promise<LuluPricingResponse> {
    return this.request<LuluPricingResponse>('/print-job-cost-calculations/', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  /** @deprecated Use calculatePrice() */
  static async calculatePrintJobCosts(params: PricingParams): Promise<LuluPricingResponse> {
    return this.calculatePrice(params)
  }

  static async getProductSpecs(params?: { page?: number; page_size?: number }): Promise<LuluProductSpec[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = params ? '?' + new URLSearchParams(params as any).toString() : ''
    const result = await this.request<{ results: LuluProductSpec[] } | LuluProductSpec[]>(`/products/${query}`)
    return Array.isArray(result) ? result : result.results
  }

  /** @deprecated Use getProductSpecs() */
  static async getProducts(params?: { page?: number; page_size?: number }): Promise<LuluProductSpec[]> {
    return this.getProductSpecs(params)
  }

  static getPodPackageId(size: string, binding: string, paper: string, color: boolean): string {
    const key = `${size}_${binding}_${paper}_${color ? 'color' : 'bw'}`
    const id = POD_PACKAGE_MAP[key]
    if (!id) throw new Error(`No pod_package_id for ${key}. Available: ${Object.keys(POD_PACKAGE_MAP).join(', ')}`)
    return id
  }

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    // SECURITY: fail closed when the secret is not configured. Previously this
    // returned `true` and allowed forged Lulu webhook deliveries to be accepted
    // whenever LULU_WEBHOOK_SECRET was missing from the environment.
    if (!LULU_CONFIG.webhookSecret) {
      console.error('LULU_WEBHOOK_SECRET not configured - rejecting webhook')
      return false
    }
    if (!signature) return false
    try {
      const expected = crypto.createHmac('sha256', LULU_CONFIG.webhookSecret).update(payload, 'utf8').digest('hex')
      const provided = signature.replace(/^sha256=/, '')
      const expectedBuf = Buffer.from(expected, 'hex')
      const providedBuf = Buffer.from(provided, 'hex')
      if (expectedBuf.length !== providedBuf.length) return false
      return crypto.timingSafeEqual(expectedBuf, providedBuf)
    } catch {
      return false
    }
  }

  /** @deprecated Use verifyWebhookSignature() */
  static validateWebhookSignature(payload: string, signature: string): boolean {
    return this.verifyWebhookSignature(payload, signature)
  }

  static async createWebhook(data: { topics: string[]; url: string }): Promise<LuluWebhook> {
    return this.request<LuluWebhook>('/webhooks/', { method: 'POST', body: JSON.stringify(data) })
  }

  static async listWebhooks(): Promise<LuluWebhook[]> {
    const result = await this.request<{ results: LuluWebhook[] } | LuluWebhook[]>('/webhooks/')
    return Array.isArray(result) ? result : result.results
  }

  static async getWebhook(id: string): Promise<LuluWebhook> {
    return this.request<LuluWebhook>(`/webhooks/${id}/`)
  }

  static async updateWebhook(id: string, data: { topics?: string[]; url?: string; is_active?: boolean }): Promise<LuluWebhook> {
    return this.request<LuluWebhook>(`/webhooks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  static async deleteWebhook(id: string): Promise<void> {
    return this.request<void>(`/webhooks/${id}/`, { method: 'DELETE' })
  }

  static async testWebhook(id: string): Promise<void> {
    return this.request<void>(`/webhooks/${id}/test/`, { method: 'POST' })
  }

  static async getWebhookSubmissions(params?: {
    page?: number; page_size?: number; created_after?: string; created_before?: string
    is_success?: boolean; response_code?: string; webhook_id?: string
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.request(`/webhook-submissions/${query}`)
  }

  static async validateCover(data: { source_url: string }) {
    return this.request('/validate-cover/', { method: 'POST', body: JSON.stringify(data) })
  }

  static async validateInterior(data: { source_url: string }) {
    return this.request('/validate-interior/', { method: 'POST', body: JSON.stringify(data) })
  }

  static isConfigured(): boolean {
    return !!(LULU_CONFIG.clientId && LULU_CONFIG.clientSecret)
  }

  static getConfig() {
    return {
      apiUrl: LULU_CONFIG.apiUrl,
      authUrl: LULU_CONFIG.authUrl,
      isConfigured: this.isConfigured(),
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    }
  }
}
