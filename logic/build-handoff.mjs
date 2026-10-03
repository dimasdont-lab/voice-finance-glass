/** Mechanical artifact packaging. Never reads or writes the original project. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
const docs=['START_HERE_CLAUDE.md','README.md','INTERACTIONS.md','DATA_MODEL.md','BACKEND.md','PROVENANCE.md','VERIFICATION.md'];
const modules=['index.mjs','integration-example.mjs','application.mjs','navigation.mjs','finance-core.mjs','input-parser.mjs','interaction-helpers.mjs','voice-capture.mjs','whisper-worker.js','market-service.mjs','banking-client.mjs','backend/worker.js','backend/schema.sql'];
const tests=['tests/application.test.mjs','tests/finance-core.test.mjs','tests/input-parser.test.mjs','tests/services.test.mjs','tests/handoff.test.mjs'];
const files=[...docs,...modules,...tests,'package.json','build-handoff.mjs'];
const buffers=new Map(files.map(name=>[name,readFileSync(join(root,name))]));
const contents=name=>buffers.get(name).toString('utf8').replace(/\r\n/g,'\n').trimEnd();

let bundle='# Voice Finance — вся логіка для Claude в одному файлі\n\n';
bundle+='Це самодостатня передача runtime-логіки основного Voice Finance, без візуалу й старого дока.\n';
bundle+='Кожний розділ нижче відповідає окремому файлу. Для запуску розклади код по цих іменах зі збереженням imports.\n';
bundle+='ZIP додатково містить виконувані тести; тут їхній результат описаний у VERIFICATION.md.\n\n';
bundle+='Порядок: інструкція → контракти/дані → інтеграція → runtime-модулі → backend.\n\n';
for(const name of docs){bundle+=`\n---\n\n## ФАЙЛ: ${name}\n\n${contents(name)}\n`;}
for(const name of modules){
  const language=name.endsWith('.sql')?'sql':'javascript';
  bundle+=`\n---\n\n## ФАЙЛ: ${name}\n\n~~~~${language}\n${contents(name)}\n~~~~\n`;
}
const manifest={
  source:{repository:'https://github.com/dimasdont-lab/voice-finance-free',commit:'193dedfba571707ea25727b52bda95baa7cad9bc',indexSha256:'82C167895CF6CA80EFAFA9CF03B0441CEC8F08FACDF524F8B87274A34957C18E'},
  files:files.map(name=>({path:name,bytes:buffers.get(name).length,sha256:createHash('sha256').update(buffers.get(name)).digest('hex')})),
  singleFile:{path:'CLAUDE_LOGIC_FULL.md',bytes:Buffer.byteLength(bundle),sha256:createHash('sha256').update(bundle).digest('hex')}
};
const outputs={'CLAUDE_LOGIC_FULL.md':bundle,'FILE_MANIFEST.json':JSON.stringify(manifest,null,2)+'\n'};
if(process.argv.includes('--check')){
  for(const [name,content] of Object.entries(outputs))if(readFileSync(join(root,name),'utf8')!==content)throw new Error(`Stale generated artifact: ${name}`);
  console.log(`Verified ${files.length} files and matching single-file bundle.`);
}else{
  for(const [name,content] of Object.entries(outputs))writeFileSync(join(root,name),content,'utf8');
  console.log(`Generated bundle (${Buffer.byteLength(bundle)} bytes) and manifest for ${files.length} files.`);
}
