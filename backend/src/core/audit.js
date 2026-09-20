const { createHash, randomUUID } = require('node:crypto');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function createAuditService(repo) {
  function append({ entityType, entityId, action, actorId, payload = {} }) {
    const logs = repo.list('auditLogs');
    const previous = Array.isArray(logs) && logs.length > 0 ? logs[logs.length - 1] : null;
    const event = {
      id: randomUUID(),
      entityType,
      entityId,
      action,
      actorId,
      payload,
      occurredAt: new Date().toISOString(),
    };
    const prevHash = previous?.rowHash || 'GENESIS';
    return repo.insert('auditLogs', {
      ...event,
      prevHash,
      rowHash: sha256(`${canonical(event)}|${prevHash}`),
    });
  }
  function verify() {
    let expectedPrevHash = 'GENESIS';
    for (const event of repo.list('auditLogs')) {
      const { prevHash, rowHash, createdAt, updatedAt, ...eventPayload } = event;
      const expectedHash = sha256(`${canonical(eventPayload)}|${expectedPrevHash}`);
      if (prevHash !== expectedPrevHash || rowHash !== expectedHash)
        return { valid: false, firstBrokenRecordId: event.id };
      expectedPrevHash = rowHash;
    }
    return { valid: true, recordsVerified: repo.list('auditLogs').length };
  }
  return { append, verify };
}

module.exports = { createAuditService };
