const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');

class TextractAdapter {
  constructor(config = {}) {
    this.client = new TextractClient({
      region: config.AWS_REGION || process.env.AWS_REGION || 'ap-south-1',
    });
  }

  async analyzeDocument({ Document, FeatureTypes = ['TABLES', 'FORMS'] }) {
    const command = new AnalyzeDocumentCommand({
      Document,
      FeatureTypes,
    });
    const response = await this.client.send(command);
    return { Blocks: response.Blocks || [] };
  }

  extractInvoiceFields(blocks) {
    const keyMap = new Map();
    const valueMap = new Map();
    const blockMap = new Map();

    blocks.forEach(block => {
      blockMap.set(block.Id, block);
      if (block.BlockType === 'KEY_VALUE_SET') {
        if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
          keyMap.set(block.Id, block);
        } else {
          valueMap.set(block.Id, block);
        }
      }
    });

    const getText = (result, blocksMap) => {
      let text = '';
      if (result.Relationships) {
        result.Relationships.forEach(relationship => {
          if (relationship.Type === 'CHILD') {
            relationship.Ids.forEach(childId => {
              const child = blocksMap.get(childId);
              if (child && child.BlockType === 'WORD') {
                text += child.Text + ' ';
              }
              if (
                child &&
                child.BlockType === 'SELECTION_ELEMENT' &&
                child.SelectionStatus === 'SELECTED'
              ) {
                text += 'X ';
              }
            });
          }
        });
      }
      return text.trim();
    };

    const keyValues = {};
    keyMap.forEach((keyBlock, _keyId) => {
      let valueBlock = null;
      if (keyBlock.Relationships) {
        keyBlock.Relationships.forEach(relationship => {
          if (relationship.Type === 'VALUE') {
            relationship.Ids.forEach(valueId => {
              valueBlock = valueMap.get(valueId);
            });
          }
        });
      }
      const key = getText(keyBlock, blockMap);
      const value = valueBlock ? getText(valueBlock, blockMap) : '';
      if (key) keyValues[key.toLowerCase()] = value;
    });

    const tables = [];
    blocks.forEach(block => {
      if (block.BlockType === 'TABLE') {
        const table = { rows: [] };
        if (block.Relationships) {
          block.Relationships.forEach(relationship => {
            if (relationship.Type === 'CHILD') {
              relationship.Ids.forEach(cellId => {
                const cell = blockMap.get(cellId);
                if (cell && cell.BlockType === 'CELL') {
                  while (table.rows.length <= cell.RowIndex - 1) table.rows.push([]);
                  table.rows[cell.RowIndex - 1][cell.ColumnIndex - 1] = getText(cell, blockMap);
                }
              });
            }
          });
        }
        tables.push(table);
      }
    });

    const rawText = blocks
      .filter(b => b.BlockType === 'LINE')
      .map(b => b.Text)
      .join('\n');

    const invoiceNumber =
      keyValues['invoice no'] || keyValues['invoice number'] || keyValues['bill no'] || '';
    const vendorName =
      keyValues['vendor name'] || keyValues['supplier name'] || keyValues['from'] || '';
    const amountStr =
      keyValues['total amount'] || keyValues['grand total'] || keyValues['amount'] || '';
    const gstin = keyValues['gstin'] || keyValues['gst no'] || keyValues['gst number'] || '';
    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

    const confidence =
      blocks.filter(b => b.Confidence !== undefined).reduce((sum, b) => sum + b.Confidence, 0) /
      Math.max(blocks.filter(b => b.Confidence !== undefined).length, 1);

    return {
      invoiceNumber,
      vendorName,
      amount,
      gstin,
      confidence: Math.round(confidence),
      rawText,
      tables,
    };
  }
}

module.exports = { TextractAdapter };
