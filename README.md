# BRIDGE Vault

Scan business cards, extract contact info with OCR, and manage your leads. Mobile-first dark enterprise SaaS built with Next.js, Supabase, and TypeScript.

## Features

- **Camera capture** or image upload on mobile/desktop
- **OCR pipeline** with vision API support and Tesseract.js fallback
- **Structured parsing** of name, title, company, email, phone, website, address
- **Confidence scores** per extracted field
- **Enrichment layer** with domain normalization and lead summary generation
- **Duplicate detection** based on email, phone, or name+company match
- **Lead management** with status workflow (new / reviewed / contacted / qualified / archived)
- **Tags and notes** per lead
- **Search, filter, sort** leads
- **Excel export** (.xlsx) of filtered leads
- **Activity logging** with timestamps
- **Dark enterprise UI** with orange accent palette
- **PWA-friendly** manifest

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (Auth, Database, Storage)
- Tesseract.js / Vision API for OCR
- xlsx for Excel export
- Zod for validation
- React Hook Form
- Lucide React icons

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd bridge-vault
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file:

   ```
   supabase/migrations/00001_initial_schema.sql
   ```

   This creates all tables, indexes, RLS policies, the storage bucket, and triggers.

3. In **Authentication > Settings**, optionally disable email confirmation for local dev.

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | For admin operations |
| `OCR_PROVIDER` | No | `tesseract` (default) or `vision` |
| `OPENAI_API_KEY` | No | For GPT-4o vision OCR |
| `ANTHROPIC_API_KEY` | No | For Claude vision OCR |

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Create an account

Sign up with email/password at `/auth/sign-in`, then start scanning cards.

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    api/export/           # Excel export API route
    auth/                 # Sign in/up, callback
    dashboard/            # Main dashboard
    leads/                # Leads list + [id] detail
    scan/                 # Business card scanning
    settings/             # System status & config
  actions/                # Server actions (auth, leads, ocr)
  components/
    layout/               # AppShell, Header, Sidebar
    ui/                   # Button, Input, Badge, Modal, Toast, etc.
  lib/
    ocr/                  # OCR provider abstraction
      index.ts            # Provider factory
      parser.ts           # Text-to-fields parser
      tesseract-provider  # Tesseract.js implementation
      vision-provider     # OpenAI/Anthropic vision
    supabase/             # Client, server, middleware helpers
    duplicates.ts         # Duplicate detection
    enrichment.ts         # Domain inference, summary generation
    export.ts             # XLSX generation
    utils.ts              # Shared utilities
    validations.ts        # Zod schemas
  providers/              # React context providers
  types/                  # TypeScript types
supabase/
  migrations/             # SQL schema
  seed.sql                # Example seed data
```

## OCR Providers

The app uses a provider abstraction for OCR:

1. **Vision API** (preferred) — if `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set, uses the vision model to extract structured data directly from the card image with high accuracy.
2. **Tesseract.js** (fallback) — always available, runs locally. Extracts raw text then parses it with heuristic rules.

The provider is selected automatically based on available API keys.

## Excel Export

Navigate to `/leads`, apply any filters/search, then click "Export Excel". The export:
- Downloads a real `.xlsx` file
- Includes all lead fields
- Has frozen header row
- Auto-sized columns
- Formatted dates

## Changing Brand Colors

All brand tokens are centralized in `src/app/globals.css`. To change the entire color scheme, edit the `:root` CSS variables and the `@theme inline` block:

```css
@theme inline {
  --color-brand: #f36a21;        /* Change primary brand color */
  --color-brand-strong: #ff7b2f; /* Hover/active variant */
  --color-brand-soft: rgba(243, 106, 33, 0.14); /* Background tint */
  --color-bg: #07090d;           /* Main background */
  /* ... other tokens */
}
```

All components reference these tokens, so changes propagate everywhere.

## Deployment

### Vercel (recommended)

```bash
npm run build
# Deploy via Vercel CLI or connect your git repo
```

Set environment variables in Vercel project settings.

### Other platforms

The app is a standard Next.js application. Deploy to any platform that supports Next.js (Netlify, Railway, self-hosted, etc.).

## Seed Data

After creating a user account, you can insert example leads by editing `supabase/seed.sql`:

1. Replace `YOUR_USER_ID` with your actual user UUID (find it in Supabase Auth dashboard)
2. Uncomment the INSERT statements
3. Run in Supabase SQL Editor

## License

Private project.
