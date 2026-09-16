const http=require("http");
const fs=require("fs");
const path=require("path");
const root=path.join(__dirname,"public");
const port=Number(process.env.PORT||8080);

const mime={
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".wasm":"application/wasm",".json":"application/json; charset=utf-8",
  ".png":"image/png",".css":"text/css; charset=utf-8"
};

http.createServer((req,res)=>{
  let pathname=decodeURIComponent((req.url||"/").split("?")[0]);
  if(pathname==="/")pathname="/index.html";
  const file=path.normalize(path.join(root,pathname));
  if(!file.startsWith(root)){res.writeHead(403);res.end("Forbidden");return}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);res.end("Not found");return}
    res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");
    res.setHeader("Cache-Control",path.extname(file)===".wasm"?"public, max-age=31536000, immutable":"no-cache");
    res.writeHead(200);res.end(data);
  });
}).listen(port,()=>console.log(`Weird Chess: http://localhost:${port}`));
