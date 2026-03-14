// AssistantNet — Shared Utilities

/**
 * Escape HTML attribute values to prevent XSS
 */
export function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Escape HTML content to prevent XSS — converts all special chars to entities
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
