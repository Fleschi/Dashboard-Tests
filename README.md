# Trading Dashboard

React dashboard for backtesting trades, journaling and performance overview. Data lives in Supabase.

## Setup

```bash
cp .env.example .env     # add your Supabase URL + anon key
npm install
npm start                # dev server
npm run build            # production build
npm test
```

Row-level security should be enabled on every table: the anon key ships in the browser bundle.

## Structure

```
src/
  App.jsx               shell: wires data, theme, navigation and the layouts
  app/                  navigation config, Desktop/Mobile layouts, app-level hooks
  theme/                palette, buildDesign (appearance x accent -> design object), storage, global CSS
  services/supabase/    client + trades / journal / tags data access
  shared/               components and utils used by more than one feature
  features/
    overview/           widget dashboard (registry, layout model, equity curve, calendar)
    data/               trade table + trade panel
    journal/            entries list/calendar, full-screen editor
      editor/           Tiptap editor, extensions, slash commands, blocks
      tags/             tag library, picker, tag node
      fields/           floating date/time inputs
      legacy/           one-time migration of old-format entries (safe to delete once done)
    settings/           appearance + colour settings
```

Rule of thumb: a feature may import from `shared/`, `theme/` and `services/`, but never from another feature.
