# Memory: index.md

EDawis Academic Council Voting System - Karakalpak/Russian bilingual, PIN-based auth, secret ballot voting

## Design
- Teal primary (174 62% 32%), navy accent (210 55% 20%)
- Clean institutional look, responsive mobile-first
- Logo: ƎD ballot box emblem (src/assets/edawis-logo.png)

## Architecture
- PIN-based auth for voters, DB-based admin auth (admin_accounts table, bcrypt via pgcrypto)
- i18n: src/lib/i18n.tsx with QQ/RU translations, LanguageSwitcher component
- Tables: members, meetings, meeting_attendees, questions, question_votes, admin_accounts
- DB functions: cast_vote(), admin_login(), admin_register(), admin_change_password(), admin_exists()
- Polling every 3-4s for real-time vote updates
- Admin username stored in localStorage (getAdminUsername)

## Key Files
- src/lib/i18n.tsx - i18n context with all translations
- src/lib/session.ts - session/auth management
- src/lib/docx-report.ts - DOCX protocol report (bilingual)
- src/lib/xlsx-utils.ts - XLSX import/export
- src/pages/LoginPage.tsx - PIN/admin login + admin registration
- src/pages/VoterPage.tsx - voter voting interface
- src/pages/admin/* - admin panel (dashboard, members, meetings, meeting detail, settings)
- src/components/LanguageSwitcher.tsx - QQ/RU toggle

## Removals
- Removed hardcoded admin password (was nspi2024admin in session.ts)
- Removed ADMIN_PASSWORD export from session.ts
