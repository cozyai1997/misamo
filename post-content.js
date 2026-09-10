(function () {
  'use strict';

  const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'A']);
  const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM']);
  const IMAGE_ID = /^[a-zA-Z0-9_-]{1,100}$/;
  const ALIGNMENTS = new Set(['left', 'center', 'right']);
  const ALIGNABLE = new Set(['P', 'DIV', 'H2', 'H3', 'LI', 'UL', 'OL', 'IMG']);
  const IMAGE_SOURCE = /^data:image\/(?:jpeg|png|webp);base64,(?=[A-Za-z0-9+/])(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  function createMisamoContent(document) {
    function safeUrl(value) {
      try {const url=new URL(String(value || ''));return url.protocol==='https:' && !url.username && !url.password && url.href.length<=2048 ? url.href : '';} catch(_){return '';}
    }
    function linkCard(data) {
      const anchor=document.createElement('a');
      const href=safeUrl(data.url);if(!href) return '';
      anchor.href=href;anchor.dataset.linkCard='1';
      anchor.dataset.cardTitle=String(data.title || new URL(href).hostname).slice(0,200);
      anchor.dataset.cardDescription=String(data.description || '').slice(0,300);
      anchor.dataset.cardImage=safeUrl(data.image);
      anchor.textContent=anchor.dataset.cardTitle;
      return sanitizeHtml(anchor.outerHTML);
    }
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
        const card = tag==='A' && element.dataset.linkCard==='1' ? {
          title:element.dataset.cardTitle || '',description:element.dataset.cardDescription || '',image:safeUrl(element.dataset.cardImage),id:element.dataset.cardId,width:element.dataset.imageWidth
        } : null;
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
        if (ALIGNABLE.has(tag) && ALIGNMENTS.has(alignment)) element.setAttribute('data-align', alignment);
        if (tag === 'A' && /^https:\/\//i.test(href)) {
          try {
            const url = new URL(href);
            if (url.protocol === 'https:') {
              element.setAttribute('href', url.href);
              element.setAttribute('target', '_blank');
              element.setAttribute('rel', 'noopener noreferrer');
              if(card && safeUrl(href)) {
                element.dataset.linkCard='1';
                element.dataset.cardTitle=card.title.slice(0,200) || url.hostname;
                element.dataset.cardDescription=card.description.slice(0,300);
                element.dataset.cardImage=card.image;
                if(IMAGE_ID.test(card.id || '')) element.dataset.cardId=card.id;
                if(/^\d+(?:\.\d{1,2})?$/.test(card.width || '') && Number(card.width)>=10 && Number(card.width)<=100) element.dataset.imageWidth=String(Number(card.width));
                if(ALIGNMENTS.has(alignment)) element.dataset.align=alignment;
                element.textContent=element.dataset.cardTitle;
              }
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
      template.content.querySelectorAll('a[data-link-card="1"]').forEach(element=>{
        element.className='posting-link-card';element.contentEditable='false';
        if(element.dataset.imageWidth) {element.style.width=`${element.dataset.imageWidth}%`;element.style.maxWidth='100%';}
        if(element.dataset.align) {element.style.marginLeft=element.dataset.align==='left'?'0':'auto';element.style.marginRight=element.dataset.align==='right'?'0':'auto';element.style.textAlign='left';}
        element.setAttribute('contenteditable','false');element.setAttribute('draggable','false');
        element.textContent='';
        if(element.dataset.cardImage) {
          const image=document.createElement('img');image.src=element.dataset.cardImage;image.alt='';
          image.className='posting-link-thumbnail';image.loading='lazy';image.referrerPolicy='no-referrer';image.draggable=false;
          element.append(image);
        }
        const info=document.createElement('span');info.className='posting-link-info';
        for(const [name,text] of [['title',element.dataset.cardTitle],['description',element.dataset.cardDescription],['domain',new URL(element.href).hostname]]) {
          const line=document.createElement('span');line.className=`posting-link-${name}`;line.textContent=text;info.append(line);
        }
        element.append(info);
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

    return { sanitizeHtml, renderHtml, inlineImageIds, linkCard };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createMisamoContent };
  if (typeof window !== 'undefined') window.MisamoContent = createMisamoContent(window.document);
})();
