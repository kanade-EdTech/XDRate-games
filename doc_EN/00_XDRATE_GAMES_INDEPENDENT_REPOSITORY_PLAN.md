# XDRate Games Independent Repository Development Plan

Status: Independent game-rating repository baseline

Date: 2026-09-26

## 1. Split decision

`XDRate-games` is no longer a conditional branch inside the music rating product. It is an independent game-rating workspace with its own Toy entry: `/XDRateGames`.

The original `XDRate-music` repository remains the music product. This repository keeps only the game domain model, templates, covers, rating cards, and sharing flow required by the game product.

## 2. Product boundary

### Keep

- Game work metadata: title, platform, version, release information, cover, and optional notes;
- simple, professional, and custom rating modes;
- personal scores, reasons, overall comments, deductions, and optional signatures;
- seeded game examples: Red Alert 2, Call of Duty 4, Genshin Impact, and Black Myth: Wukong;
- apply, copy, rename, delete, and local recovery;
- eleven aspect ratios, PNG export, album save, and share confirmation;
- offline-first drafts and Archive Schema migration.

### Remove

- the `XDRATE MUSIC · BILI TOY` header;
- the music title and music product description;
- music-specific fields, default templates, and entry points;
- query-parameter switching that renders a music shell and appends a game panel.

The game page must be a game product from its root entry. It must never render the music shell first and append a game module below it.

## 3. Milestones

| Stage | Goal                            | Deliverables                                          | Exit gate                                 |
| ----- | ------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| G0    | Repository and entry split      | Game shell, title, version, and privacy copy          | No music strings remain in the page       |
| G1    | Game templates and domain model | Four seeded templates, local catalog, cover manifest  | Apply/copy/rename/delete isolation passes |
| G2    | Formal game rating card         | Editor, reasons, deductions, signature, eleven ratios | Preview and export share one snapshot     |
| G3    | Sharing and save loop           | PNG, album save, system share, cancellation recovery  | Full offline recovery works               |
| G4    | Release acceptance              | Toy preview, audit, mobile smoke test, documentation  | `/XDRateGames` shows game content only    |

## 4. Current state

- G0–G2 now cover the independent entry, game templates, editor, eleven-ratio rating card, and PNG export;
- G3 covers pre-export snapshots, save/share, failure classification, and cancellation recovery;
- G4 engineering acceptance passed with mobile/desktop smoke, build, and Toy-content audit evidence;
- only product-owner manual preview and an explicit upload/review decision remain.

## 5. Code boundary

Reusable: rating algorithms, Archive Schema, card renderer, image exporter, platform adapters, and generic accessibility components.

Independent: product title, domain fields, seeded templates, Toy entry, copy, page shell, and release build configuration.

Shared code must be consumed through explicit generic interfaces. Do not combine two complete products through a `domain=game` query parameter or path-string switch.

## 6. Roadmap

```text
XDRate Music  continue the music-rating product
XDRate Games  0.5.0 game-rating pilot
        ↓
1.0.0          independent anime pilot
1.1.0          WeChat Mini Program adapter
2.0.0          standalone App entity
```

The game product succeeds when its domain rating and sharing loop can ship independently. It is not intended to become a complete game database or a one-time rewrite of every domain.
