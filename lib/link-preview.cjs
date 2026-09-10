'use strict';
const https = require('node:https');
const dns = require('node:dns').promises;
const { isIP } = require('node:net');
const resolveIPv4 = async hostname => (await dns.lookup(hostname,{family:4,all:true})).map(result=>result.address);

function publicIPv4(ip) {
  if (isIP(ip) !== 4) return false;
  const [a,b,c] = ip.split('.').map(Number);
  return !(a===0 || a===10 || a===127 || a>=224 || (a===100 && b>=64 && b<=127) ||
    (a===169 && b===254) || (a===172 && b>=16 && b<=31) ||
    (a===192 && (b===168 || b===0 || (b===88 && c===99))) ||
    (a===198 && (b===18 || b===19 || (b===51 && c===100))) || (a===203 && b===0 && c===113));
}
function validateUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid URL');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.hostname.includes(':') || !url.hostname.includes('.') ||
      (isIP(url.hostname) && !publicIPv4(url.hostname))) throw new Error('Invalid URL');
  url.hash = '';
  return url;
}
async function publicAddress(url, resolve = resolveIPv4) {
  const addresses = isIP(url.hostname) ? [url.hostname] : await resolve(url.hostname);
  if (!addresses.length || !addresses.every(publicIPv4)) throw new Error('Unavailable');
  return addresses[0];
}
function decode(value) {
  const named = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()] || match;
    const number = parseInt(entity.slice(entity[1].toLowerCase()==='x'?2:1), entity[1].toLowerCase()==='x'?16:10);
    return number>0 && number<=0x10ffff ? String.fromCodePoint(number) : '';
  }).replace(/\s+/g,' ').trim();
}
function metadata(html, source) {
  // Metadata is data only: never execute scripts or return remote HTML.
  const fields = new Map();
  const lower=html.toLowerCase();let position=0;let pageTitle='';
  // Move forward exactly once, including malformed/unclosed tags. Avoid regex
  // scans which retry a long missing closing tag at every opening delimiter.
  while(position<html.length) {
    const start=html.indexOf('<',position);if(start<0) break;
    if(lower.startsWith('<!--',start)) {const end=lower.indexOf('-->',start+4);position=end<0?html.length:end+3;continue;}
    const end=html.indexOf('>',start+1);if(end<0) break;
    const token=html.slice(start,end+1);position=end+1;
    const tag=token.match(/^<([a-z][a-z0-9:-]*)\b/i)?.[1].toLowerCase();
    if(tag==='script' || tag==='style' || tag==='title') {
      const close=lower.indexOf(`</${tag}`,position);
      if(tag==='title' && !pageTitle && close>=0) pageTitle=decode(html.slice(position,Math.min(close,position+8192)));
      position=close<0?html.length:close;continue;
    }
    if(tag!=='meta' || token.length>8192) continue;
    const attributes = {};
    for (const part of token.matchAll(/\b(property|name|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) attributes[part[1].toLowerCase()] = decode(part[2] ?? part[3] ?? part[4]);
    const name = (attributes.property || attributes.name || '').toLowerCase();
    if (!fields.has(name)) fields.set(name, attributes.content || '');
  }
  const title = fields.get('og:title') || fields.get('twitter:title') || pageTitle || new URL(source).hostname;
  let image = '';
  try { image = validateUrl(new URL(fields.get('og:image') || fields.get('twitter:image') || '', source).href).href; } catch (_) {}
  if (!fields.get('og:image') && !fields.get('twitter:image')) image = '';
  return {url:source, title:title.slice(0,200), description:(fields.get('og:description') || fields.get('description') || fields.get('twitter:description') || '').slice(0,300), image};
}
function readPage(url, address, signal) {
  return new Promise((resolve,reject) => {
    const request = https.get(url, {
      signal, agent:false, family:4,
      // Pin the validated address. The original hostname still supplies TLS SNI and Host.
      lookup:(_hostname, options, callback) => callback(null, options?.all ? [{address,family:4}] : address, 4),
      headers:{'User-Agent':'Misamo-LinkPreview/1.0','Accept':'text/html','Accept-Encoding':'identity'}
    }, response => {
      if ([301,302,303,307,308].includes(response.statusCode)) {
        const location = response.headers.location; response.destroy(); resolve({location}); return;
      }
      if (response.statusCode!==200 || !/^text\/html\b/i.test(response.headers['content-type'] || '') ||
          !['identity',''].includes(response.headers['content-encoding'] || '')) {
        response.destroy(); reject(new Error('Unavailable')); return;
      }
      let size=0; const chunks=[];
      response.on('data',chunk=>{size+=chunk.length;if(size>524288){response.destroy(new Error('Too large'));return;}chunks.push(chunk);});
      response.on('error',reject);
      response.on('end',()=>resolve({html:Buffer.concat(chunks).toString('utf8')}));
    });
    request.on('error',reject);
  });
}
async function getPreview(value, dependencies={}) {
  const resolve = dependencies.resolve || resolveIPv4;
  const read = dependencies.read || readPage;
  const controller = new AbortController();
  const deadline=Date.now()+5000;
  const timeout = setTimeout(()=>controller.abort(),5000);
  const aborted = new Promise((_, reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('Timeout')),{once:true}));
  async function run() {
    let url = validateUrl(value);
    for (let redirects=0;redirects<=3;redirects++) {
      const address = await publicAddress(url,resolve);
      if(controller.signal.aborted) throw new Error('Timeout');
      const result = await read(url,address,controller.signal);
      if (result.location) {url=validateUrl(new URL(result.location,url).href);continue;}
      if (typeof result.html !== 'string') throw new Error('Unavailable');
      const data = metadata(result.html,url.href);
      if(data.image) {try {await publicAddress(validateUrl(data.image),resolve);}catch(_){data.image='';}}
      if(controller.signal.aborted || Date.now()>deadline) throw new Error('Timeout');
      return data;
    }
    throw new Error('Too many redirects');
  }
  try {return await Promise.race([run(),aborted]);} finally {clearTimeout(timeout);controller.abort();}
}
module.exports = { publicIPv4, validateUrl, metadata, getPreview };
