const fs=require("fs");
const path=require("path");

const srcDir=path.join(__dirname,"..","node_modules","stockfish","bin");
const outDir=path.join(__dirname,"..","public","engine");
fs.mkdirSync(outDir,{recursive:true});

for(const file of ["stockfish-18-lite-single.js","stockfish-18-lite-single.wasm"]){
  const src=path.join(srcDir,file);
  const dst=path.join(outDir,file);
  if(!fs.existsSync(src)){
    console.error(`Missing ${src}. Run npm install again.`);
    process.exit(1);
  }
  fs.copyFileSync(src,dst);
  console.log(`Copied ${file}`);
}
