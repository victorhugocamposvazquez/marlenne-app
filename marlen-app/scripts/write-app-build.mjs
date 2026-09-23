import { writeFileSync } from 'node:fs';

const id = (process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev').trim();
writeFileSync('public/app-build.txt', `${id}\n`);
