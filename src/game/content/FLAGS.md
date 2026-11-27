# Story flags (CONTENT)

All flags live in `state.flags` and are saved with the game. Every story beat
checks its flags first, so each step is re-entrant after save/load and never
runs twice. Order below = story order.

| flag | set by | meaning / used by |
| --- | --- | --- |
| `arrived` | `story.arrival` (new-game script) | Truck has driven off (truck prop + mover hidden by this flag) and Mom has walked you in. Never replays. |
| `visited_2f` | `home.enter_2f` (the `onEnter` hook of `home_2f`) | You went up to your room. Mom's talk changes; enables the lab call trigger. |
| `read_notebook` | `home.notebook` | You opened the controls notebook (only changes its first line). |
| `mom_lab_call` | `home.mom_lab_call` (trigger at the bottom of the 1F stairs, or talking to Mom) | Mom told you the professor's lab called. |
| `met_aide` | `lab.aide` | The aide explained the professor went up Route 101. |
| `has_satchel` | `lab.aide` (cleared after the rescue) | You are carrying the professor's satchel (changes his rescue line). |
| `starter` | `route.rescue` | Species id of the starter you chose (`claude_fable` / `gpt_5_5` / `glm`). Set before the battle so the choice is never offered twice. |
| `rescue_done` | `route.rescue` after the tutorial battle | Rescue + first battle won. Disables the route-mouth trigger (the only thing stopping you going north), shows the professor in the lab and the picnic girl on the route, changes many NPC lines. |
| `got_dex` | `labDex()` (end of the rescue, or talking to the professor) | Received the PromptDex + 5 Prompt Orbs. Enables Mom's Fast Tokens scene; hides the mover. |
| `has_run` | Mom (`hayes.mom_fast_tokens` trigger outside the lab, or talking to her at home) | Fast Tokens received. Engine flag: hold B to run outdoors. |
| `trainer_route_101_a_defeated`, `trainer_route_101_b_defeated` | engine (`startBattle` on a trainer win) | Trainer beaten; sight disabled, post-battle lines from `src/game/data/trainers.ts`. |
| `item_route_prompt_orb`, `item_route_hidden_patch`, `item_route_patch`, `item_route_debugger` | engine (item pickup) | Ground items on Route 101 (the patch at 21,49 is hidden; the Debugger at 29,79 sits behind tall grass in the rescue pocket). |
| `route_hiker_heal` | `route.hiker` | The hiker on the east path has used his one-time "clear your cache" heal. |
| `healed_at_center` | `center.nurse` | First Model Center heal (one-time explanation of the heal point). The nurse also calls `setHealPoint('center', 'counter')`. |
| `saw_end_sign` | `soma.end_sign` | Read the end-of-slice sign (for playtests). |
| `met_dana` | `neighbor.dana` | Dana introduced herself. |
| `mom_line`, `aide_line` | Mom / aide | Counters that rotate their idle lines. |

Heal point: new game = `home_1f` / `entrance` (Mom heals your team when you
talk to her after the Fast Tokens); after the first Model Center heal it is
`center` / `counter`.

Debug shortcuts (with `?debug=1`): `__llmmon.setFlag('rescue_done')` etc. To
jump to the route with a starter: `setFlag('arrived'); setFlag('visited_2f');
setFlag('mom_lab_call'); setFlag('starter','glm'); giveMon('glm',5);
setFlag('rescue_done'); setFlag('got_dex'); setFlag('has_run');
warp('overworld','route_mouth')`.
