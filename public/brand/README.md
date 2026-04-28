# Brand assets

Logos for third-party platforms referenced in the app (currently the Deal
Analyzer's "Quick start" panel). The `<ListingSourceField>` component in
`src/pages/DealAnalyzer.tsx` references these by exact filename:

| File                           | Used for         | Source                                       |
| ------------------------------ | ---------------- | -------------------------------------------- |
| `bayut.png`                    | Bayut            | https://www.bayut.com (brand guidelines)     |
| `propertyfinder.png`           | Property Finder  | https://www.propertyfinder.ae (brand assets) |
| `dubizzle.png`                 | Dubizzle         | https://www.dubizzle.com (brand assets)      |

Recommended format: square PNG, 256×256 or 512×512, transparent background
(or the brand's own backdrop colour baked in — the component renders the
image inside a 28×28 px rounded tile with a white backstop and
`object-contain`, so either works).

If a file is missing, the component falls back to a colored letter mark
(B / P / D) so the page never breaks — but the real logos are the
preferred presentation when brand-guideline compliance has been confirmed.

## Trademark / nominative-fair-use note

These marks are owned by their respective companies. We use them
*nominatively* — to identify the platform when the user pastes a listing
URL, with no implication of partnership or endorsement. Each platform
publishes brand guidelines; please review them before shipping any new
placement of these marks.
