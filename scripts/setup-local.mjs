import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env.local')) { console.log('.env.local already exists; nothing changed.'); }
else {
  const token = () => randomBytes(32).toString('hex');
  writeFileSync('.env.local', `LOCAL_STORE=true\nTEST_DEVICE_TOKEN=${token()}\nROOM_DEVICE_TOKEN=${token()}\nDASHBOARD_API_TOKEN=${token()}\n`, { mode: 0o600 });
  console.log('Created .env.local with separate random device tokens. Tokens were not printed.');
}
