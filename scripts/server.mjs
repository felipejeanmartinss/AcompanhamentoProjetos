import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = { ".css":"text/css; charset=utf-8", ".csv":"text/csv; charset=utf-8", ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8" };
createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = normalize(join(root, relative));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404, { "Content-Type":"text/plain; charset=utf-8" });
    response.end("Não encontrado");
    return;
  }
  response.writeHead(200, { "Content-Type":types[extname(file)] || "application/octet-stream", "Cache-Control":"no-store" });
  createReadStream(file).pipe(response);
}).listen(port, () => process.stdout.write(`Acompanhamento Comercial em http://localhost:${port}\n`));
