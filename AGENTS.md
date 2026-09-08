<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## SSG and Redirects
- **generateStaticParams & Fallbacks**: If you implement redirect logic inside a dynamic route (e.g. redirecting from a numeric `ID` to an SEO `slug` in `[slug]/page.tsx`), you **MUST** return those alternative identifiers (like the IDs) from `generateStaticParams`. If they are not pre-rendered, Next.js will immediately return a 404 Not Found without ever executing your redirect code.
