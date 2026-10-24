# THIRD_PARTY.md: code adapted from other projects

## LiMap (Apache License 2.0)
Source: https://github.com/PalashKurkute/LiMap (owner: PalashKurkute). Licence text: `licenses/LiMap-Apache-2.0.txt`. The upstream licence file leaves the copyright holder blank and the repository has no NOTICE file, so the repository and its owner are credited by URL.

The start screen is adapted from LiMap's home screen. `src/ui/pages/HomePage.tsx` says so in its header comment.

| Parchi file | Adapted from | What changed |
|---|---|---|
| `src/ui/pages/HomePage.tsx` | `dashboard/client/src/home/HomePage.tsx`, `src/home/RobotFit.tsx` | New copy and four stages for prescriptions; flat layout in our palette; no backdrop rings, theme toggle or team badge; Tailwind and the icon library removed. |

Kept from LiMap: a first screen with the name, a one-paragraph statement, two ways in, and a "how it works" section below it that carries no figures.

Not copied: LiMap's images, logo, wording, data or styles.
