import mysql from 'mysql2/promise';
import config from './src/config.js';
const conn=await mysql.createConnection({...config.db,charset:'utf8mb4_unicode_ci'});
const [rows]=await conn.query('SELECT id,content FROM note');
const fence='```live';
let live=0, html=0, md=0, empty=0;
for(const r of rows){
  const c=String(r.content||'').trim();
  if(!c){empty++;continue;}
  if(c.startsWith(fence)) live++;
  else if(/<(table|div|p|img|br|h[1-6]|ul|ol|strong|span)\b/i.test(c)) html++;
  else md++;
}
console.log(`总 ${rows.length}: live=${live} html=${html} markdown=${md} empty=${empty}`);
await conn.end();
