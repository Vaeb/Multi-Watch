---
name: nopixel
description: |
  Read the NoPixel Fandom wiki (nopixel.fandom.com) via the read-only `nopixel` CLI in `scripts/nopixel`: list
  faction pages, resolve faction names, extract a faction's members/roles, extract a character's streamer, Kick
  and Twitch, and run the full chain "factions -> members -> Kick/Twitch channel names". Use for any NoPixel
  faction/character/streamer lookup (e.g. finding channels to add to Multi-Watch).
---

# nopixel

`nopixel` lives in this repo at `scripts/nopixel` (Python 3 stdlib only, no install). It reads the public
MediaWiki API at https://nopixel.fandom.com/api.php, no login. Read-only: it never edits the wiki.
All output is JSON on stdout and always includes `license` and `stats` ({requests, cacheHits[, seconds]}).

## Running it

From the repo root, either call it by path or put it on PATH once per VM:

```
scripts/nopixel kick "Hong Kong Pawn"                               # by path, no setup
sudo ln -sf "$PWD/scripts/nopixel" /usr/local/bin/nopixel           # then just: nopixel ...
```

The examples below use bare `nopixel`; substitute `scripts/nopixel` if you didn't link it.

Content is **CC BY-SA from nopixel.fandom.com** and community-edited (only as current as its editors).
When you pass it on, credit and link the page (`url` fields are included).

## Commands
| Command | Returns |
|---|---|
| `nopixel factions [--no-recurse]` | `{count, categoriesVisited, factions:[{title,url,category}]}` from `Category:Factions (Gangs/Departments/Businesses)` plus all subcategories (deduped). `--no-recurse` = direct pages only. |
| `nopixel resolve <name>...` | `{results:[{query, match, how, candidates, url}]}`. `how` = `exact` (case-insensitive), `normalized` (ignores "The", punctuation, spaces), `ambiguous` or `no_match` (with suggestions in `candidates`). Never guesses. Exit 6 if any name failed. |
| `nopixel members <faction title>... [--resolve]` | `{factions:[{title,url,exists,infobox,parsed,members:[{character,display,role,group,deceased,url}]}]}`. Takes exact titles; `--resolve` accepts loose names. |
| `nopixel character <name>...` | `{characters:[{name,url,exists,template,playedBy,kick,kickUrl,twitch,twitchUrl,status,faction,rank}]}`. Missing page: `exists:false`, fields null. |
| `nopixel kick <faction name>...` | Full chain. `{resolved, unresolved, factions:[{faction,url,infoboxParsed,members:[{character,role,group,deceased,hasPage,playedBy,kick,twitch,url}], kickUsernames:[unique], missingKick:[characters]}]}`. Members without a page or Kick are kept with nulls. |
| `nopixel twitch <faction name>...` | Same as `kick`, but each faction has `twitchUsernames` / `missingTwitch` instead of `kickUsernames` / `missingKick`. |

Global: `--fresh` bypasses the 6-hour cache in `~/.cache/nopixel` (e.g. `nopixel --fresh kick "Old Country"`).

## Examples
```
nopixel kick "Hong Kong Pawn" "Old Country" | jq '.factions[]|{faction,kickUsernames}'
nopixel twitch "Hong Kong Pawn" "Old Country" | jq '.factions[]|{faction,twitchUsernames}'
nopixel character "Quinn Decker" | jq '.characters[0].kick'
nopixel members "Hong Kong Pawn" | jq '.factions[0].members[]|"\(.role): \(.character)"'
```

## Chaining
Every command reads names from stdin when no names are given: one per line, or the JSON of the previous command.
```
nopixel resolve "brick bois" "old country" | nopixel members | nopixel character
nopixel factions --no-recurse | nopixel members     # parse every direct faction page
printf 'Hong Kong Pawn\nOld Country\n' | nopixel kick
```
(`members` takes `match` from resolve output; `character` takes each member's `character`.)

## Unresolved faction names (kick / twitch)
If some faction names don't resolve, the others are still fetched. The skipped ones appear in the output's
`unresolved` list (`query`, `how: no_match`, `candidates`) and as a warning line on stderr, with exit 0. Only when
no name resolves does it stop (exit 6) before fetching any pages. Factions get renamed (e.g. PISS BOIZ* is now
PSec), so check `unresolved` and its candidates.

## How roles are read
Faction infoboxes vary. Members come from fields like `owner`, `founder`, `leader`, `f_leader`, `key_people`,
`members` and `custom_group_<Group>` (inside a group, `label=X` lines set the role, e.g. Staff -> Employee/Runner).
Any other infobox field with people links also counts unless it's clearly not a membership field, e.g. `owner_founder`,
`investor`, `signed_artists`, `coo`, and department rank fields (`ems_chief`, `captains`, `high_command_1` + its `_role`).
Partner/enemy/ally/affiliation fields, former-owner/employee fields (`former_*`, `formerly_*`), and place or
subsidiary fields (location, HQ, property, territory, `seat`, `jurisdiction*`, `subsidiaries`, parent, division) are
ignored, as are parenthetical links like `([[The Locksmiths]])`.
`role` is the field or label name, lightly humanised (e.g. "key people", "f leader" = former leader).

## Who counts as a member
When unsure, `members`, `kick` and `twitch` assume someone is a member. They only leave out clearly non-member
infobox groups/roles/fields: Associates, Contractors, Friends, Allies, Affiliates, Partners, Contacts,
Clients/Customers, Supporters, and explicit Former Members / Ex-Members (`former_members`, `ex_members`).
Anything ambiguous is kept, e.g. `f_leader` (role "f leader") and `overseen_by`; check `role` if it matters.
Hangarounds count as members.

E.g. `nopixel members "Brick Bois"` returns 5: its 4 founders plus Jean Paul (f leader), not its Associates.
`nopixel kick "Street Sweepers"` includes Benji Ramos (role "owner founder", kick `lysium`).
If you need the excluded people, read the faction page itself (`url`).

## Limits
- First `factions`/`resolve`/`kick`/`twitch` run on a VM reads ~28 category requests (~30 s, ~1000 titles incl.
  2.0/3.0-era and some person categories like Police/Business Owners). Cached for 6 h after that, so repeats take ~0 requests.
- Requests are paced ~1 s apart and page reads are batched 50 per request. `kick` on two factions: ~30 requests cold, 0 warm.
- Links that redirect follow the wiki: e.g. Vittorio DiCenzo -> "Vittorio DiCenzo/4.0" (older-era page, no Kick).
- Some faction pages list no members at all (e.g. Epsilon, La Sierra): `parsed:false`, empty members.
- Kick/Twitch is only what the character's infobox says; many characters have none (`missingKick` / `missingTwitch`).

## Errors
JSON on stderr `{error,status,hint}`, non-zero exit. 2 bad args; 3 HTTP error; 4 network; 5 API changed/odd response; 6 unresolved names.

**HTTP 402/403/429 = Fandom blocked us. Stop. Do not retry in a loop, change the User-Agent, add delays/proxies, or
otherwise work around it. Report the error JSON to the user (in your reply and PR) and continue without wiki data.**
The tool's hint text says "tell Bridge" (the agent that maintains it); from this repo, reporting to the user covers that.
Also report it if output looks wrong (exit 5, or fields that suggest an API or template change).

Don't edit `scripts/nopixel` to change its User-Agent (`mwclient/0.11`), pacing, batching or cache.
