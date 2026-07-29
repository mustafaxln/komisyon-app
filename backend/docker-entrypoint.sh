#!/bin/sh
set -e

echo "Postgres bekleniyor..."
until node -e "const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query('SELECT 1').then(()=>{console.log('DB hazır'); return p.end();}).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 2
done

echo "DB init çalışıyor..."
node src/db/init.js

echo "API başlıyor..."
exec node src/index.js
