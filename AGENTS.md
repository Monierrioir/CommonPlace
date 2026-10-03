<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Vision

This is a whimsical, social culture-tracking application. Books are the heart of the product, but the long-term product will also support movies, TV series, theatre, games, music, exhibitions, podcasts, hobbies, and other cultural experiences.

The application should feel warm, playful, cozy, personal, tactile, and slightly magical rather than like a corporate dashboard.

The product is initially being built as a responsive web application for a very small private beta. It should work well on both desktop and mobile.

# Core Product Principles

1. Books are the primary experience.
2. Users can read and track multiple books at the same time.
3. Users can belong to multiple book clubs simultaneously.
4. A book club may eventually support multiple active or past books.
5. A user's library should visually resemble a real bookshelf rather than a generic card grid.
6. Real book cover artwork should be used when available.
7. Cultural activity should build a long-term personal archive.
8. Social functionality should complement the personal experience rather than dominate it.
9. AI should act as an intelligent curator, not as a generic chatbot.
10. AI-generated conclusions must be based on actual user data and should not invent user opinions.

# Future Culture World

The architecture should be extensible beyond books to:

- Movies
- TV series
- Theatre
- Games
- Music/albums
- Exhibitions
- Museums
- Podcasts
- Hobbies
- Other user-defined cultural experiences

Do not implement all of these in the initial MVP.

# Book Experience

Users should eventually be able to:

- Search real books.
- Add books to their library.
- Track multiple currently-reading books.
- Track reading progress independently for every book.
- Mark books as Want to Read, Currently Reading, Finished, DNF, or Favorite.
- Rate finished books.
- Save notes and reactions.
- Answer optional post-reading questions such as:
  - Favorite character
  - Least favorite character
  - Favorite aspect
  - Emotional reaction
  - Whether they would want to live in that fictional world
- See their books represented visually on shelves.

# Clubs

Users should be able to:

- Create clubs.
- Join multiple clubs.
- Leave clubs.
- Have different books associated with different clubs.
- Discuss books.
- Track shared reading progress/events.
- See club-level statistics and eventually club recaps.

Never impose a one-club-per-user limitation.

# Living Bookshelf & Customization

The user's bookshelf is a core identity feature of the product, not merely a list of books.

## Real books

When book data integration is implemented:

- Use real book metadata and real cover artwork when available from the selected book metadata provider.
- Do not permanently use generated/CSS replacement covers when a real cover is available.
- Preserve cover aspect ratios.
- Books should visually feel like physical objects placed on a shelf.
- Different books may have different apparent heights, widths, thicknesses, shadows, and positions.
- The bookshelf should feel organic and lived-in rather than like a uniform image grid.
- Subtle physical interactions such as lifting/sliding a book on hover are encouraged.
- Accessibility and usability remain more important than visual effects.

## Personal bookshelf

Users should eventually be able to choose and customize their personal bookshelf.

Potential customizable properties include:

- shelf material/style
- background/wall
- shelf arrangement
- lighting
- plants
- candles
- bookends
- small objects
- framed art
- decorative lights
- seasonal decorations
- other cosmetic objects

Customization should remain cosmetic and must never prevent normal use of the library.

The user's bookshelf configuration should eventually be stored separately from their book collection so that visual themes can evolve without changing library data.

## Progression

The product may include a lightweight progression/reward system.

Users can earn an in-app reward currency through meaningful cultural activity such as:

- finishing books
- participating in clubs
- completing reading goals
- writing meaningful reviews/reactions
- reaching reading milestones

Do not implement exact reward values yet.

Avoid designing manipulative engagement mechanics.

The reward system should celebrate cultural activity rather than pressure users into constant engagement.

## Cosmetic shop

Earned in-app currency may eventually be spent on cosmetic bookshelf items and themes.

Examples:

- lamps
- plants
- candles
- bookends
- shelf materials
- decorative lights
- small furniture
- artwork
- seasonal objects
- special bookshelf themes

The initial concept does NOT require real-money purchases.

Keep cosmetic inventory conceptually separate from the user's actual book library.

## Unlockable objects

Some cosmetics may be earned through achievements rather than purchased.

Examples:

- finishing the first book
- reading a number of books
- reaching a page milestone
- completing several books by an author
- participating in a club reading challenge

This system may later interact with Taste Profile and reading history.

## Onboarding

Future onboarding may allow the user to choose an initial bookshelf style from a small set of free options.

Do not implement onboarding yet.

## Future club spaces

Book clubs may eventually have their own shared visual reading room or bookshelf that evolves through group activity.

Do not implement this yet.

# Taste Intelligence

Long term, the application should build a Taste Profile from real user behavior such as:

- Ratings
- Finished books
- DNF books
- Favorites
- Rereads
- Authors
- Genres
- Themes
- Favorite characters
- Disliked characters
- Notes
- Reading activity
- Movie/TV/etc. activity when those modules exist

Some analytics should be deterministic and should NOT require AI, for example:

- Most-read author
- Highest-rated author
- Most-read genre
- Average ratings
- Reading totals

AI can later be used for deeper interpretation, cross-medium patterns, explanations, and recommendations.

# Recommendation Philosophy

Recommendations should eventually explain WHY something is recommended.

Example:

"Because you loved Crime and Punishment"

The explanation may consider themes, character style, atmosphere, author affinity, ratings, and other actual user signals.

Where useful, recommendations may also explain possible mismatches rather than pretending every recommendation is perfect.

# Playful Insights

The application may generate shareable, Onedio-style playful insights based on actual user activity.

Examples:

- Your literary soulmate
- Your fictional best friend
- Your fictional enemy
- The fictional world you belong in
- Your reader personality
- Your favorite author
- Your fictional red flag
- Your Reading Twin

These results must be derived from user data. Never fabricate preferences the user has not expressed.

# Recaps

The product should eventually have Spotify-Wrapped-inspired experiences without visually copying Spotify.

Potential recaps:

- Monthly cultural capsule
- Annual reading recap
- Annual culture recap
- Club recap
- Long-term taste evolution

The annual experience can combine books, movies, series, theatre, games, music, and hobbies when those modules exist.

# Visual Direction

The UI should be:

- Whimsical
- Cozy
- Editorial
- Warm
- Slightly magical
- Modern
- Clean
- Tactile

Avoid:

- Generic SaaS dashboards
- Excessive gradients
- Excessive glassmorphism
- Neon AI aesthetics
- Overuse of rounded cards
- Emoji-heavy final UI
- Making every feature look AI-generated

Bookshelves, paper, bookmarks, subtle texture, editorial typography, physical objects, small illustrations, gentle motion, and library/reading-room references can inspire the visual language.

Animations should be subtle and meaningful.

Examples:

- A book slightly moving out of a shelf on hover.
- Gentle page transitions.
- Small celebratory interaction when a book is finished.
- Objects in the user's cultural space gradually appearing as their collection grows.

Accessibility and usability take priority over decorative effects.

# Technical Direction

Current stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- App Router

Future likely services:

- Supabase for authentication and PostgreSQL database
- A book metadata provider for real book data and covers
- Vercel for deployment
- An AI API later, only where it creates meaningful value

Do not add a dependency when the same result can reasonably be achieved with the existing stack.

Keep components modular and reusable.

Use strong TypeScript types.

Prefer Server Components unless client-side state/interactivity is required.

Never expose secrets or API keys in client-side code.

Design database structures so future culture types can be added without rewriting the entire application.

# Development Process

We are developing incrementally.

Do NOT attempt to build the entire product at once.

Initial MVP priorities are:

1. Application shell and design system
2. Home
3. Book search
4. Personal library
5. Multiple currently-reading books
6. Authentication
7. Persistent database
8. Multiple book clubs
9. Post-reading experience
10. Basic profile

Later phases include:

- Social features
- Taste Profile
- Recommendations
- AI analysis
- Culture World
- Movies/TV/theatre/etc.
- Recaps/Wrapped
- Advanced social matching

When implementing a task:

- Preserve existing working functionality.
- Avoid unrelated refactors.
- Keep mobile responsiveness in mind.
- Check TypeScript and lint errors.
- Explain important architectural decisions briefly.
- Do not implement future features merely because they appear in this document.
