// Generates the PWA PNG icons (192/512) into /public with no external deps.
// Runs automatically via the npm "predev"/"prebuild" scripts.
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return ~c>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const cd=Buffer.concat([t,data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(cd));return Buffer.concat([len,cd,crc]);}
function png(size){
  // gradient-ish brand square with simple scissors mark
  const w=size,h=size;
  const raw=Buffer.alloc((w*3+1)*h);
  function set(x,y,r,g,b){const o=y*(w*3+1)+1+x*3;raw[o]=r;raw[o+1]=g;raw[o+2]=b;}
  for(let y=0;y<h;y++){for(let x=0;x<w;x++){
    const t=(x+y)/(w+h);
    const r=Math.round(56+(3-56)*t);
    const g=Math.round(189+(105-189)*t);
    const b=Math.round(248+(161-248)*t);
    set(x,y,r,g,b);
  }}
  // draw two white diagonal lines (scissor blades)
  const cx=w*0.32, r=w*0.5;
  for(let i=0;i<w*0.7;i++){
    const x=Math.round(w*0.38+i*0.8);
    const y1=Math.round(h*0.4+i*0.32);
    const y2=Math.round(h*0.6-i*0.32);
    for(let d=-Math.max(1,w*0.02);d<=Math.max(1,w*0.02);d++){
      if(x>=0&&x<w){ if(y1+d>=0&&y1+d<h)set(x,y1+d,255,255,255); if(y2+d>=0&&y2+d<h)set(x,y2+d,255,255,255);}
    }
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  const idat=zlib.deflateSync(raw,{level:9});
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png(512));
console.log('PWA icons generated in', publicDir);
