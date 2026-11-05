// Cloudflare hosting (moving from Vercel, 2026-11-05): the Next.js app runs on Cloudflare
// Workers through the OpenNext adapter. Defaults are enough at this size: no incremental
// cache or queue, since every page reads live data.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
