class MockTextractAdapter {
  constructor() {
    this.extractionDelay = 100;
  }
  async analyzeDocument({ Document, FeatureTypes = ['TABLES', 'FORMS'] }) {
    await new Promise(r => setTimeout(r, this.extractionDelay));
    const isPdf = Document?.Bytes?.[0] === 0x25;
    const mockText = isPdf
      ? 'INVOICE\nInvoice No: DEMO-850K-001\nDate: 2026-01-15\nVendor: Demo Food Supplies Pvt Ltd\nGSTIN: SYNTHETIC-VENDOR-GSTIN\n\nItem          Qty    Rate     Amount\nFood Kits     1000   850.00   850000.00\n\nTotal: 850000.00\nCGST: 76500.00\nSGST: 76500.00\nGrand Total: 1003000.00'
      : 'DELIVERY PROOF\nDistribution ID: dist-123\nDate: 2026-01-16\nLocation: Dhubri, Assam\nBeneficiary: Household-1\nQuantity: 10\nSignature: [Verified]';
    const blocks = [
      { BlockType: 'PAGE', Text: mockText },
      { BlockType: 'LINE', Text: 'Invoice No: DEMO-850K-001', Confidence: 98 },
      { BlockType: 'LINE', Text: 'Vendor: Demo Food Supplies Pvt Ltd', Confidence: 95 },
      { BlockType: 'LINE', Text: 'GSTIN: SYNTHETIC-VENDOR-GSTIN', Confidence: 92 },
      { BlockType: 'LINE', Text: 'Food Kits     1000   850.00   850000.00', Confidence: 90 },
      { BlockType: 'LINE', Text: 'Total: 850000.00', Confidence: 99 },
    ];
    return {
      Blocks: blocks,
      DocumentMetadata: { Pages: 1 },
      AnalyzeDocumentModelVersion: 'mock-1.0',
    };
  }
  async startDocumentAnalysis({
    DocumentLocation,
    FeatureTypes,
    NotificationChannel,
    OutputConfig,
  }) {
    return { JobId: `textract-job-${Date.now()}`, JobStatus: 'IN_PROGRESS' };
  }
  async getDocumentAnalysis({ JobId }) {
    await new Promise(r => setTimeout(r, this.extractionDelay));
    return { JobStatus: 'SUCCEEDED', Blocks: [], DocumentMetadata: { Pages: 1 } };
  }
  extractInvoiceFields(blocks) {
    const text = blocks.map(b => b.Text || '').join('\n');
    const invoiceNumber = text.match(/Invoice No[:\s]+([A-Z0-9\-]+)/i)?.[1] || 'UNKNOWN';
    const vendorName = text.match(/Vendor[:\s]+([^\n]+)/i)?.[1] || 'UNKNOWN';
    const gstin = text.match(/GSTIN[:\s]+([A-Z0-9]+)/i)?.[1] || 'UNKNOWN';
    const amountMatch = text.match(/Total[:\s]+([\d,]+\.?\d*)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    return { invoiceNumber, vendorName, gstin, amount, rawText: text, confidence: 95 };
  }
}

module.exports = { MockTextractAdapter };
