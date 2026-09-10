(function () {
  'use strict';

  const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'A']);
  const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM']);
  const IMAGE_ID = /^[a-zA-Z0-9_-]{1,100}$/;
  const IMAGE_SOURCE = /^data:image\/(?:jpeg|png|webp);base64,(?=[A-Za-z0-9+/])(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  function createMisamoContent(document) {
    function parseHtml(value) {
      const template = document.createElement('template');
      template.innerHTML = String(value || '');
      return template;
    }

    function sanitizeHtml(value) {
      const template = parseHtml(value);
      Array.from(template.content.querySelectorAll('*')).reverse().forEach((element) => {
        const tag = element.tagName.toUpperCase();
        if (DROP_WITH_CONTENT.has(tag)) {
          element.remove();
          return;
        }
        if (tag === 'IMG') {
          const id = element.getAttribute('data-image-id') || '';
          if (!IMAGE_ID.test(id)) {
            element.remove();
            return;
          }
          Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
          element.setAttribute('data-image-id', id);
          return;
        }
        if (!ALLOWED_TAGS.has(tag)) {
          element.replaceWith(...element.childNodes);
          return;
        }
        const href = tag === 'A' ? element.getAttribute('href') || '' : '';
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
        if (tag === 'A' && /^https:\/\//i.test(href)) {
          try {
            const url = new URL(href);
            if (url.protocol === 'https:') {
              element.setAttribute('href', url.href);
              element.setAttribute('target', '_blank');
              element.setAttribute('rel', 'noopener noreferrer');
            }
          } catch (_error) {
            element.replaceWith(...element.childNodes);
          }
        } else if (tag === 'A') {
          element.replaceWith(...element.childNodes);
        }
      });
      return template.innerHTML;
    }

    function inlineImageIds(value) {
      const template = parseHtml(sanitizeHtml(value));
      return [...new Set(Array.from(template.content.querySelectorAll('img[data-image-id]'), (image) => image.getAttribute('data-image-id')))];
    }

    function renderHtml(value, images) {
      const template = parseHtml(sanitizeHtml(value));
      const sources = new Map();
      (Array.isArray(images) ? images : []).forEach((image) => {
        if (image && typeof image.id === 'string' && IMAGE_ID.test(image.id) && typeof image.src === 'string' && IMAGE_SOURCE.test(image.src) && !sources.has(image.id)) {
          sources.set(image.id, image);
        }
      });
      template.content.querySelectorAll('img[data-image-id]').forEach((element) => {
        const image = sources.get(element.getAttribute('data-image-id'));
        if (!image) {
          element.remove();
          return;
        }
        element.setAttribute('src', image.src);
        element.setAttribute('alt', String(image.alt || ''));
        element.setAttribute('class', 'posting-inline-image');
        element.setAttribute('draggable', 'false');
      });
      return template.innerHTML;
    }

    return { sanitizeHtml, renderHtml, inlineImageIds };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createMisamoContent };
  if (typeof window !== 'undefined') window.MisamoContent = createMisamoContent(window.document);
})();
