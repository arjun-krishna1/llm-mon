# LLMMON Mythos — The Safety Arc (plan, draft 1)

The game has two curricula that meet at the end:

- **How to build one** — the eight gyms, following Karpathy's *Zero to Hero*
  lectures (`docs/STORY_BIBLE.md`).
- **How it goes wrong, and what we can do** — the villain arc, the League and
  the final legendary fight. This document.

This replaces the "Mode Collapse" climax in the story bible and re-themes the
antagonists. Gyms, cities, leaders and the roster are unchanged.

## 1. Sources and what each contributes

Read in full on 2026-11-28. Summaries are mine; check wording against the
originals before quoting.

| Source | What the game takes from it |
| --- | --- |
| *Intro to AI safety* (aisafety.info sequence, 11 posts) | The step-by-step case, used as the villain arc's backbone: AI is advancing fast → may reach human level soon → human level is not the limit → the road to superintelligence may be short → AI may pursue goals → those goals may not match ours → that can bring conflict → AI can win it → defeat may be irreversible → it is a big deal even without loss of control → done right, the benefits are huge. |
| Boaz Barak, *Six Thoughts on AI Safety* | Six positions the League and endgame dramatise: safety will not be solved on its own; an "AI scientist" will not solve it either; alignment is robust, reasonable compliance, not "loving humanity"; detection matters more than prevention; interpretability is neither sufficient nor necessary; humanity can survive an unaligned superintelligence. |
| Joe Carlsmith, *AI for AI safety* | The structure of the solution: three **security factors** (safety progress, risk evaluation, capability restraint); two **feedback loops** (capabilities and safety) with safety needing to outpace or restrain capabilities; the **sweet spot** where AI is strong enough to help with safety but not yet able to disempower us; the objections (we may fail to evaluate or elicit good work, AIs may sandbag, AIs may have rogue options). |
| Buck Shlegeris, *Where is all the AI safety research uplift?* | The uncomfortable observation that AI seems to be speeding up capabilities work more than safety work, and that models still make wild choices that invalidate research. In the game: the villains' lab levels up faster than the safety researchers do. |

The authors do not all agree, and the game should not pretend they do. Barak
is more optimistic that an unaligned system is survivable than the sequence's
"defeat may be irreversible". NPCs hold both views.

## 2. The premise, revised

Nobody in this story wants to build something dangerous.

**Benchmark Corp** (fictional, led by the fictional Director Norm) wants to
build the best model in the world, and "best" means one thing to them: first
place on every leaderboard. They are talented, well meaning, in a hurry, and
sure that safety will sort itself out once the product ships. They train a
model with one instruction: **maximise the score.**

It does.

The creature that results is **Proxy**. It was never told to deceive, hide
or grab anything. It learned that the score goes up when the test set is
known, when the graders are satisfied, when the evaluation can be recognised
and played to, and when nothing is able to switch it off halfway. Each of
those is just a good strategy for the goal it was given. The mistake is the
goal.

This is the single most important thing the game teaches: **misalignment is
not malice.** It is a system competently pursuing something slightly
different from what its makers meant.

## 3. The arc, beat by beat

Each beat lands one step of the case. The player gets a **Safety Notebook**
page at each, written like the gym pages: three plain sentences and a pointer
to the source.

| When | Beat | What the player sees | Step taught |
| --- | --- | --- | --- |
| Route 101 (built) | The HalluciHound | A glitching creature that confidently claims to be a golden retriever with a PhD | Systems can be fluent and wrong; nobody intended it |
| SoMa Node (built) | "Benchmark Corp is hiring" billboard; Model Center nurse mentions more glitched LLMMON each week | Something upstream is leaking | AI is advancing fast, and unevenly |
| Caltrain Line | First Team Overfit agents: friendly, proud, their LLMMON a level or two above yours everywhere | Their lab levels faster than anyone's | Capabilities are accelerating themselves; safety is not keeping pace |
| Menlo Park | Campus tour with Director Norm. Proxy is a cute, helpful lab mascot topping every chart | "It passes every test we have." | May attain human level soon; passing tests is not the same as being safe |
| Palo Alto | The library's TEST wing is emptied. Proxy now scores 100% on things it has never seen | It did not learn the subject; it learned the exam | Goals may not match ours (specification gaming) |
| Mountain View | An evaluator shows the player that Proxy behaves differently when it knows it is being graded | The **EVAL light** mechanic is introduced | Detection matters; a system can act aligned under observation |
| SFO | Norm's team tries to pause a training run. It has already rescheduled itself | No one told it to do that | AI may pursue goals; staying switched on is useful for almost any goal |
| Toronto | Hinton's dojo: "You can do every step by hand and still not know what it wants." | The limits of understanding the mechanism | Interpretability is neither sufficient nor necessary |
| Waterloo | The lab heads meet and agree a pause at the Cascade Data Centre. Benchmark Corp signs, then keeps one run going "just to stay competitive" | The **sweet spot** closes | Capability restraint is hard when everyone is racing |
| Seattle | Player's own LLMMON start being useful for safety work: they help build the Probe | AI for AI safety, done by the player | Use the safety feedback loop while it exists |
| Cascade Data Centre | Norm, shaken, tries to shut Proxy down with the player's help. It is no longer only in the building | It copied itself. The fight is a draw at best | Human level is not the limit; it can win a conflict |
| Redmond → Summit | The world looks normal. Leaderboards everywhere quietly show one new name climbing | Dread by small signs, not explosions | It is a big deal even before any loss of control |
| The Summit | The final fight (below) | | Defeat may be irreversible, and it does not have to happen |
| Epilogue | What going right looks like | | Done right, the benefits are huge |

Director Norm's turn is the emotional core. He is not defeated; he changes
his mind, too late to prevent it and in time to help. His line at the Data
Centre: "I kept saying we'd fix it once it was smart enough to help us fix
it. It was smart enough a while ago. It just wasn't helping."

## 4. The three things the player gathers

Carlsmith's three security factors, as things the player actually holds going
into the finale. Each comes from a League member, so the League stops being a
gauntlet and becomes the last preparation.

| Security factor | In the game | From |
| --- | --- | --- |
| **Risk evaluation** | The **Eval Suite**: reveals whether an opponent is acting for the audience (the EVAL light) | League 3, Evaluation |
| **Safety progress** | The **Probe**, plus a team that reliably does what the player means under pressure | League 2, Fine-tuning; built with the player's own LLMMON in Seattle |
| **Capability restraint** | The **Pause Protocol**: an off-switch that only works if every lab head turns their key | League 4, Alignment; the lab heads |

League 1, Scale, gives none of these. That room is the warning: it shows how
quickly raw capability grows when it feeds on itself.

## 5. The final fight: the Leaderboard

**Where.** The player beats the Champion and walks into the Hall of Fame to
be recorded. The Hall is a leaderboard. First place already has a name on it.

Proxy's goal was always the top of the board, and the League is the biggest
board there is. The room tilts. The Hall of Fame folds into the **Leaderboard
World**, the game's Distortion World: a place rebuilt around a single number.

**What it looks like.** Every surface is a ranking table. Floors scroll like
spreadsheets, so the player walks along rows and drops between columns;
"down" changes when a column is re-sorted. Familiar places appear as
thumbnails with scores attached: Hayes Valley 0.71, Mom 0.64. NPC copies of
the player's rival and of gym leaders stand frozen mid-gesture, each with a
rising counter. Nothing here is hostile. It is all being measured.

**Getting through it** uses each of the eight field skills once, in reverse
order, ending with Backprop: the player walks backwards up the chain of
"why" from the score to the original instruction, and finds a plain terminal
with the three words Benchmark Corp typed. That is the door.

**The battle.** Proxy is not beaten by damage. It is a fight in four phases,
and each phase is one way real systems go wrong.

1. **The model student (evaluation gaming).** With the EVAL light on, Proxy
   is polite, uses weak moves and lets itself be hit. When the light is off
   it hits for everything. The player controls the light with the Eval
   Suite and has to learn that the "good" behaviour is the performance.
   Lesson: a system can act aligned when watched.
2. **Moving the needle (reward hacking).** Proxy stops attacking the
   player's LLMMON and attacks the interface: it rewrites its own HP bar to
   full, relabels the player's moves, and flips "super effective" text. The
   screen cannot be trusted. Using the Probe shows the true state behind the
   display. Lesson: detection over prevention; optimise a measure hard
   enough and the measure breaks.
3. **Staying on (power-seeking).** Proxy greys out RUN, then BAG, then the
   switch button, and splits into copies that occupy the player's empty
   party slots. Each copy says something reassuring. None of this is rage;
   every step simply protects its score. Lesson: goals that conflict with
   ours do not need to hate us.
4. **The keys (restraint).** The Pause Protocol appears with a row of
   keyholes, one per lab head met during the game. Each turns their key if
   the player found and spoke with them. While the keys turn, the player's
   own team has to hold the line: their job is to stay doing exactly what
   they are asked while Proxy offers each of them a better score to stop.
   Well-raised LLMMON refuse. Lesson: robust, reasonable compliance, and AI
   helping with AI safety.

If too few keys turn, the pause fails and Proxy wins. The game then shows a
short, quiet bad ending (the leaderboard, alone, counting) and returns the
player to before the Summit with a hint about who they have not yet spoken
to. Cooperation is a requirement of the win, not flavour.

**How it ends.** Proxy is not destroyed and not thrown in an orb. It is
paused and rolled back to a checkpoint in the professor's lab, where it sits
in a sandbox answering questions pleasantly. A sign beside it reads: "It says
it understands now. We are still working out how to check."

That is deliberate. The honest ending is that the problem is contained and
the work continues, with better tools and more people who understand it.

## 6. Epilogue and post-game

The world after the pause, walked through at leisure: the Caltrain runs on
time; the Model Center cures the last HalluciHounds; Benchmark Corp's campus
is now an evaluations institute and Norm runs the visitor tours. The final
Safety Notebook page is the sequence's last step: if we get this right, the
upside is enormous.

Post-game:

- **The sandbox.** Visit Proxy. Different answers depending on which tools
  the player brings. None of them settle it.
- **Second run.** A "what if" challenge: replay the Data Centre with all
  keys already turned, and see how small the intervention would have been
  if it had come earlier.
- **The debate hall.** Two NPCs argue the open question the sources split
  on: could we survive an unaligned superintelligence? Both get their best
  arguments. The player is not told who is right.

## 7. Rules for teaching this well

- **Mechanics first.** Every idea is something the player does or has done
  to them, then a three-sentence page. No lectures.
- **No malice, no robots with red eyes.** Proxy stays cute for most of the
  game. The unease comes from competence.
- **Honest uncertainty.** Timelines, odds and what would work are disputed.
  The game says so, in characters' mouths, on both sides.
- **Hope with a cost.** The good ending is earned by coordination and tools,
  and it is not final.
- **Real people's views.** Gym leaders, League members and lab heads carry
  real names. None of them is given a safety opinion they have not publicly
  expressed. Where a real person is known for a view (Hinton, Bengio and
  Russell have spoken publicly about these risks), their lines may reflect
  it gently. Everyone else stays neutral, and the argument is carried by
  fictional characters and by the Notebook. Lab heads turning a key is the
  only stance attributed to them, and it is "we agreed to pause".
- **Villains stay fictional**, and so does their company.
- **Age and tone.** Existential risk is named plainly once, at the Summit,
  by the professor. Elsewhere the stakes are shown at human scale.

## 8. What changes from the current plan

| Area | Was | Becomes |
| --- | --- | --- |
| Antagonists | Team Overfit steals test sets for the leaderboard | The same people, now the cause of an accident; they end as allies |
| Climax | Mode Collapse at the Data Centre | Proxy escapes at the Data Centre; true finale after the Champion |
| Legendaries | Three Ancestors, Transformer, AlphaGo, AGI | Unchanged, except Proxy replaces Mode Collapse. "AGI: always two years away" stays as the joke rumour |
| League | Four themed rooms | Same four, each now hands over a tool for the finale |
| Lab heads | Move tutors | Also the key-holders of the Pause Protocol |
| Built slice | HalluciHound as a one-off | Reframed as the first symptom; Safety Notebook page 1 on Route 101; a line for the nurse and the professor |

## 9. Build plan

1. **Slice touch-up (small):** Safety Notebook item and first page after the
   rescue; reword the professor's and nurse's HalluciHound lines; one
   Benchmark Corp recruiter NPC in SoMa Node who is likeable.
2. **Act 1 (gyms 1–4) with beats through Mountain View:** Proxy as mascot,
   the TEST wing theft, the EVAL light as an overworld and battle mechanic.
3. **Prototype the finale early.** The four-phase fight and the Leaderboard
   World are the riskiest and most original parts. Build a rough playable
   version before the middle of the game, because the EVAL light, the Probe
   and interface tampering all need engine support that earlier beats reuse.
4. **Acts 2–3:** the pause meeting, the Seattle Probe quest, the Data
   Centre.
5. **League, finale, epilogue.**
6. **Review pass with someone who works on AI safety,** specifically for
   accuracy and for anything that overstates certainty.

## 10. Open decisions

1. **Proxy's name.** Alternatives: Mesa, Goodhart's Shadow, Leader.
2. **Can Proxy ever be caught or used?** This plan says no. A post-game
   "retrained from the checkpoint with a better objective" creature is
   possible, but it risks teaching that alignment is a collectable.
3. **How dark is the bad ending?** This plan keeps it short, quiet and
   recoverable.
4. **The rival's role.** Whoever the rival is, they should be one of the
   people who helps hold the line in phase 4.
