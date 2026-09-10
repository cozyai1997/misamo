(function () {
  'use strict';

  const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'A']);
  const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM']);
  const IMAGE_ID = /^[a-zA-Z0-9_-]{1,100}$/;
  const ALIGNMENTS = new Set(['left', 'center', 'right']);
  const ALIGNABLE = new Set(['P', 'DIV', 'H2', 'H3', 'LI', 'UL', 'OL', 'IMG']);
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
        const alignment = element.getAttribute('data-align');
        if (DROP_WITH_CONTENT.has(tag)) {
          element.remove();
          return;
        }
        if (tag === 'IMG') {
          const id = element.getAttribute('data-image-id') || '';
          const rawWidth = element.getAttribute('data-image-width') || '';
          const width = /^\d+(?:\.\d{1,2})?$/.test(rawWidth) ? Number(rawWidth) : NaN;
          if (!IMAGE_ID.test(id)) {
            element.remove();
            return;
          }
          Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
          element.setAttribute('data-image-id', id);
          if (width >= 10 && width <= 100) element.setAttribute('data-image-width', String(width));
          if (ALIGNMENTS.has(alignment)) element.setAttribute('data-align', alignment);
          return;
        }
        if (!ALLOWED_TAGS.has(tag)) {
          element.replaceWith(...element.childNodes);
          return;
        }
        const href = tag === 'A' ? element.getAttribute('href') || '' : '';
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
        if (ALIGNABLE.has(tag) && ALIGNMENTS.has(alignment)) element.setAttribute('data-align', alignment);
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
      template.content.querySelectorAll('[data-align]').forEach(element => {
        if (element.tagName !== 'IMG') element.style.textAlign = element.dataset.align;
      });
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
        if (element.dataset.imageWidth) element.style.width = `${element.dataset.imageWidth}%`;
        if (element.dataset.align) {
          const align = element.dataset.align;
          element.style.marginLeft = align === 'left' ? '0' : 'auto';
          element.style.marginRight = align === 'right' ? '0' : 'auto';
        }
      });
      return template.innerHTML;
    }

    return { sanitizeHtml, renderHtml, inlineImageIds };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createMisamoContent };
  if (typeof window !== 'undefined') window.MisamoContent = createMisamoContent(window.document);
})();
