const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../local-test-posts.js'),'utf8');
function load(hostname,stored=[]) {
  const original=JSON.stringify(stored);
  const window={location:{hostname},MisamoStore:{getPosts:()=>JSON.parse(original)}};
  vm.runInNewContext(code,{window});
  return window.MisamoStore.getPosts();
}
test('separate empty browser stores receive the same ten local fixtures without persistence',()=>{
  const a=load('127.0.0.1'); const b=load('localhost');
  assert.equal(a.length,10); assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(a[0].bodyText.length,14931); assert.equal(a[1].bodyText.length,8759);
});
test('existing seeded posts are not duplicated or replaced and authored data survives',()=>{
  const seed=load('127.0.0.1')[0]; seed.bodyText='existing edit';
  const own={id:'existing-user-post',title:'my post'};
  const stored=[seed,own];const original=JSON.stringify(stored);
  const merged=load('127.0.0.1',stored);
  assert.equal(merged.length,11);assert.equal(merged[0].bodyText,'existing edit');
  assert.equal(merged[1].id,own.id);assert.equal(JSON.stringify(stored),original);
});
test('shared temporary posts stay disabled on deployed domains',()=>{
  assert.equal(load('misamo-indol.vercel.app').length,0);
});
