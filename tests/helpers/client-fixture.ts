import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
/** Test-only module boundaries. Production pages/actions are never rewritten to bypass auth. */
export async function clientFixture<T>(entry:string,stubs:Record<string,string>):Promise<T>{
  const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'test-boundaries',setup(builder){
    builder.onResolve({filter:/.*/},args=>Object.hasOwn(stubs,args.path)?{path:args.path,namespace:'fixture'}:undefined);
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'js'}));
  }}]});
  const evaluated:{exports:unknown}={exports:{}};
  const require=createRequire(path.join(process.cwd(),'tests','fixture.cjs'));
  new Function('require','module','exports',result.outputFiles[0].text)(require,evaluated,evaluated.exports);
  return evaluated.exports as T;
}
