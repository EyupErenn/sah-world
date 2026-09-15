const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {normalizeJourneyData,journeyPreferences}=require('../src/lib/normalizeJourney.ts');
const {buildSearchIndex,buildActivityFeed,mapIntegratedActivities}=require('../src/lib/activity.ts');
test('reproduces legacy gratitude crash; normalized data keeps content and renders',()=>{
 const raw={...normalizeJourneyData({}),sukurList:[{id:'keep-id',text:'Do not lose this',createdAt:'2026-09-15T08:00:00Z'}]};
 assert.throws(()=>buildSearchIndex(raw),TypeError);
 const recovered=normalizeJourneyData(raw);assert.equal(recovered.sukurList[0].text,'Do not lose this');assert.equal(recovered.sukurList[0].id,'keep-id');assert.deepEqual(recovered.sukurList[0].nimets,['','','']);assert.equal(buildSearchIndex(recovered).length,1);assert.equal(buildActivityFeed(recovered).length,1);
});
test('null collections, partial quadrants, old journal text, invalid dates do not crash',()=>{
 const recovered=normalizeJourneyData({xp:NaN,journal:[null,{id:'j',text:'Legacy journal',tags:null}],sukurList:null,eisenhower:{q1:null,q2:[{id:'t',text:'Keep task'}]},focusSessions:[{id:'f',taskLabel:null}],vehicle:{type:'__proto__'}});
 assert.equal(recovered.journal[0].content,'Legacy journal');assert.equal(recovered.xp,0);assert.equal(recovered.vehicle.type,'car');assert.equal(recovered.eisenhower.q2[0].text,'Keep task');assert.doesNotThrow(()=>buildSearchIndex(recovered));assert.doesNotThrow(()=>buildActivityFeed(recovered));assert.equal(recovered.journal[0].createdAt,'1970-01-01T00:00:00.000Z');
});
test('normalization preserves valid optional fields, gratitude slot positions and preferences',()=>{
 const data=normalizeJourneyData({journal:[{id:'j',content:'keep',sleep:8,ritualType:'sabah',entryMode:'quick',customValue:'keep'}],sukurList:[{id:'s',nimets:[null,'second','third']}],xp:794});assert.equal(data.xp,794);assert.equal(data.journal[0].sleep,8);assert.equal(data.journal[0].ritualType,'sabah');assert.equal(data.journal[0].customValue,'keep');assert.deepEqual(data.sukurList[0].nimets,['','second','third']);assert.deepEqual(journeyPreferences({vehicleChosen:true,currentTespih:12}),{vehicleChosen:true,currentTespih:12});
});
test('unknown activity categories and invalid timestamps cannot crash dashboard metadata',()=>{
 const valid={id:'1',category:'journal',occurredAt:'2026-09-15T08:00:00Z',xp:20,label:'Journal',detail:'',sourceView:'journal'};
 assert.deepEqual(mapIntegratedActivities([valid,{...valid,category:'new-server-category'},{...valid,category:'__proto__'},{...valid,occurredAt:'invalid'},null]).map(e=>e.id),['1']);
});
