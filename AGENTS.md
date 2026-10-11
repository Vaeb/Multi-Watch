# AGENTS.md

## Tools

- `scripts/nopixel`: read-only CLI for the NoPixel Fandom wiki (factions, members, characters, and their Kick/Twitch
  channels). Python 3 stdlib only. Run `scripts/nopixel --help` from the repo root, or
  `sudo ln -sf "$PWD/scripts/nopixel" /usr/local/bin/nopixel` to use it as `nopixel`.
  Read `.cursor/skills/nopixel/SKILL.md` before using it. If Fandom returns HTTP 402/403/429, stop and report it;
  never work around it.
