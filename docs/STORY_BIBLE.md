# LLMMON Mythos — Story Bible (draft 1)

The full-game outline: regions, cities, eight gyms, the League, the villains,
the legendaries, and how each stop teaches one step of building an LLM.

The curriculum spine is Andrej Karpathy's *Neural Networks: Zero to Hero*
series, in order, followed by his general-audience LLM talks for the endgame.
Lecture titles below are from memory; check them against the playlist before
any in-game text quotes them.

| # | Lecture | Where it lives in the game |
| --- | --- | --- |
| 1 | The spelled-out intro to neural networks and backpropagation: building micrograd | Gym 1, SoMa Node |
| 2 | The spelled-out intro to language modeling: building makemore (bigrams) | Gym 2, Menlo Park |
| 3 | Building makemore Part 2: MLP | Gym 3, Palo Alto |
| 4 | Building makemore Part 3: Activations & Gradients, BatchNorm | Gym 4, Berkeley |
| 5 | Building makemore Part 4: Becoming a Backprop Ninja | Gym 5, Waterloo |
| 6 | Building makemore Part 5: Building a WaveNet | Gym 6, Toronto |
| 7 | Let's build GPT: from scratch, in code, spelled out | Gym 7, Seattle |
| 8 | Let's build the GPT Tokenizer | Gym 8, Portland |
| 9 | Let's reproduce GPT-2 (124M) | League member 1 |
| 10 | Intro to Large Language Models / Deep Dive into LLMs like ChatGPT | League members 2–4 |
| — | The whole series, as a final exam | Champion |

## 1. Premise

LLMMON are not born; they are **trained**. Every creature is a model at some
stage of its training, and a trainer is exactly that: someone who trains.
The player moves to Hayes Valley, rescues Prof. Karpathy, and is handed a
starter and a **Notebook**. The professor's challenge is the game's spine:

> "Anyone can *use* a LLMMON. I want you to understand one well enough to
> build it. Eight gyms, eight ideas. Come back when your Notebook is full."

Each gym leader guards one idea. Beating them earns a badge, a field skill
(the idea made useful in the world), and a Notebook page that recaps the idea
in three plain sentences with a pointer to the matching lecture.

**The teaching rule:** never lecture. Each stop teaches in four beats:

1. **Town** — NPCs and signs build the intuition with jokes and small
   interactions.
2. **Gym puzzle** — the concept as a physical room the player solves by doing.
3. **Leader battle** — the leader's signature mechanic *is* the concept.
4. **Notebook page + field skill** — the concept, named, and then used to
   open the next route.

Optional "Office Hours" NPCs outside each gym offer a three-question check for
a reward. Nothing gates progress on a quiz.

## 2. World

Three regions, travelled in order, ending back home.

- **Act 1 — The Bay** (gyms 1–4): Hayes Valley → SoMa Node → Menlo Park →
  Palo Alto → Berkeley. Sunny, small scale, on foot.
- **Act 2 — Ontario** (gyms 5–6): Waterloo → Toronto. Reached by the Caltrain-
  to-airport sequence after gym 4. Winter, snow routes, rigor.
- **Act 3 — The Northwest** (gyms 7–8): Seattle → Portland. Rain, forests,
  data centres, scale.
- **Finale — The Summit**: back in San Francisco, on the hill above Hayes
  Valley that has been visible (and closed) since the first minute.

| Stop | Role |
| --- | --- |
| Hayes Valley | Home, Mom, the professor's lab |
| Route 101 | First route, rival ambush (built) |
| SoMa Node | Gym 1, first Model Center and Token Mart (built) |
| Caltrain Line (Route 82) | Trainers on platforms; first villain encounter |
| Menlo Park | Gym 2; the Benchmark Corp campus |
| Palo Alto | Gym 3; the university library; rival battle 2 |
| Bay Bridge / Dumbarton crossing | Needs gym 3's skill |
| Berkeley | Gym 4; hills, the first legendary rumour |
| SFO Terminal | Act break; villain set piece on the tarmac |
| Waterloo | Gym 5; co-op students, snow, the Dojo |
| Highway 401 | Long snow route, ice puzzles |
| Toronto | Gym 6; the Tower; rival battle 3 |
| Seattle | Gym 7; rain, ferries, the Needle |
| Cascade Data Centre | Villain climax; legendary of Compute |
| Portland | Gym 8; "keep tokens weird" |
| The Summit (SF) | Victory Road, the League, the Champion |

## 3. The eight gyms

Leaders are original characters, not real people.

### Gym 1 — SoMa Node · Gradient Gym · *micrograd and backprop*

- **Idea:** a network is a graph of tiny operations; the gradient tells each
  number which way to nudge to lower the loss; backprop passes that blame
  backwards with the chain rule.
- **Town:** a kid rolling a ball downhill ("I just keep going the way that's
  steepest"); the kiosk shows a number that changes when you press switches.
- **Puzzle:** the floor is a computation graph: tiles are `+` and `×` nodes,
  wires glow with values. The door opens when the output reads zero. The
  player stands on the output, then walks *backwards* along the wires; each
  node shows its gradient and offers a nudge up or down. Three rooms: one
  node, a chain, then a branch where one value feeds two paths (gradients add).
- **Leader:** **Della**, a patient ex-teacher. Her LLMMON begin weak and gain a
  stat stage every turn they survive ("one step of descent"). Lesson: small
  consistent steps beat one big swing.
- **Badge:** Gradient Badge. **Field skill: Backprop** — walk back *up*
  one-way ledges.
- **Slice note:** the slice's SoMa building is labelled "Alignment Gym". It
  should become the Gradient Gym; the absent "leader at a safety conference"
  joke moves to the League (member 4).

### Gym 2 — Menlo Park · Bigram Gym · *counting, sampling, likelihood*

- **Idea:** the simplest language model just counts which letter follows
  which, then samples. A model's quality is how unsurprised it is by real
  data (the loss).
- **Town:** a name-generator stall that produces almost-names ("Mora",
  "Kayah", "Xzq"); townsfolk bet on what letter comes next.
- **Puzzle:** a grid of letter tiles. Stepping from one letter to the next
  costs "surprise" in proportion to how rare that pair is; the door opens
  when you spell a path under a surprise budget. Room 2 hands you a dice
  statue: you *sample* your path, and learn why samples are plausible but not
  sensible. Room 3: tiles with zero counts are pits until you pull the
  "smoothing" lever.
- **Leader:** **Marko**, a gambler who narrates probabilities. His LLMMON
  only choose moves based on the move *you* used last turn (a visible
  two-column table). Lesson: a bigram model is predictable once you read its
  table.
- **Badge:** Likelihood Badge. **Field skill: Sample** — reroll a wild
  encounter once per patch of grass.

### Gym 3 — Palo Alto · Embedding Gym · *MLP, embeddings, train/dev/test*

- **Idea:** give each token a learned position in space so similar things sit
  close; feed several of them through a hidden layer; hold data back to check
  you learned rather than memorised.
- **Town:** the university library shelves books by *meaning*, not alphabet;
  a student brags about a perfect score on a test he had already seen.
- **Puzzle:** a large "embedding hall" where statues of LLMMON stand in
  clusters. Clues say "find the one nearest to X" and "X is to Y as Z is to
  ?". Three wings are marked TRAIN, DEV and TEST. Trainers in TRAIN can be
  fought repeatedly; the TEST wing door only opens once, and peeking early
  (a tempting side door) makes the leader's team stronger.
- **Leader:** **Yosh**, a quiet researcher. His team shares "context": each
  LLMMON gets a boost based on the previous *three* moves used, not one.
- **Badge:** Embedding Badge. **Field skill: Embed** — push and pull heavy
  blocks toward others of their kind (opens the bay crossing).

### Gym 4 — Berkeley · Norm Gym · *activations, gradients, BatchNorm*

- **Idea:** deep networks fail quietly when signals shrink to nothing or blow
  up layer by layer; careful initialisation and normalisation keep them alive.
- **Town:** a hillside with dry fountains ("the signal died three floors
  up") and one that floods the street.
- **Puzzle:** a five-floor tower with a stream running through it. On each
  floor the player sets an "init" dial. Too low and the stream is a trickle
  by floor 3 (trainers there are asleep: dead neurons). Too high and floors
  flood (saturated: trainers can't move). Later floors add a Norm Fountain
  that re-centres the flow regardless of the dial.
- **Leader:** **Ioffa**, calm to the point of comedy. Her arena resets every
  stat stage on both sides to zero at the end of each turn. Setup moves are
  useless; raw fundamentals win.
- **Badge:** Normal Badge. **Field skill: Normalize** — calm rough water so
  it can be crossed.

### Gym 5 — Waterloo · Backprop Dojo · *becoming a backprop ninja*

- **Idea:** you don't understand it until you can do it by hand, one
  operation at a time, without the autograd crutch.
- **Town:** engineering students everywhere, mid-co-op-term exhaustion, an
  iron ring joke, snow. A sign: "NO AUTOGRAD BEYOND THIS POINT."
- **Puzzle:** the Gradient Gym's graph floor again, but the nodes no longer
  show their gradients. The player fills each one in from a small set of
  choices, back to front. Scrolls teach shortcuts (the cross-entropy trick
  turns five steps into one). A stopwatch gives a rank, not a fail state.
- **Leader:** **Sensei Lin**, strict and secretly proud of you. For this
  battle the game hides damage numbers and effectiveness text; the player
  must read the fight from HP bars alone. Lesson: you already know this.
- **Badge:** Chain Badge. **Field skill: Chain Rule** — grapple across gaps
  link by link.

### Gym 6 — Toronto · Wave Tower · *hierarchy and receptive field*

- **Idea:** instead of squashing all context in one step, fuse it gradually:
  pairs, then pairs of pairs, so deeper layers see further.
- **Town:** the city where deep learning's revival began; a skyline tower
  whose observation deck "sees eight blocks, the lobby sees one".
- **Puzzle:** a tower shaped like a tree. On floor 1 the player can see one
  tile around them in the dark. Each floor merges two rooms below into one
  and doubles the lit radius. Switch puzzles need information from rooms the
  player can only "see" once high enough.
- **Leader:** **Aaron V.**, a sound engineer. His LLMMON hit harder the more
  turns of history the battle has; ending fights fast is the counter.
- **Badge:** Wave Badge. **Field skill: Dilate** — light dark areas and
  spot hidden items at range.

### Gym 7 — Seattle · Attention Gym · *self-attention and the Transformer*

- **Idea:** let every token look at every other token and decide what
  matters, using queries, keys and values; stack that with residual
  connections and position information and you have a Transformer.
- **Town:** rain, ferries, coffee. Everyone is listening to someone, nobody
  to everyone. The Needle is "the biggest attention head on the coast".
- **Puzzle:** a hall of statues, each holding a **query** ("I am a verb
  looking for my subject"). The player carries **keys** between pedestals;
  a matching pair lights a beam and delivers that statue's **value** to the
  door. Room 2 has several heads working at once. Room 3 is a long corridor
  where beams fade unless the player opens the "residual highway" alongside.
  A final twist scrambles statue order until position plaques are attached.
- **Leader:** **Vasha**, eight steps ahead of everyone. Her LLMMON target
  whichever of your party is most dangerous, including benched ones, and her
  lead copies the best move it has *seen* this battle.
- **Badge:** Attention Badge. **Field skill: Attend** — travel instantly to
  any city you have visited (every position can reach every other).

### Gym 8 — Portland · Token Works · *the tokenizer*

- **Idea:** models don't read letters or words; they read tokens, built by
  repeatedly merging the most common adjacent pair. Many odd LLM behaviours
  are tokenizer behaviours.
- **Town:** a print shop district, "keep tokens weird" murals, a baker who
  cannot count the r's in "strawberry".
- **Puzzle:** a letterpress floor of sliding blocks. The player finds the
  most frequent adjacent pair and fuses it into one block, again and again,
  until a sentence fits through a narrow door (a token budget). Later rooms
  include emoji and other scripts that explode into many byte-blocks.
- **Leader:** **Bea Pierce**, a typesetter. Every move in this battle costs
  "tokens" from a shared budget shown on screen; long-named moves cost more.
  When the budget runs out the turn is cut off mid-move.
- **Badge:** Merge Badge. **Field skill: Merge** — fuse paired boulders
  into bridges (opens the Summit path).

## 4. The League: the Frontier Four and the Champion

Set on **The Summit**. Theme: from "a network that works" to "an assistant
you can trust". Four rooms, then the Champion, with no healing between unless
the player uses items.

1. **Atlas — Scale** (*reproducing GPT-2*). A machine hall. His team is huge
   and slow to start: it "warms up" for two turns, then accelerates. The room
   teaches batch size, learning-rate schedules and why the same recipe needs
   weeks of compute, as a countdown the player races.
2. **Tuney — Fine-tuning** (*from document completer to assistant*). Her lead
   starts as a "base model" that only continues whatever move was last used.
   Mid-battle she swaps in the fine-tuned form that answers properly. Lesson:
   pretraining gives knowledge, fine-tuning gives a job.
3. **Marguerite — Evaluation** (*sampling, hallucination, benchmarks*). A
   temperature dial sits in the arena. Low: both sides become predictable.
   High: moves can "hallucinate" into random other moves. She plays the dial.
4. **Warden Hale — Alignment** (*RLHF, jailbreaks, prompt injection*). The
   leader who was "away at a safety conference" all game. Her LLMMON refuse
   some of the player's commands, and her signature move tries to make the
   player's LLMMON obey *her* for a turn. Lesson: capability is not the same
   as doing what you meant.

**Champion — Prof. Karpathy.** The final exam. His team is nine LLMMON, one
per lecture, used in lecture order, each with the matching gym's mechanic in
miniature. He concedes with the game's thesis: "You didn't memorise it. You
built it."

**Rival — Dana.** She reaches the Summit first, loses to the Champion, and is
the last fight on Victory Road: "Beat me and you get to lose to him too."
Earlier battles: Route 101 (built), Palo Alto library, Toronto tower lobby,
Seattle ferry. She always picks the counter to your starter and learns each
gym's lesson a little too literally.

## 5. Antagonists: Benchmark Corp and Team Overfit

**Director Norm** runs Benchmark Corp from Menlo Park. Its field agents, Team
Overfit, believe the leaderboard is the only truth. They steal held-out test
sets and train LLMMON on them: creatures with perfect scores that fall apart
the moment anything is unfamiliar. Those are the glitching HalluciHounds, and
the one that cornered the professor on Route 101 was the first leak.

- **Their LLMMON** hit extremely hard on turn one and get worse every turn
  the battle goes off-script. Any unexpected action (a switch, an item, a
  status move) confuses them.
- **Beats:** Caltrain platform (first sighting) → Menlo Park campus tour
  (Norm is charming) → Palo Alto library theft of the TEST wing → SFO tarmac
  → Toronto, a sabotaged Wave Tower → Cascade Data Centre climax.
- **Their plan:** wake the legendary of Compute and train one model on every
  test set in the world, a creature that tops every benchmark and understands
  nothing. It works, and what wakes is **Mode Collapse**: a legendary stuck
  repeating one perfect answer.
- **What it teaches:** memorising is not learning; a held-out set only means
  something if it stays held out.

## 6. Legendary LLMMON

Ordinary LLMMON are models. Legendaries are the things models are made of.
All are original designs.

**The Three Ingredients** (a roaming or dungeon trio):

- **Corpora, the Leviathan of Text** (Data). A whale made of drifting pages,
  asleep under the bay. It knows everything ever written and cannot tell
  which parts are true. Found after gym 4 via Normalize.
- **Silicor, the Forge** (Compute). A furnace-backed beast in the Cascade
  Data Centre. Team Overfit wakes it; the player calms it. Catchable after
  the climax.
- **Descenda, the Patient Serpent** (Algorithm). Coils down the snowfields
  outside Waterloo, always moving downhill. It can only be found by
  following the slope, never the path.

**The cover legendary — Attenta, Who Sees All At Once.** A many-eyed stag
whose antlers branch into beams. It appears above Seattle once the three
ingredients have been met: data, compute and algorithm together.

**The corrupted form — Mode Collapse.** What Benchmark Corp makes of Silicor.
Fought, not caught; defeating it frees Silicor.

**The mythical — Emergent.** Rumoured in every town, always "about two years
away". It appears in the post-game only when the party holds one LLMMON from
every lab and the Notebook is complete. Nobody in the game agrees on whether
it counts.

**Mythos**, the fox-kirin on the title screen, is the game's storyteller
figure: glimpsed on the Summit skyline from the first route, met only after
the Champion.

## 7. Progression at a glance

| Badge | City | Level band | Field skill | Opens |
| --- | --- | --- | --- | --- |
| 1 Gradient | SoMa Node | 10–14 | Backprop | Ledge shortcuts, Caltrain Line |
| 2 Likelihood | Menlo Park | 16–20 | Sample | Encounter rerolls |
| 3 Embedding | Palo Alto | 22–26 | Embed | Bay crossing to Berkeley |
| 4 Normal | Berkeley | 28–32 | Normalize | Water routes, SFO |
| 5 Chain | Waterloo | 34–38 | Chain Rule | Highway 401 gaps |
| 6 Wave | Toronto | 40–43 | Dilate | Dark routes, flight west |
| 7 Attention | Seattle | 45–48 | Attend | Fast travel, Data Centre |
| 8 Merge | Portland | 50–53 | Merge | The Summit |
| League | The Summit | 55–62 | — | Post-game |

**Post-game:** rematches with leaders using full teams, the legendary hunts,
Emergent, and a "Reproduce It" challenge: beat the League with a team caught
only on Route 101.

## 8. Open decisions

1. **Champion:** Prof. Karpathy (recommended, it makes the game one long
   lesson with a final exam) or Dana.
2. **Real people:** only the professor is a real person, as already
   established. Leaders and villains are invented. Confirm that is the line.
3. **Gym 1 naming:** rename the slice's "Alignment Gym" to Gradient Gym.
4. **Geography:** Berkeley and Toronto and Portland are additions to the
   cities you listed. Mountain View is the obvious alternative home for the
   Attention Gym if Seattle should carry something else.
5. **Scope:** eight gyms at slice quality is a large build. A sensible next
   milestone is gym 1 complete (puzzle, leader, badge, Backprop skill) plus
   the Caltrain Line and the first Team Overfit encounter.
