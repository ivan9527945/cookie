/**
 * Pipeline error 類別。讓上層可以區分「無法繼續、要中斷整個 batch」的硬錯誤
 * 與「單 chunk 失敗、其他繼續跑」的軟錯誤。
 */

export class BillingError extends Error {
  /** 對應前端 status.code，用來決定要不要跳 billing Dialog */
  static readonly CODE = 'billing_insufficient';

  constructor(message?: string) {
    super(
      message ??
        'Anthropic API 額度不足。請至 https://console.anthropic.com/settings/billing 充值後再試。'
    );
    this.name = 'BillingError';
  }
}

/** Anthropic SDK 在餘額不足時回 400 + 這個訊息片段 */
export function isAnthropicBillingMessage(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const msg = 'message' in err ? String((err as { message: unknown }).message) : '';
  return /credit balance is too low/i.test(msg);
}
