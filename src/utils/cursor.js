'use strict';

function encodeCursor(cursorData) {
  const payload = JSON.stringify({
    updated_at: cursorData.updated_at instanceof Date
      ? cursorData.updated_at.toISOString()
      : cursorData.updated_at,
    id: cursorData.id,
  });
  return Buffer.from(payload).toString('base64');
}

function decodeCursor(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Cursor must be a non-empty string.');
  }

  let parsed;
  try {
    const json = Buffer.from(token, 'base64').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Cursor is not valid Base64 JSON.');
  }

  if (
    !parsed.updated_at ||
    typeof parsed.updated_at !== 'string' ||
    isNaN(Date.parse(parsed.updated_at))
  ) {
    throw new Error('Cursor.updated_at must be a valid ISO-8601 date string.');
  }

  if (!Number.isInteger(parsed.id) || parsed.id <= 0) {
    throw new Error('Cursor.id must be a positive integer.');
  }

  return {
    updated_at: parsed.updated_at,
    id:         parsed.id,
  };
}

module.exports = { encodeCursor, decodeCursor };
