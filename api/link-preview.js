'use strict';
const { getPreview } = require('../lib/link-preview.cjs');
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') {res.setHeader('Allow','GET');res.statusCode=405;res.end(JSON.stringify({error:'Method not allowed'}));return;}
  try {
    const url = new URL(req.url,'https://misamo.invalid').searchParams.get('url');
    const data = await getPreview(url);
    res.statusCode=200;res.end(JSON.stringify(data));
  } catch (_) {res.statusCode=422;res.end(JSON.stringify({error:'미리보기를 가져올 수 없습니다.'}));}
};
