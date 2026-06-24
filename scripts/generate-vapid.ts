/**
 * Generate VAPID keys for web-push.
 *   npm run cron:tick is unrelated; you can run this with: npx tsx scripts/generate-vapid.ts
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("\nAlso set NEXT_PUBLIC_VAPID_PUBLIC_KEY to the public value.");
