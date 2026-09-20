// ML anomaly-scoring adapter: POSTs invoice features to the standalone
// ml-service (POST {ML_SERVICE_URL}/api/v1/predict). Fail-open by design:
// unconfigured URL, timeouts, or HTTP errors all resolve to null and the
// caller falls back to a zero ML component. Independent of
// FEATURE_MOCK_ADAPTERS so live scoring works in every mode.

class MLAdapter {
  constructor(config = {}) {
    const raw = (config.ML_SERVICE_URL || process.env.ML_SERVICE_URL || '').replace(/\/$/, '');
    this.baseUrl = raw.endsWith('/api/v1') ? raw.slice(0, -'/api/v1'.length) : raw;
    this.timeoutMs = Number(config.ML_TIMEOUT_MS || process.env.ML_TIMEOUT_MS || 5000);
  }

  get configured() {
    return this.baseUrl.length > 0;
  }

  buildInput({ invoice, purchaseOrder, vendor }) {
    const amount = Number(invoice.amount) || 0;
    const quantity = Number(invoice.quantity || purchaseOrder?.quantity || 1);
    const unitPrice = Number(invoice.unitPrice || (quantity > 0 ? amount / quantity : amount));
    const createdAt = vendor?.createdAt || vendor?.created_at;
    const vendorAgeYears = createdAt
      ? Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3.154e10)
      : 1;
    return {
      invoice_id: invoice.id,
      vendor_id: invoice.vendorId || purchaseOrder?.vendorId || 'unknown',
      total_amount: amount,
      quantity,
      unit_price: unitPrice,
      reference_unit_price: Number(invoice.referenceUnitPrice || unitPrice),
      price_deviation: Number(invoice.priceDeviation || 0),
      vendor_age_years: vendorAgeYears,
      vendor_tier: invoice.vendorTier || 'regular',
      category: invoice.category || purchaseOrder?.category || 'Other',
      invoice_datetime: invoice.createdAt || invoice.created_at || new Date().toISOString(),
    };
  }

  async scoreInvoice(input) {
    if (!this.configured) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/predict`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!res.ok) {
        if (process.env.LOG_LEVEL !== 'silent') {
          console.warn(
            JSON.stringify({
              level: 'warn',
              msg: 'ml_service_predict_failed',
              invoiceId: input && input.invoice_id,
              status: res.status,
              latencyMs: Date.now() - started,
            })
          );
        }
        return null;
      }
      const data = await res.json().catch(() => null);
      if (!data || typeof data.ml_anomaly_score !== 'number') return null;
      return {
        score: Math.min(1, Math.max(0, data.ml_anomaly_score)),
        isAnomaly: !!data.is_anomaly,
        modelVersion: data.model_version || 'isolation-forest-v1',
      };
    } catch (err) {
      // Fail-open by design: callers fall back to a zero ML component.
      if (process.env.LOG_LEVEL !== 'silent') {
        console.warn(
          JSON.stringify({
            level: 'warn',
            msg: 'ml_service_unreachable',
            invoiceId: input && input.invoice_id,
            error: err && err.name ? err.name : 'fetch_error',
            latencyMs: Date.now() - started,
          })
        );
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { MLAdapter };
