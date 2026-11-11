/*
 * Types of static image imports (`import poster from './poster.jpg'`). Next.js references them from next-env.d.ts,
 * which it generates and which is not committed; on a fresh checkout `npm run typecheck` runs before any Next.js
 * command has written that file, so the reference is made here as well.
 */
/// <reference types="next/image-types/global" />
