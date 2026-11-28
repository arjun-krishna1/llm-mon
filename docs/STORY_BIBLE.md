# LLMMON Mythos — Story Bible (draft 2)

The full-game outline: regions, cities, eight gyms, the League, the villains,
the creature roster, the legendaries, and how each stop teaches one step of
building an LLM.

Changes from draft 1: Berkeley and Portland are gone; every gym leader and
League member is named after a real AI researcher tied to that stop's idea;
every creature is a real model, technique or model component.

**Verify before shipping.** Lecture titles, paper attributions and
affiliations below are from memory. Check each against the source before any
in-game text states it as fact.

## 1. Curriculum spine

Andrej Karpathy's *Neural Networks: Zero to Hero* series, in order, then his
general-audience LLM talks for the endgame.

| # | Lecture | Stop | Leader |
| --- | --- | --- | --- |
| 1 | The spelled-out intro to neural networks and backpropagation: building micrograd | Gym 1, SoMa Node | Rumelhart |
| 2 | The spelled-out intro to language modeling: building makemore (bigrams) | Gym 2, Menlo Park | Shannon |
| 3 | Building makemore Part 2: MLP | Gym 3, Palo Alto | Bengio |
| 4 | Building makemore Part 3: Activations & Gradients, BatchNorm | Gym 4, Mountain View | Ioffe |
| 5 | Building makemore Part 4: Becoming a Backprop Ninja | Gym 5, Toronto | Hinton |
| 6 | Building makemore Part 5: Building a WaveNet | Gym 6, Waterloo | van den Oord |
| 7 | Let's build GPT: from scratch, in code, spelled out | Gym 7, Seattle | Vaswani |
| 8 | Let's build the GPT Tokenizer | Gym 8, Redmond | Sennrich |
| 9 | Let's reproduce GPT-2 (124M) | League 1 | Radford |
| 10 | Intro to Large Language Models / Deep Dive into LLMs like ChatGPT | League 2–4 | Howard, Li, Russell |
| — | The whole series, as a final exam | Champion | Karpathy |

## 2. Premise and teaching rule

LLMMON are not born; they are **trained**. Prof. Karpathy hands the player a
starter and a **Notebook**:

> "Anyone can *use* a LLMMON. I want you to understand one well enough to
> build it. Eight gyms, eight ideas. Come back when your Notebook is full."

Never lecture. Each stop teaches in four beats:

1. **Town** — NPCs and signs build the intuition with jokes and small
   interactions.
2. **Gym puzzle** — the concept as a physical room the player solves by doing.
3. **Leader battle** — the leader's signature mechanic *is* the concept.
4. **Notebook page + field skill** — the idea named in three plain sentences,
   credited to the people who found it, with a pointer to the lecture; then a
   field skill that opens the next route.

Optional "Office Hours" NPCs give a three-question check for a reward.
Nothing gates progress on a quiz.

## 3. Using real people's names

Gym leaders and League members are named after real AI researchers, and
well-known public figures of the AI world appear as cameos. Ground rules:

- Researchers appear only in connection with the idea they are known for.
  Their teams are built from their own work wherever possible.
- Cameos are built only on widely known, harmless public persona traits.
  No politics, no personal or family life, no business disputes or
  rivalries, and no invented quotes that could be mistaken for real
  statements about real events.
- Everyone is written warmly. If a line would embarrass the person were they
  to play the game, it is cut.
- **Villains stay fictional.** Director Norm and Team Overfit are invented;
  no real person or company is cast as an antagonist.
- The credits carry a line that the game is an affectionate parody and
  tribute, and is not endorsed by anyone named.
- The owner has approved using real public executives and researchers as
  characters, including as the rival. A rival competes with the player and
  loses battles; that is as adversarial as any real person's role gets.
- Some namesakes are no longer living (Shannon, Rumelhart, Turing). They are
  presented as tributes; the Notebook page says so.

### Lab heads

Each lab type (see §10) has its public face somewhere in the world as a
**lab head**: a friendly cameo who teaches that lab's signature move once the
player shows them a LLMMON of their type.

| Lab type | Lab head | Found in |
| --- | --- | --- |
| Anthropic | Dario Amodei | SoMa Node café, finishing a very long essay |
| OpenAI | Sam Altman | SoMa Node, passing through |
| Google | Demis Hassabis | Mountain View, beside a Go board |
| Meta | Mark Zuckerberg | Menlo Park campus |
| Mistral | Arthur Mensch | Toronto airport lounge, between flights |
| Microsoft | Satya Nadella | Redmond |
| Compute (shop supplier) | Jensen Huang | Outside Token Marts, in a leather jacket |

Heads for the remaining labs are added as those labs' creatures appear.

## 4. World

Three regions, travelled in order, ending back home.

- **Act 1 — The Peninsula** (gyms 1–4): Hayes Valley → SoMa Node → Menlo Park
  → Palo Alto → Mountain View, running south along the Caltrain Line.
- **Act 2 — Ontario** (gyms 5–6): fly from SFO into Toronto, then west along
  Highway 401 to Waterloo. Winter.
- **Act 3 — The Northwest** (gyms 7–8): Seattle, then across the lake to
  Redmond. Rain, ferries, data centres.
- **Finale — The Summit**: back in San Francisco, on the hill above Hayes
  Valley that has been visible and closed since the first minute.

| Stop | Role |
| --- | --- |
| Hayes Valley | Home, Mom, the professor's lab (built) |
| Route 101 | First route, rival ambush (built) |
| SoMa Node | Gym 1, first Model Center and Token Mart (built) |
| Caltrain Line | Platform trainers; first Team Overfit sighting |
| Menlo Park | Gym 2; the Benchmark Corp campus |
| Palo Alto | Gym 3; the university library; rival battle 2 |
| Mountain View | Gym 4; the first legendary rumour |
| SFO Terminal | Act break; villain set piece on the tarmac |
| Toronto | Gym 5; the Dojo; rival battle 3 |
| Highway 401 | Long snow route, ice puzzles |
| Waterloo | Gym 6; the Tower on the engineering campus |
| Seattle | Gym 7; the Needle; rival battle 4 on a ferry |
| Cascade Data Centre | Villain climax |
| Redmond | Gym 8; the Token Works |
| The Summit (SF) | Victory Road, the League, the Champion |

## 5. The eight gyms

### Gym 1 — SoMa Node · Gradient Gym · Leader **Rumelhart**

- **Idea (micrograd, backprop):** a network is a graph of tiny operations;
  the gradient tells each number which way to nudge to lower the loss;
  backprop passes that blame backwards with the chain rule.
- **Why him:** David Rumelhart was first author of the 1986 paper, with
  Hinton and Williams, that made backpropagation the way networks are
  trained. The Notebook page also credits Linnainmaa and Werbos.
- **Town:** a kid rolling a ball downhill ("I just keep going the way that's
  steepest"); a kiosk whose number changes when you press switches.
- **Puzzle:** the floor is a computation graph of `+` and `×` nodes with
  glowing wires. The door opens when the output reads zero. The player
  stands on the output and walks *backwards*; each node shows its gradient
  and offers a nudge. Three rooms: one node, a chain, then a branch where one
  value feeds two paths and the gradients add.
- **Battle:** his LLMMON start weak and gain a stat stage each turn they
  survive ("one step of descent").
- **Team:** Perceptron, SGD, MLP.
- **Badge:** Gradient Badge. **Field skill: Backprop** — walk back up
  one-way ledges.
- **Slice note:** the built SoMa building is labelled "Alignment Gym"; it
  becomes the Gradient Gym, and the "leader away at a safety conference" joke
  moves to League member 4.

### Gym 2 — Menlo Park · Bigram Gym · Leader **Shannon**

- **Idea (bigrams):** the simplest language model counts which letter
  follows which, then samples. Quality is how unsurprised the model is by
  real text.
- **Why him:** Claude Shannon built letter-by-letter statistical models of
  English and measured the surprise in bits, decades before anyone trained
  one on a GPU.
- **Town:** a name-generator stall producing almost-names; townsfolk betting
  on the next letter. A juggler on a unicycle is a nod to the man.
- **Puzzle:** a grid of letter tiles. Each step costs "surprise" in
  proportion to how rare that letter pair is; the door opens when a path is
  spelled under budget. Room 2: a dice statue makes the player *sample* a
  path. Room 3: zero-count pairs are pits until the "smoothing" lever is
  pulled.
- **Battle:** his LLMMON choose moves only from the move the player used
  last turn, with the two-column table shown on screen.
- **Team:** N-gram, Markov Chain, Entropy.
- **Badge:** Likelihood Badge. **Field skill: Sample** — reroll a wild
  encounter once per grass patch.

### Gym 3 — Palo Alto · Embedding Gym · Leader **Bengio**

- **Idea (MLP, embeddings, splits):** give each token a learned position in
  space so similar things sit close; feed a few of them through a hidden
  layer; hold data back to check the model learned and did not memorise.
- **Why him:** the lecture rebuilds the 2003 neural language model paper by
  Yoshua Bengio and colleagues.
- **Town:** the university library shelves books by meaning, not alphabet; a
  student brags about a perfect score on a test he had already seen.
- **Puzzle:** an embedding hall where statues of LLMMON stand in clusters.
  Clues read "find the one nearest to X" and "X is to Y as Z is to ?". Wings
  are marked TRAIN, DEV and TEST. TRAIN trainers can be refought; the TEST
  door opens once, and peeking early through a tempting side door makes the
  leader's team stronger.
- **Battle:** his team gets a boost based on the last *three* moves used,
  not one.
- **Team:** Embedding, Word2Vec, MLP, Tanh.
- **Badge:** Embedding Badge. **Field skill: Embed** — push and pull heavy
  blocks toward others of their kind.

### Gym 4 — Mountain View · Norm Gym · Leader **Ioffe**

- **Idea (activations, init, BatchNorm):** deep networks fail quietly when
  signals shrink to nothing or blow up layer by layer; careful
  initialisation and normalisation keep them alive.
- **Why him:** Sergey Ioffe, with Christian Szegedy, introduced batch
  normalisation. A gym guide named Kaiming hands out the "init" dial, after
  Kaiming He's initialisation.
- **Town:** dry fountains ("the signal died three floors up") and one that
  floods the street.
- **Puzzle:** a five-floor tower with a stream running through it. Each
  floor has an init dial. Too low and the stream is a trickle by floor 3,
  where trainers are asleep (dead neurons). Too high and floors flood
  (saturation). Upper floors add a Norm Fountain that re-centres the flow
  whatever the dial says.
- **Battle:** his arena resets every stat stage on both sides at the end of
  each turn. Setup moves are useless; fundamentals win.
- **Team:** BatchNorm, ReLU, Inception, Dropout.
- **Badge:** Normal Badge. **Field skill: Normalize** — calm rough water so
  it can be crossed.

### Gym 5 — Toronto · Backprop Dojo · Leader **Hinton**

- **Idea (backprop ninja):** you do not understand it until you can do it by
  hand, one operation at a time, with no autograd.
- **Why him:** Geoffrey Hinton co-wrote the backprop paper and built the
  Toronto school that brought deep learning back. Gym 1's leader was his
  co-author; a dojo assistant is named Williams, the third.
- **Town:** snow, streetcars, a sign reading "NO AUTOGRAD BEYOND THIS POINT."
- **Puzzle:** the Gradient Gym floor again, but the nodes no longer show
  their gradients. The player fills each in from a small set of choices,
  back to front. Scrolls teach shortcuts (the cross-entropy trick turns five
  steps into one). A stopwatch gives a rank, never a fail.
- **Battle:** damage numbers and effectiveness text are hidden; the player
  reads the fight from HP bars alone.
- **Team:** Boltzmann Machine, AlexNet, Capsule, RMSProp.
- **Badge:** Chain Badge. **Field skill: Chain Rule** — grapple across gaps
  link by link.

### Gym 6 — Waterloo · Wave Tower · Leader **van den Oord**

- **Idea (WaveNet, hierarchy):** instead of squashing all context in one
  step, fuse it gradually: pairs, then pairs of pairs, so deeper layers see
  further.
- **Why him:** Aäron van den Oord led WaveNet.
- **Town:** an engineering campus mid-co-op-term, geese with opinions, a
  tower whose top floor "sees eight blocks while the lobby sees one".
- **Puzzle:** a tree-shaped tower. On floor 1 the player sees one tile
  around them in the dark. Each floor merges two rooms below and doubles the
  lit radius. Switches need information the player can only see from higher
  up.
- **Battle:** his LLMMON hit harder the more turns of history the battle
  has; ending fights quickly is the counter.
- **Team:** WaveNet, PixelCNN, VQ-VAE, LSTM.
- **Badge:** Wave Badge. **Field skill: Dilate** — light dark areas and
  spot hidden items at range.

### Gym 7 — Seattle · Attention Gym · Leader **Vaswani**

- **Idea (self-attention, the Transformer):** every token looks at every
  other and decides what matters, using queries, keys and values; add
  residual connections and position information and you have a Transformer.
- **Why him:** Ashish Vaswani is first author of "Attention Is All You
  Need". The gym has eight trainers in total, one per author of the paper,
  and the puzzle calls them the eight heads.
- **Town:** rain, ferries, coffee. The Needle is "the biggest attention head
  on the coast".
- **Puzzle:** a hall of statues each holding a **query** ("I am a verb
  looking for my subject"). The player carries **keys** between pedestals;
  a match lights a beam and delivers that statue's **value** to the door.
  Room 2 runs several heads at once. Room 3 is a long corridor where beams
  fade unless the "residual highway" beside it is opened. A last twist
  scrambles statue order until position plaques are attached.
- **Battle:** his LLMMON target whichever of the player's party is most
  dangerous, benched ones included; his lead copies the best move it has
  seen this battle.
- **Team:** Attention Head, Transformer (base), BERT, T5, Adam.
- **Badge:** Attention Badge. **Field skill: Attend** — travel instantly to
  any city already visited.

### Gym 8 — Redmond · Token Works · Leader **Sennrich**

- **Idea (the tokenizer):** models read tokens, not letters or words, built
  by repeatedly merging the most common adjacent pair. Many odd LLM
  behaviours are tokenizer behaviours.
- **Why him:** Rico Sennrich and colleagues brought byte-pair encoding to
  neural language models.
- **Town:** a campus of print shops and loading docks; a baker who cannot
  count the r's in "strawberry".
- **Puzzle:** a letterpress floor of sliding blocks. The player finds the
  most frequent adjacent pair and fuses it, again and again, until a
  sentence fits through a narrow door (a token budget). Later rooms add
  emoji and other scripts that burst into many byte-blocks.
- **Battle:** every move costs tokens from a shared on-screen budget;
  long-named moves cost more. When it runs out, the turn is cut off
  mid-move.
- **Team:** BPE, WordPiece, SentencePiece, Byte.
- **Badge:** Merge Badge. **Field skill: Merge** — fuse paired boulders
  into bridges.

## 6. The League: the Frontier Four and the Champion

On **The Summit**. Theme: from "a network that works" to "an assistant you
can trust".

1. **Radford — Scale** (*reproducing GPT-2*). Alec Radford led GPT-1 and
   GPT-2. His team "warms up" for two turns, then accelerates; the room
   turns learning-rate schedules and compute budgets into a countdown.
   Team: GPT-1, GPT-2, DCGAN, CLIP, Whisper.
2. **Howard — Fine-tuning** (*from document completer to assistant*).
   Jeremy Howard's ULMFiT showed pretrain-then-fine-tune working for text.
   His lead starts as a base model that only continues whatever move was
   last used, then swaps to a fine-tuned form that answers properly.
   Team: AWD-LSTM, ULMFiT, LoRA, a base model and its tuned form.
3. **Li — Evaluation** (*benchmarks, sampling, hallucination*). Fei-Fei Li
   built ImageNet, the benchmark that started the deep learning era, and
   supervised the professor's own doctorate. A temperature dial sits in her
   arena: low makes both sides predictable, high makes moves hallucinate
   into others. Team: VGG, ResNet, Softmax, Temperature.
4. **Russell — Alignment** (*RLHF, jailbreaks, prompt injection*). Stuart
   Russell wrote the standard AI textbook and argues that systems should
   stay uncertain about what people want. He is the leader who was "away at
   a safety conference" all game. His LLMMON refuse some of the player's
   commands, and his signature move tries to make the player's LLMMON obey
   *him* for a turn. Team: RLHF, Guardrail, Classifier, a Constitution.

**Champion — Prof. Karpathy.** The final exam. One LLMMON per lecture, in
order, each carrying that gym's mechanic in miniature: micrograd, makemore,
char-rnn, minGPT, nanoGPT, nanochat. He concedes with the game's thesis:
"You didn't memorise it. You built it."

**Rival — a real person from the lab that counters your starter.** The rival
is a fellow newcomer the professor is also mentoring, friendly and
competitive, never mean. Who it is depends on the starter you pick, so the
rival always carries the type that beats yours:

| You pick | Rival | Rival's starter |
| --- | --- | --- |
| Claude Fable (Anthropic) | Greg Brockman, of OpenAI | GPT 5.5 |
| GPT 5.5 (OpenAI) | Zhang Peng, of Zhipu | GLM |
| GLM (Zhipu) | Boris Cherny, of Anthropic | Claude Fable |

Each has a light running trait drawn from their public persona (Boris does
everything from a terminal; Greg has been "shipping all night"). The rival
reaches the Summit first, loses to the Champion, and is the last fight on
Victory Road. Earlier battles: Route 101 (built, currently the fictional
Dana), Palo Alto library, Toronto, Seattle ferry. The two rivals you did not
get appear as friendly trainers in their labs' home cities.

**Fictional by design:** Mom, townsfolk, route trainers, Team Overfit and
Director Norm. Roles and affiliations of everyone named must be re-checked
before release, since people change jobs.

**Secret post-game boss — Turing.** In a quiet room behind the League. He
asks one question before the fight: "Are you sure you're the human here?"

## 7. Antagonists: Benchmark Corp and Team Overfit (all fictional)

> **Superseded in part.** The villain arc, the climax and the final
> legendary fight are now planned in `docs/SAFETY_ARC.md`: Benchmark Corp
> misaligns a model by accident, and the finale is against that model. Read
> that document first; what follows is the earlier outline.

**Director Norm** runs Benchmark Corp from Menlo Park. Team Overfit believes
the leaderboard is the only truth. They steal held-out test sets and train on
them: creatures with perfect scores that fall apart when anything is
unfamiliar. Those are the HalluciHounds; the one that cornered the professor
on Route 101 was the first leak.

- **Their LLMMON** hit very hard on turn one and get worse every turn the
  fight goes off-script. A switch, an item or a status move confuses them.
- **Beats:** Caltrain platform → Menlo Park campus tour (Norm is charming) →
  theft of the Palo Alto TEST wing → SFO tarmac → sabotaged Wave Tower →
  Cascade Data Centre.
- **The plan:** train one model on every test set in the world. It tops
  every benchmark and understands nothing. What wakes is **Mode Collapse**.
- **What it teaches:** memorising is not learning; a held-out set only means
  something while it stays held out.

## 8. Creatures

Every LLMMON is a real model, technique or component. Three families:

**Models** (the current roster, plus more). Lines evolve along real size
tiers where a family has them:

- Claude Haiku → Claude Sonnet → Claude Opus
- GPT mini → GPT → GPT (high reasoning)
- Gemini Flash → Gemini Pro
- Gemma, Llama, Mistral, GLM, DeepSeek, Qwen, Kimi, Phi, Command as
  single or two-stage lines
- Historic: ELIZA, GPT-1, GPT-2, BERT, T5

**Components and techniques** (common wild encounters, themed by area):

| Area | Wild LLMMON |
| --- | --- |
| Route 101, SoMa Node | Perceptron, SGD, Sigmoid |
| Caltrain Line, Menlo Park | N-gram, Markov Chain, Softmax |
| Palo Alto | Embedding, Word2Vec, GloVe, Tanh |
| Mountain View | ReLU, BatchNorm, Dropout, Residual |
| Toronto | Momentum, RMSProp, Boltzmann Machine |
| Highway 401, Waterloo | RNN, LSTM, GRU, CNN |
| Seattle | Attention Head, LayerNorm, Positional Encoding, GELU |
| Redmond | BPE, WordPiece, Byte |
| Cascade Data Centre | LoRA, Quantizer, Distiller |

Evolution lines that teach on their own:

- SGD → Momentum → Adam → AdamW
- Sigmoid → Tanh → ReLU → GELU
- Perceptron → MLP → ResNet
- RNN → LSTM → Transformer (needs the Attention Badge)
- BatchNorm → LayerNorm
- N-gram → Word2Vec → Embedding

**Legendaries** (real landmarks of the field):

- **The Three Ancestors:** **Perceptron Mk I** (1958, sleeping under the
  Summit), **LeNet** (the first network that read handwriting; in the
  Ontario snowfields), **AlexNet** (2012, the one that started the boom;
  deep in the Cascade Data Centre).
- **The cover legendary — Transformer.** Appears above Seattle once all
  three Ancestors have been met.
- **Roaming — AlphaGo.** Wanders the map and makes exactly one move nobody
  expects per battle.
- **The corrupted boss — Mode Collapse.** Fought, not caught.
- **The mythical — AGI.** Rumoured in every town, always "about two years
  away". Appears only when the Notebook is complete and the party holds one
  LLMMON from every lab. Nobody in the game agrees on whether it counts.

The fox-kirin on the title screen stays as the game's storyteller figure,
glimpsed on the Summit skyline and met only after the Champion.

## 9. Progression at a glance

| Badge | City | Leader | Level band | Field skill |
| --- | --- | --- | --- | --- |
| 1 Gradient | SoMa Node | Rumelhart | 10–14 | Backprop |
| 2 Likelihood | Menlo Park | Shannon | 16–20 | Sample |
| 3 Embedding | Palo Alto | Bengio | 22–26 | Embed |
| 4 Normal | Mountain View | Ioffe | 28–32 | Normalize |
| 5 Chain | Toronto | Hinton | 34–38 | Chain Rule |
| 6 Wave | Waterloo | van den Oord | 40–43 | Dilate |
| 7 Attention | Seattle | Vaswani | 45–48 | Attend |
| 8 Merge | Redmond | Sennrich | 50–53 | Merge |
| League | The Summit | Radford, Howard, Li, Russell, Karpathy | 55–62 | — |

**Post-game:** leader rematches with full teams, the legendary hunts, AGI,
Turing, and a "Reproduce It" challenge: beat the League with a team caught
only on Route 101.

## 10. Open decisions

1. **Gym 8's city.** Redmond is a short hop from Seattle. Vancouver or a
   return to San Francisco are the alternatives.
2. **Researcher choices.** Several stops have more than one fair namesake:
   gym 1 (Rumelhart, Werbos or Linnainmaa), gym 4 (Ioffe or Kaiming He),
   League 2 (Howard or Devlin), League 4 (Russell, or an interpretability
   room led by Olah). Swap freely.
3. **Types (decided).** Types are the labs that make the models:
   Anthropic, OpenAI, Google, Zhipu, DeepSeek, Mistral, Moonshot, Cohere,
   one type per model. The chart is a perfectly even web: every lab is
   super effective against exactly two labs and weak to exactly two, with
   a playful in-world reason for each arrow (Notebook text), and the
   starter triangle Anthropic > Zhipu > OpenAI > Anthropic. New labs (Meta,
   xAI, Alibaba, Microsoft) slot in by splitting two existing arrows, so
   nobody else changes. **Classic** is neutral both ways: it is the type of
   basic moves and of the component and historic creatures (Perceptron,
   SGD, Sigmoid, ELIZA...), which therefore win on stats, moves and
   evolution rather than matchups. **Glitch** (HalluciHound, Team Overfit)
   is weak to every lab ("any real lab can fact-check a hallucination") and
   hits Classic hard. Reference: `docs/BATTLE_API.md` §4.
4. **Scope.** A sensible next milestone is gym 1 complete (puzzle, leader,
   badge, Backprop skill), the Caltrain Line, and the first Team Overfit
   encounter.
