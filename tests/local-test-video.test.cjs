const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../local-test-video.js'),'utf8');
function load(hostname,posts=[]) {
  const window={location:{hostname},MisamoStore:{getPosts:()=>structuredClone(posts)}};
  vm.runInNewContext(code,{window});
  return JSON.parse(JSON.stringify(window.MisamoStore.getPosts()));
}
test('video fixture is shared by empty local browser stores without changing their stored posts',()=>{
  const a=load('127.0.0.1'), b=load('localhost');
  assert.deepEqual(a,b);assert.equal(a.length,1);
  assert.equal(a[0].video.ratio,'4:3');assert.equal(a[0].video.source,'asset');
  assert.equal(a[0].video.width,720);assert.equal(a[0].video.duration,19.747075);
});
test('video fixture preserves existing posts and deduplicates its stable id',()=>{
  const sample=load('127.0.0.1')[0];sample.title='user edit';
  const original=[sample,{id:'mine',title:'original'}];
  assert.deepEqual(load('127.0.0.1',original),original);
});
test('local sample is disabled on public deployments',()=>{
  assert.deepEqual(load('misamo-indol.vercel.app'),[]);
});
