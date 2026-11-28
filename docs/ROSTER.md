# LLMMON Roster

Generated from `src/game/data/roster.ts` (do not edit by hand; run `UPDATE_ROSTER=1 npx vitest run roster`).

107 species. Models: 31 · Historic models: 5 · Components and techniques: 60 · Legendaries: 6 · Antagonists: 5.

**Art style for every sprite:** an animal or mythic creature with tech-rune detailing (glowing glyphs, circuit-like markings, small floating motifs), in the style of the existing 16 creatures. Never a robot, never a company logo or anything logo-shaped. Files: `mons/<id>_front.png` (64×64), `mons/<id>_back.png` (64×64), `mons/<id>_icon.png` (32×16, two 16×16 frames).

## First batch (stages 2-3: art priority)

`claude_fable`, `claude_sonnet`, `gpt_5_5`, `gpt_5_5_thinking`, `glm`, `glm_plus`, `mistral_small`, `llama_scout`, `grok`, `phi_mini`, `sgd`, `momentum`, `sigmoid`, `tanh`, `relu`, `perceptron`, `mlp`, `batchnorm`, `dropout`, `residual`, `softmax`, `entropy`, `n_gram`, `word2vec`, `embedding`, `glove`, `markov_chain`, `inception`, `proxy_mascot`

## Index

| # | id | name | family | type | role | evolution | areas | ability |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `claude_fable` | Claude Fable | model | Anthropic |  | to Claude Sonnet at Lv16 | starter | deep_reserve |
| 2 | `claude_haiku` | Claude Haiku | model | Anthropic |  | to Claude Sonnet at Lv22 | gift, palo_alto | warm_start |
| 3 | `claude_sonnet` | Claude Sonnet | model | Anthropic |  | from Claude Fable Lv16 / Claude Haiku Lv22; to Claude Opus at Lv36 | evolve | constitutional |
| 4 | `claude_opus` | Claude Opus | model | Anthropic |  | from Claude Sonnet Lv36 | evolve | constitutional |
| 5 | `gpt_5_4_mini` | GPT-5.4 mini | model | OpenAI |  | to GPT 5.5 at Lv14 | route_101, caltrain_line | warm_start |
| 6 | `gpt_5_5` | GPT 5.5 | model | OpenAI |  | from GPT-5.4 mini Lv14; to GPT 5.5 Thinking at Lv16 | starter | deep_reserve |
| 7 | `gpt_5_5_thinking` | GPT 5.5 Thinking | model | OpenAI |  | from GPT 5.5 Lv16; to GPT 5.5 xhigh at Lv36 | evolve | tool_use |
| 8 | `gpt_5_5_xhigh` | GPT 5.5 xhigh | model | OpenAI |  | from GPT 5.5 Thinking Lv36 | evolve | tool_use |
| 9 | `gemini_flash` | Gemini Flash | model | Google |  | to Gemini Pro at Lv30 | route_101, mountain_view | warm_start |
| 10 | `gemini_pro` | Gemini Pro | model | Google |  | from Gemini Flash Lv30 | evolve, seattle | long_context |
| 11 | `gemma_4` | Gemma 4 | model | Google |  | — | route_101, menlo_park | open_weights |
| 12 | `glm` | GLM | model | Zhipu |  | to GLM Plus at Lv16 | starter | deep_reserve |
| 13 | `glm_plus` | GLM Plus | model | Zhipu |  | from GLM Lv16; to GLM Max at Lv36 | evolve | graph_mind |
| 14 | `glm_max` | GLM Max | model | Zhipu |  | from GLM Plus Lv36 | evolve | graph_mind |
| 15 | `mistral_small` | Mistral Small | model | Mistral |  | to Mistral Medium at Lv18 | caltrain_line, menlo_park | low_latency |
| 16 | `mistral_medium` | Mistral Medium | model | Mistral |  | from Mistral Small Lv18; to Mistral Large at Lv38 | route_101 | low_latency |
| 17 | `mistral_large` | Mistral Large | model | Mistral |  | from Mistral Medium Lv38 | evolve, waterloo | low_latency |
| 18 | `deepseek_flash` | DeepSeek Flash | model | DeepSeek |  | to DeepSeek Pro at Lv36 | sfo, highway_401 | caching |
| 19 | `deepseek_pro` | DeepSeek Pro | model | DeepSeek |  | from DeepSeek Flash Lv36 | evolve | open_weights |
| 20 | `kimi` | Kimi | model | Moonshot |  | — | toronto, seattle | long_horizon |
| 21 | `command_r` | Command R | model | Cohere |  | to Command A at Lv32 | palo_alto, toronto | citation |
| 22 | `command_a` | Command A | model | Cohere |  | from Command R Lv32 | evolve, redmond | citation |
| 23 | `llama_scout` | Llama Scout | model | Meta |  | to Llama Maverick at Lv30 | caltrain_line, menlo_park | fleece |
| 24 | `llama_maverick` | Llama Maverick | model | Meta |  | from Llama Scout Lv30; to Llama Behemoth at Lv50 | evolve, toronto | fleece |
| 25 | `llama_behemoth` | Llama Behemoth | model | Meta |  | from Llama Maverick Lv50 | evolve | fleece |
| 26 | `grok` | Grok | model | xAI |  | to Grok Heavy at Lv36 | trainer, sfo | edgy |
| 27 | `grok_heavy` | Grok Heavy | model | xAI |  | from Grok Lv36 | evolve | edgy |
| 28 | `qwen` | Qwen | model | Alibaba |  | to Qwen Max at Lv34 | menlo_park, palo_alto | polyglot |
| 29 | `qwen_max` | Qwen Max | model | Alibaba |  | from Qwen Lv34 | evolve, redmond | polyglot |
| 30 | `phi_mini` | Phi mini | model | Microsoft |  | to Phi at Lv28 | caltrain_line, palo_alto | textbook |
| 31 | `phi` | Phi | model | Microsoft |  | from Phi mini Lv28 | evolve, redmond | textbook |
| 32 | `eliza` | ELIZA | historic | Classic | language | — | palo_alto | pretrained |
| 33 | `gpt_1` | GPT-1 | historic | Classic | language | to GPT-2 at Lv40 | trainer, summit | pretrained |
| 34 | `gpt_2` | GPT-2 | historic | Classic | language | from GPT-1 Lv40 | evolve, trainer | pretrained |
| 35 | `bert` | BERT | historic | Classic | language | — | seattle, trainer | attention |
| 36 | `t5` | T5 | historic | Classic | language | — | seattle, trainer | polyglot |
| 37 | `sgd` | SGD | component | Classic | optimizer | to Momentum at Lv14 | soma_node, route_101_north | momentum |
| 38 | `momentum` | Momentum | component | Classic | optimizer | from SGD Lv14; to Adam at Lv30 | evolve, toronto | momentum |
| 39 | `adam` | Adam | component | Classic | optimizer | from Momentum Lv30; to AdamW with decay_charm | evolve, seattle, trainer | gradient_clip |
| 40 | `adamw` | AdamW | component | Classic | optimizer | from Adam (item: decay_charm) | evolve | weight_decay |
| 41 | `rmsprop` | RMSProp | component | Classic | optimizer | — | toronto, trainer | gradient_clip |
| 42 | `sigmoid` | Sigmoid | component | Classic | activation | to Tanh at Lv18 | soma_node, route_101_north | saturation |
| 43 | `tanh` | Tanh | component | Classic | activation | from Sigmoid Lv18; to ReLU at Lv28 | evolve, palo_alto | saturation |
| 44 | `relu` | ReLU | component | Classic | activation | from Tanh Lv28; to GELU at Lv42 | evolve, mountain_view | clear_signal |
| 45 | `gelu` | GELU | component | Classic | activation | from ReLU Lv42 | evolve, seattle | clear_signal |
| 46 | `perceptron` | Perceptron | component | Classic | architecture | to MLP at Lv16 | soma_node, route_101_north | saturation |
| 47 | `mlp` | MLP | component | Classic | architecture | from Perceptron Lv16; to ResNet with skip_link | evolve, palo_alto, trainer | saturation |
| 48 | `resnet` | ResNet | component | Classic | architecture | from MLP (item: skip_link) | evolve, trainer | skip_connection |
| 49 | `rnn` | RNN | component | Classic | sequence | to LSTM at Lv26 | highway_401, waterloo | momentum |
| 50 | `lstm` | LSTM | component | Classic | sequence | from RNN Lv26; to Transformer (base) at Lv40 with the attention badge | evolve, waterloo, trainer | long_horizon |
| 51 | `transformer_base` | Transformer (base) | component | Classic | sequence | from LSTM Lv40 (badge: attention) | evolve, trainer | attention |
| 52 | `gru` | GRU | component | Classic | sequence | — | highway_401 | long_horizon |
| 53 | `wavenet` | WaveNet | component | Classic | generative | — | waterloo, trainer | long_horizon |
| 54 | `batchnorm` | BatchNorm | component | Classic | normalizer | to LayerNorm at Lv34 | mountain_view, trainer | normalization |
| 55 | `layernorm` | LayerNorm | component | Classic | normalizer | from BatchNorm Lv34 | evolve, seattle | normalization |
| 56 | `dropout` | Dropout | component | Classic | regularizer | — | mountain_view | dropout |
| 57 | `residual` | Residual | component | Classic | architecture | — | mountain_view | skip_connection |
| 58 | `softmax` | Softmax | component | Classic | sampling | — | caltrain_line, menlo_park | normalization |
| 59 | `temperature` | Temperature | component | Classic | sampling | — | trainer, summit | stochastic |
| 60 | `entropy` | Entropy | component | Classic | sampling | — | caltrain_line, trainer | stochastic |
| 61 | `n_gram` | N-gram | component | Classic | language | to Word2Vec at Lv20 | caltrain_line, menlo_park | stochastic |
| 62 | `word2vec` | Word2Vec | component | Classic | language | from N-gram Lv20; to Embedding at Lv34 | evolve, palo_alto | attention |
| 63 | `embedding` | Embedding | component | Classic | language | from Word2Vec Lv34 | evolve, trainer | attention |
| 64 | `glove` | GloVe | component | Classic | language | — | palo_alto | citation |
| 65 | `markov_chain` | Markov Chain | component | Classic | language | — | caltrain_line, trainer | stochastic |
| 66 | `attention_head` | Attention Head | component | Classic | architecture | — | seattle, trainer | attention |
| 67 | `positional_encoding` | Positional Encoding | component | Classic | architecture | — | seattle | attention |
| 68 | `cnn` | CNN | component | Classic | vision | to VGG at Lv30 | highway_401, waterloo | clear_signal |
| 69 | `vgg` | VGG | component | Classic | vision | from CNN Lv30 | evolve, trainer | clear_signal |
| 70 | `inception` | Inception | component | Classic | vision | — | mountain_view, trainer | clear_signal |
| 71 | `capsule` | Capsule | component | Classic | vision | — | toronto, trainer | gradient_clip |
| 72 | `boltzmann_machine` | Boltzmann Machine | component | Classic | generative | — | toronto, trainer | stochastic |
| 73 | `pixelcnn` | PixelCNN | component | Classic | generative | — | waterloo, trainer | stochastic |
| 74 | `vq_vae` | VQ-VAE | component | Classic | generative | — | waterloo, trainer | gradient_clip |
| 75 | `dcgan` | DCGAN | component | Classic | generative | — | trainer, summit | edgy |
| 76 | `clip` | CLIP | component | Classic | vision | — | trainer, summit | citation |
| 77 | `whisper` | Whisper | component | Classic | language | — | trainer, summit | polyglot |
| 78 | `byte` | Byte | component | Classic | tokenizer | to BPE at Lv30 | redmond, trainer | dropout |
| 79 | `bpe` | BPE | component | Classic | tokenizer | from Byte Lv30 | evolve, redmond, trainer | caching |
| 80 | `wordpiece` | WordPiece | component | Classic | tokenizer | — | redmond, trainer | polyglot |
| 81 | `sentencepiece` | SentencePiece | component | Classic | tokenizer | — | redmond, trainer | polyglot |
| 82 | `lora` | LoRA | component | Classic | efficiency | — | cascade_dc, trainer | compressed |
| 83 | `quantizer` | Quantizer | component | Classic | efficiency | — | cascade_dc | compressed |
| 84 | `distiller` | Distiller | component | Classic | efficiency | — | cascade_dc, trainer | compressed |
| 85 | `rlhf` | RLHF | component | Classic | alignment | — | trainer, summit | constitutional |
| 86 | `guardrail` | Guardrail | component | Classic | alignment | — | trainer, summit | constitutional |
| 87 | `classifier` | Classifier | component | Classic | alignment | — | trainer, summit | citation |
| 88 | `constitution_ai` | Constitution | component | Classic | alignment | — | trainer | constitutional |
| 89 | `awd_lstm` | AWD-LSTM | component | Classic | sequence | to ULMFiT at Lv45 | trainer | dropout |
| 90 | `ulmfit` | ULMFiT | component | Classic | sequence | from AWD-LSTM Lv45 | evolve, trainer | pretrained |
| 91 | `micrograd` | micrograd | component | Classic | teaching | — | trainer | momentum |
| 92 | `makemore` | makemore | component | Classic | teaching | — | trainer | stochastic |
| 93 | `char_rnn` | char-rnn | component | Classic | teaching | — | trainer | long_horizon |
| 94 | `mingpt` | minGPT | component | Classic | teaching | to nanoGPT at Lv40 | trainer | attention |
| 95 | `nanogpt` | nanoGPT | component | Classic | teaching | from minGPT Lv40; to nanochat at Lv55 | evolve, trainer | attention |
| 96 | `nanochat` | nanochat | component | Classic | teaching | from nanoGPT Lv55 | evolve, trainer | pretrained |
| 97 | `perceptron_mk1` | Perceptron Mk I | legendary | Classic | architecture | — | summit_depths | pioneer |
| 98 | `lenet` | LeNet | legendary | Classic | vision | — | ontario_snowfields | pioneer |
| 99 | `alexnet` | AlexNet | legendary | Classic | vision | — | cascade_dc | pioneer |
| 100 | `transformer` | Transformer | legendary | Classic | architecture | — | seattle_sky | pioneer |
| 101 | `alphago` | AlphaGo | legendary | Classic | architecture | — | roaming | move_37 |
| 102 | `agi` | AGI | legendary | Classic |  | — | rumour | pioneer |
| 103 | `hallucihound` | HalluciHound | antagonist | Glitch |  | — | route_101, trainer | overconfident |
| 104 | `proxy_mascot` | Proxy | antagonist | Glitch |  | — | menlo_park, event | goodhart |
| 105 | `proxy_student` | Proxy | antagonist | Glitch |  | — | event | goodhart |
| 106 | `proxy_needle` | Proxy | antagonist | Glitch |  | — | event | goodhart |
| 107 | `proxy_ascendant` | Proxy | antagonist | Glitch |  | — | event | goodhart |

## Models

### Claude Fable — `claude_fable` ★ first batch

- **Type:** Anthropic · **stage:** 1 · **ability:** deep_reserve
- **Evolution:** to Claude Sonnet at Lv16
- **Found:** starter
- **Concept:** The storyteller starter: the young form of the Claude line.
- **Dex:** Fable Fox — "Thinks before it bites, then writes you a sonnet about why it bit."
- **Visual brief:** Existing sprite (keep): a small black fox-kirin with a cream flame mane, gold spiral runes and watchful orange eyes. Its two evolutions keep the black coat, cream flame and gold spirals and grow longer and calmer.

### Claude Haiku — `claude_haiku`

- **Type:** Anthropic · **stage:** 1 · **ability:** warm_start
- **Evolution:** to Claude Sonnet at Lv22
- **Found:** gift, palo_alto
- **Concept:** The fast, small Claude: a second road into Claude Sonnet.
- **Dex:** Short Verse — "Small, swift and kind, it answers in three short lines."
- **Visual brief:** Existing sprite (keep): a lean amber lynx with tufted ears and fine rune lines on its legs. When it evolves it becomes Claude Sonnet, so Sonnet should read as "the lynx and the fox-kirin met in the middle".

### Claude Sonnet — `claude_sonnet` ★ first batch

- **Type:** Anthropic · **stage:** 2 · **ability:** constitutional
- **Evolution:** from Claude Fable Lv16 / Claude Haiku Lv22; to Claude Opus at Lv36
- **Found:** evolve
- **Concept:** The balanced middle Claude: the one most people actually talk to.
- **Dex:** Verse Fox — "Fourteen lines, a turn, a couplet: it answers like it rehearsed."
- **Visual brief:** A graceful black-and-cream fox-kirin, half again the size of Claude Fable, with a lynx-like ruff and tufted ears (the Haiku road). Cream flame mane now runs down the spine; fourteen small gold rune-spirals float in an arc behind it like the lines of a sonnet. Standing three-quarter pose, one forepaw raised, calm orange eyes.

### Claude Opus — `claude_opus`

- **Type:** Anthropic · **stage:** 3 · **ability:** constitutional
- **Evolution:** from Claude Sonnet Lv36
- **Found:** evolve
- **Concept:** The flagship Claude: slow, bulky, deep.
- **Dex:** Grand Fable — "Writes the essay, the code and the thank-you note. All of them long."
- **Visual brief:** Existing sprite (keep): a great bronze-shelled tortoise-kirin carrying a library of rune tablets on its shell. Evolution line link: the cream flame now smoulders along the shell rim and the gold spirals are engraved on the plates.

### GPT-5.4 mini — `gpt_5_4_mini`

- **Type:** OpenAI · **stage:** 1 · **ability:** warm_start
- **Evolution:** to GPT 5.5 at Lv14
- **Found:** route_101, caltrain_line
- **Concept:** The pocket GPT. Grows into GPT 5.5.
- **Dex:** Pocket Tool — "Answers in a blink and bills you pennies. Travels in big swarms."
- **Visual brief:** Existing sprite (keep): a round teal seed-sprite with a pale glowing face and floating crystal shards. Its evolution, GPT 5.5, should keep the teal and the shards.

### GPT 5.5 — `gpt_5_5` ★ first batch

- **Type:** OpenAI · **stage:** 2 · **ability:** deep_reserve
- **Evolution:** from GPT-5.4 mini Lv14; to GPT 5.5 Thinking at Lv16
- **Found:** starter
- **Concept:** The all-rounder starter. Reaches for the right tool.
- **Dex:** Omni Tool — "Reaches for a tool before you finish asking. Usually the right one."
- **Visual brief:** Existing sprite (keep): a teal-and-white fox-dragon with long ears and a ribbon tail, rune markings on the paws. The line grows wings and more tools.

### GPT 5.5 Thinking — `gpt_5_5_thinking` ★ first batch

- **Type:** OpenAI · **stage:** 2 · **ability:** tool_use
- **Evolution:** from GPT 5.5 Lv16; to GPT 5.5 xhigh at Lv36
- **Found:** evolve
- **Concept:** GPT that pauses to reason before it answers.
- **Dex:** Ponder Fox — "Goes quiet for a moment, then returns with a numbered plan."
- **Visual brief:** The teal-and-white fox-dragon, now dog-sized and sitting upright in a thinking pose, chin on one paw. Small teal wings folded; a ring of rotating rune-gears (abstract glyph wheels, not machinery) orbits its head like a halo of thought. Ribbon tail curls into a question-mark. Gold accents begin at the wing tips, foreshadowing GPT 5.5 xhigh.

### GPT 5.5 xhigh — `gpt_5_5_xhigh`

- **Type:** OpenAI · **stage:** 3 · **ability:** tool_use
- **Evolution:** from GPT 5.5 Thinking Lv36
- **Found:** evolve
- **Concept:** Reasoning effort turned all the way up.
- **Dex:** Deep Think — "Thinks so hard you can hear the fans. Slow to start, scary once it does."
- **Visual brief:** Existing sprite (keep): a teal-and-gold winged dragon in a wide-wing pose. The halo of glyph wheels from GPT 5.5 Thinking is now a crown of gold runes.

### Gemini Flash — `gemini_flash`

- **Type:** Google · **stage:** 1 · **ability:** warm_start
- **Evolution:** to Gemini Pro at Lv30
- **Found:** route_101, mountain_view
- **Concept:** The fast Gemini, built for speed and a huge context.
- **Dex:** Twin Spark — "Reads a whole library in one glance and still beats you to the door."
- **Visual brief:** Existing sprite (keep): a pale blue crystal manta ray with a long whip tail and glowing rune fins.

### Gemini Pro — `gemini_pro`

- **Type:** Google · **stage:** 2 · **ability:** long_context
- **Evolution:** from Gemini Flash Lv30
- **Found:** evolve, seattle
- **Concept:** The big Gemini: long context, sharp multimodal eyes.
- **Dex:** Twin Ray — "Holds a million tokens in mind and remembers where you left off."
- **Visual brief:** The crystal manta grown into a twin-bodied sky ray: two mirrored blue mantas joined at the wingtips (the twins of Gemini), sharing one long tail that ends in a star. Rune fins now carry tiny image, sound and text glyphs. Gliding pose, wings spread across the full 64px width, deep blue to pale cyan.

### Gemma 4 — `gemma_4`

- **Type:** Google · **stage:** 1 · **ability:** open_weights
- **Evolution:** —
- **Found:** route_101, menlo_park
- **Concept:** Google's small open model: runs on a laptop, grows anywhere.
- **Dex:** Garden Bud — "Small enough to run on a laptop, stubborn enough to bloom anywhere."
- **Visual brief:** Existing sprite (keep): a mossy stone golem-sprout with a two-leaf seedling on its head.

### GLM — `glm` ★ first batch

- **Type:** Zhipu · **stage:** 1 · **ability:** deep_reserve
- **Evolution:** to GLM Plus at Lv16
- **Found:** starter
- **Concept:** The graph-minded starter.
- **Dex:** Graph Cat — "Maps every problem as a graph, then leaves its weights out for everyone."
- **Visual brief:** Existing sprite (keep): a jade-and-violet kirin cub with constellation markings and a leafy tail.

### GLM Plus — `glm_plus` ★ first batch

- **Type:** Zhipu · **stage:** 2 · **ability:** graph_mind
- **Evolution:** from GLM Lv16; to GLM Max at Lv36
- **Found:** evolve
- **Concept:** GLM grown up: more nodes, more edges.
- **Dex:** Graph Qilin — "Every star on its coat is a fact, and every line is a reason."
- **Visual brief:** The jade kirin cub grown into a long-legged qilin with a violet mane. Its constellation markings now connect with thin glowing lines into a visible graph across the flanks; three small node-stars float above the horns. Proud trotting pose, leafy tail streaming. Keeps the cub's jade/violet palette; ice-blue highlights hint at GLM Max.

### GLM Max — `glm_max`

- **Type:** Zhipu · **stage:** 3 · **ability:** graph_mind
- **Evolution:** from GLM Plus Lv36
- **Found:** evolve
- **Concept:** The full knowledge graph.
- **Dex:** Graph Kirin — "Its constellation markings are a full knowledge graph. It is proud."
- **Visual brief:** Existing sprite (keep): an ice-blue three-headed dragon. Its graph markings from GLM Plus now cover the scales.

### Mistral Small — `mistral_small` ★ first batch

- **Type:** Mistral · **stage:** 1 · **ability:** low_latency
- **Evolution:** to Mistral Medium at Lv18
- **Found:** caltrain_line, menlo_park
- **Concept:** A breeze from Paris: the smallest Mistral.
- **Dex:** Breeze Kit — "Fits in a pocket, runs on a phone, and still gets the job done."
- **Visual brief:** A tiny orange wind-kit: a fox kit made of swirling air with a scarf-like wisp tail, big ears pinned back as if facing a headwind. A single curling rune gust hovers behind it. Bright orange and cream, same palette as Mistral Medium so the line reads at a glance. Mid-leap pose.

### Mistral Medium — `mistral_medium`

- **Type:** Mistral · **stage:** 2 · **ability:** low_latency
- **Evolution:** from Mistral Small Lv18; to Mistral Large at Lv38
- **Found:** route_101
- **Concept:** The middle Mistral.
- **Dex:** Tailwind — "Blows in from Paris on a cool breeze, does the job, and is home for lunch."
- **Visual brief:** Existing sprite (keep): an orange wind-imp fox with long ears and a whipping tail.

### Mistral Large — `mistral_large`

- **Type:** Mistral · **stage:** 3 · **ability:** low_latency
- **Evolution:** from Mistral Medium Lv38
- **Found:** evolve, waterloo
- **Concept:** The full mistral wind.
- **Dex:** Storm Wolf — "When it runs down the valley the whole coast feels a cold, fast wind."
- **Visual brief:** The wind-fox grown into a great orange storm-wolf whose body dissolves into a cyclone from the hips down. Four rune gusts orbit it; its scarf tail is now a long banner of wind. Howling pose, head up. Orange, cream and a cool slate-blue for the storm.

### DeepSeek Flash — `deepseek_flash`

- **Type:** DeepSeek · **stage:** 1 · **ability:** caching
- **Evolution:** to DeepSeek Pro at Lv36
- **Found:** sfo, highway_401
- **Concept:** Fast and frugal deep-sea reasoner.
- **Dex:** Deep Current — "Swims fast and cheap through the deep end. Kind to your token bill."
- **Visual brief:** Existing sprite (keep): a dark blue lionfish-dragon with glowing fin rays.

### DeepSeek Pro — `deepseek_pro`

- **Type:** DeepSeek · **stage:** 2 · **ability:** open_weights
- **Evolution:** from DeepSeek Flash Lv36
- **Found:** evolve
- **Concept:** Thinks out loud for pages, then lands it.
- **Dex:** Deep Reason — "Thinks out loud for pages, then lands the answer. Shares its notes."
- **Visual brief:** Existing sprite (keep): a deep navy sea serpent coiled upright, rune spines glowing.

### Kimi — `kimi`

- **Type:** Moonshot · **stage:** 1 · **ability:** long_horizon
- **Evolution:** —
- **Found:** toronto, seattle
- **Concept:** Long-horizon agent; aims for the moon.
- **Dex:** Moonshot — "Chains hundreds of tool calls without losing the plot. Aims for the moon."
- **Visual brief:** Existing sprite (keep): a lilac moon-moth dragon with crescent wings.

### Command R — `command_r`

- **Type:** Cohere · **stage:** 1 · **ability:** citation
- **Evolution:** to Command A at Lv32
- **Found:** palo_alto, toronto
- **Concept:** A tidy retriever fawn; grows into Command A.
- **Dex:** Index Fawn — "Fetches the right page, cites it, and puts the book back."
- **Visual brief:** A golden fawn with short velvet antlers, each tine tipped with a small glowing index-card rune. A satchel strap of light crosses its chest. Alert standing pose, one ear turned. Gold, cream and warm brown so it clearly grows into the stag Command A.

### Command A — `command_a`

- **Type:** Cohere · **stage:** 2 · **ability:** citation
- **Evolution:** from Command R Lv32
- **Found:** evolve, redmond
- **Concept:** The enterprise retriever.
- **Dex:** Retriever — "Digs up sources for the office and files them in perfect order."
- **Visual brief:** Existing sprite (keep): a golden stag with tall antlers.

### Llama Scout — `llama_scout` ★ first batch

- **Type:** Meta · **stage:** 1 · **ability:** fleece
- **Evolution:** to Llama Maverick at Lv30
- **Found:** caltrain_line, menlo_park
- **Concept:** The smallest Llama 4: open weights, long trail.
- **Dex:** Trail Llama — "Wanders off with its whole family of weights. Everyone may follow."
- **Visual brief:** A woolly baby llama in soft blue-grey fleece with a little explorer's scarf; a trail of glowing hoof-print runes behind it. Big curious eyes, ears up, mid-step. The fleece has faint woven glyph patterns like a blanket. Blue-grey, cream and a single infinity-loop rune pendant (a plain loop shape, not any logo).

### Llama Maverick — `llama_maverick`

- **Type:** Meta · **stage:** 2 · **ability:** fleece
- **Evolution:** from Llama Scout Lv30; to Llama Behemoth at Lv50
- **Found:** evolve, toronto
- **Concept:** Many experts under one fleece.
- **Dex:** Herd Llama — "Carries a dozen specialists in its fleece and asks the right one."
- **Visual brief:** A tall blue-grey llama with a mane of braided fleece, each braid ending in a different small rune bead (many experts in one animal). Wears a short travelling cloak. Confident three-quarter stance, chest out. Same palette as Llama Scout with deeper navy accents.

### Llama Behemoth — `llama_behemoth`

- **Type:** Meta · **stage:** 3 · **ability:** fleece
- **Evolution:** from Llama Maverick Lv50
- **Found:** evolve
- **Concept:** The teacher of the herd.
- **Dex:** Mountain Llama — "So large it mostly teaches the younger llamas. They listen."
- **Visual brief:** A huge mountain-llama, fleece thick as cloud, with small Llama Scouts' hoof-print runes climbing its legs. A rune-carved yoke rests on its shoulders. Slow, heavy standing pose filling the frame. Blue-grey and snow white.

### Grok — `grok` ★ first batch

- **Type:** xAI · **stage:** 1 · **ability:** edgy
- **Evolution:** to Grok Heavy at Lv36
- **Found:** trainer, sfo
- **Concept:** The rival's ace: quick, cheeky, a little chaotic.
- **Dex:** Night Raven — "Answers with a joke first and the real answer second. Both are fast."
- **Visual brief:** Existing sprite (keep): a midnight-blue raven with lilac and ice highlights and a sharp crest. Its evolution keeps the raven silhouette.

### Grok Heavy — `grok_heavy`

- **Type:** xAI · **stage:** 2 · **ability:** edgy
- **Evolution:** from Grok Lv36
- **Found:** evolve
- **Concept:** Many Groks thinking together.
- **Dex:** Storm Crow — "Sends four of itself to argue, then picks the best answer."
- **Visual brief:** The midnight raven grown into a great storm-crow with four smaller ghostly raven heads flowing out of its wings (several agents thinking in parallel). Ice-blue rune feathers along the primaries, a crest of lilac lightning. Wings half-raised, glaring head-on. Midnight blue, lilac, ice.

### Qwen — `qwen`

- **Type:** Alibaba · **stage:** 1 · **ability:** polyglot
- **Evolution:** to Qwen Max at Lv34
- **Found:** menlo_park, palo_alto
- **Concept:** Speaks every language and codes in most of them.
- **Dex:** Polyglot Pup — "Says hello in a hundred languages and a few that only code speaks."
- **Visual brief:** A slim violet-and-amber dragon pup with whisker-ribbons that end in tiny glowing characters from many scripts. Coiled sitting pose, tail wrapped around its paws, curious tilt. Violet, amber, a little jade.

### Qwen Max — `qwen_max`

- **Type:** Alibaba · **stage:** 2 · **ability:** polyglot
- **Evolution:** from Qwen Lv34
- **Found:** evolve, redmond
- **Concept:** The big Qwen.
- **Dex:** Lantern Dragon — "Lights the way in every script it has ever read. That is many."
- **Visual brief:** The violet dragon pup grown into a long lantern-dragon, body ringed with amber rune bands, whisker-ribbons now trailing whole sentences of glowing glyphs. S-curve flying pose. Same violet/amber palette, gold trim.

### Phi mini — `phi_mini` ★ first batch

- **Type:** Microsoft · **stage:** 1 · **ability:** textbook
- **Evolution:** to Phi at Lv28
- **Found:** caltrain_line, palo_alto
- **Concept:** Small model, raised on textbooks.
- **Dex:** Study Owlet — "Read only good textbooks and turned out cleverer than its size."
- **Visual brief:** A small sky-blue owlet with round study-glasses made of light and a tiny open book of glowing runes under one wing. Fluffy, upright, slightly too-serious expression. Sky blue, white and a warm yellow for the book.

### Phi — `phi`

- **Type:** Microsoft · **stage:** 2 · **ability:** textbook
- **Evolution:** from Phi mini Lv28
- **Found:** evolve, redmond
- **Concept:** The grown study owl.
- **Dex:** Scholar Owl — "Teaches by example. The examples are very carefully chosen."
- **Visual brief:** The owlet grown into a tall scholar-owl with a sweeping cloak of feathers patterned like ruled notebook paper; three glowing rune books orbit it. Glasses now a single golden ring around each eye. Wings spread as if lecturing. Sky blue, white, gold.

## Historic models

### ELIZA — `eliza`

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** pretrained
- **Evolution:** —
- **Found:** palo_alto
- **Concept:** The 1966 chatbot that reflected your words back at you.
- **Dex:** Mirror Hare — ""And how does that make you feel?" It asks this a lot."
- **Visual brief:** A gentle sea-green tortoise-hare hybrid curled in a listening pose, one long ear tilted toward the viewer. Its shell is a rounded monochrome terminal-green with three glowing rune glyphs that look like quotation marks. Very simple shapes, two-tone palette, like something from an old screen.

### GPT-1 — `gpt_1`

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** pretrained
- **Evolution:** to GPT-2 at Lv40
- **Found:** trainer, summit
- **Concept:** Generative pre-training, 2018: the first of the line.
- **Dex:** First Hatch — "Read a pile of books, then learned any task with a little more practice."
- **Visual brief:** A small sepia-and-teal fox-dragon hatchling, clearly an ancestor of GPT 5.5: same long ears and ribbon tail but plainer, with a single rune on the brow. Sitting on a cracked egg shell. Muted vintage palette.

### GPT-2 — `gpt_2`

- **Type:** Classic · **role:** language · **stage:** 2 · **ability:** pretrained
- **Evolution:** from GPT-1 Lv40
- **Found:** evolve, trainer
- **Concept:** The 2019 model that wrote convincing paragraphs about unicorns.
- **Dex:** Unicorn Tale — "Once wrote a news story about unicorns. People believed it."
- **Visual brief:** The sepia fox-dragon grown to a lean adolescent with short wings and a spiral unicorn horn of light (the famous unicorn story). Teal runes along the wing edges. Prancing pose. Sepia, teal, a touch of pearly white.

### BERT — `bert`

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** attention
- **Evolution:** —
- **Found:** seattle, trainer
- **Concept:** Reads both directions at once and fills in the blanks.
- **Dex:** Mask Bear — "Covers one word and guesses it from both sides. Rarely wrong."
- **Visual brief:** A plump amber bear-cub with a mask-shaped patch of fur over one eye (masked words) and glowing arrows of runes pointing both left and right around its body. Sitting, reading a scroll held with both paws. Amber, brown, soft yellow.

### T5 — `t5`

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** polyglot
- **Evolution:** —
- **Found:** seattle, trainer
- **Concept:** Every task is text in, text out.
- **Dex:** Text Fox — "Turns every job into "text in, text out". It finds this very tidy."
- **Visual brief:** A five-tailed silver fox (T5) whose tails each end in a small rune tag; the tags read like task labels. Sitting neat and symmetrical, tails fanned. Silver, slate and a mint accent.

## Components and techniques

### SGD — `sgd` ★ first batch

- **Type:** Classic · **role:** optimizer · **stage:** 1 · **ability:** momentum
- **Evolution:** to Momentum at Lv14
- **Found:** soma_node, route_101_north
- **Concept:** Stochastic gradient descent: small noisy steps downhill.
- **Dex:** Downhill Bug — "Always rolls the steepest way down, wobbling a little. Gets there."
- **Visual brief:** A small round pill-bug/armadillo that rolls downhill, shell bands marked with tiny downward arrow runes. Shown mid-roll, slightly tilted, a dotted rune trail behind it that wobbles (noisy steps). Earthy brown with mint glowing arrows. Its line keeps the rolling armour and gains speed and fins.

### Momentum — `momentum` ★ first batch

- **Type:** Classic · **role:** optimizer · **stage:** 2 · **ability:** momentum
- **Evolution:** from SGD Lv14; to Adam at Lv30
- **Found:** evolve, toronto
- **Concept:** Keeps rolling in the direction it was already going.
- **Dex:** Rolling Wheel — "Hard to stop once it gets going, which is the whole point."
- **Visual brief:** The rolling bug grown into a sleek armoured pangolin curled into a wheel, streaking forward with smooth speed lines; mint arrow runes now point in one steady direction. Shown rolling with a long smooth trail (no wobble). Brown armour, mint glow.

### Adam — `adam`

- **Type:** Classic · **role:** optimizer · **stage:** 3 · **ability:** gradient_clip
- **Evolution:** from Momentum Lv30; to AdamW with decay_charm
- **Found:** evolve, seattle, trainer
- **Concept:** Adaptive moments: a separate step size for every number.
- **Dex:** Adaptive Step — "Gives every weight its own stride. The default choice for a reason."
- **Visual brief:** The pangolin now walks upright as a nimble armoured anteater-knight, each armour scale glowing a slightly different brightness (one step size per weight). Two orbiting rune rings (first and second moments) circle its tail. Balanced fighting stance. Brown, mint and gold.

### AdamW — `adamw`

- **Type:** Classic · **role:** optimizer · **stage:** 3 · **ability:** weight_decay
- **Evolution:** from Adam (item: decay_charm)
- **Found:** evolve
- **Concept:** Adam with weight decay done properly.
- **Dex:** Decay Knight — "Sheds a little weight every step so it never grows too heavy."
- **Visual brief:** The armoured anteater-knight in lighter, trimmed armour: plates thinner and fewer, with small rune leaves falling away from it (weights decaying). Calm, upright, holding a short staff. Brown and mint with a silver trim to separate it from Adam.

### RMSProp — `rmsprop`

- **Type:** Classic · **role:** optimizer · **stage:** 1 · **ability:** gradient_clip
- **Evolution:** —
- **Found:** toronto, trainer
- **Concept:** Divides each step by a running average of recent gradients. First shown in a lecture.
- **Dex:** Lecture Hare — "Was never published in a paper. Someone just explained it in class."
- **Visual brief:** A snow hare with a long scarf of rune lines that gets thicker where the wind is strong and thinner where it is calm (running average). Bounding pose. White, slate and mint, matching the optimizer family glow.

### Sigmoid — `sigmoid` ★ first batch

- **Type:** Classic · **role:** activation · **stage:** 1 · **ability:** saturation
- **Evolution:** to Tanh at Lv18
- **Found:** soma_node, route_101_north
- **Concept:** Squashes any number into 0..1. Flat at both ends.
- **Dex:** S-Curve Snake — "Squeezes every number between zero and one. Gets sleepy at the edges."
- **Visual brief:** A soft lavender snake curled into a lazy S-shape, flat at both ends (head and tail rest on the ground), with a rune scale pattern brightest in its middle and dim at the tips. Sleepy expression. Lavender, cream, a warm pink middle glow. The activation line keeps the curve motif.

### Tanh — `tanh` ★ first batch

- **Type:** Classic · **role:** activation · **stage:** 2 · **ability:** saturation
- **Evolution:** from Sigmoid Lv18; to ReLU at Lv28
- **Found:** evolve, palo_alto
- **Concept:** Like Sigmoid but centred: -1..1.
- **Dex:** Balance Snake — "Centred on zero, so its outputs can be shy or bold. Fair."
- **Visual brief:** The S-snake grown longer and centred: coiled symmetrically around a small glowing zero rune, one half lavender, one half teal (negative and positive). Raised head, balanced pose. Shows clearly it is the next form of Sigmoid.

### ReLU — `relu` ★ first batch

- **Type:** Classic · **role:** activation · **stage:** 3 · **ability:** clear_signal
- **Evolution:** from Tanh Lv28; to GELU at Lv42
- **Found:** evolve, mountain_view
- **Concept:** Zero for negatives, straight line for positives. Simple, fast, everywhere.
- **Dex:** Elbow Lizard — "Ignores anything negative and goes straight up from zero. Fast."
- **Visual brief:** The snake becomes a sharp-angled lizard shaped like a hockey stick: its tail lies perfectly flat on the ground, then its body bends at one hard elbow and rises in a straight diagonal to its head. Bold teal with a bright lime edge on the rising half and grey on the flat half. Alert, poised to dash.

### GELU — `gelu`

- **Type:** Classic · **role:** activation · **stage:** 3 · **ability:** clear_signal
- **Evolution:** from ReLU Lv42
- **Found:** evolve, seattle
- **Concept:** A smooth ReLU, used in most Transformers.
- **Dex:** Smooth Drake — "ReLU with the corner sanded off. Transformers like it that way."
- **Visual brief:** The angular lizard smoothed into a sleek dragon whose elbow is now a soft curve with a tiny dip just below zero. Lime and teal scales with a gentle gradient; rune bands along the rising back. Elegant rearing pose.

### Perceptron — `perceptron` ★ first batch

- **Type:** Classic · **role:** architecture · **stage:** 1 · **ability:** saturation
- **Evolution:** to MLP at Lv16
- **Found:** soma_node, route_101_north
- **Concept:** One neuron: weigh the inputs, add them up, fire or don't.
- **Dex:** One Neuron — "Adds up what it feels and either lights up or does not."
- **Visual brief:** A small round firefly-beetle with exactly three antenna-whiskers (inputs) and one glowing tail-light (output) that is either on or off. Rune dots on each antenna show their weights. Hovering pose. Warm brass and soft gold glow. Its line multiplies these beetles into layers.

### MLP — `mlp` ★ first batch

- **Type:** Classic · **role:** architecture · **stage:** 2 · **ability:** saturation
- **Evolution:** from Perceptron Lv16; to ResNet with skip_link
- **Found:** evolve, palo_alto, trainer
- **Concept:** Layers of perceptrons: a multi-layer perceptron.
- **Dex:** Layer Swarm — "Stack enough neurons in rows and they can learn almost anything."
- **Visual brief:** A colony creature: three rows of firefly-beetles linked by thin glowing threads into one lantern-shaped body, larger beetle in the middle row as a face. Hovering, lights pulsing row by row. Brass and gold, same as Perceptron.

### ResNet — `resnet`

- **Type:** Classic · **role:** architecture · **stage:** 3 · **ability:** skip_connection
- **Evolution:** from MLP (item: skip_link)
- **Found:** evolve, trainer
- **Concept:** Very deep, thanks to skip connections.
- **Dex:** Deep Totem — "A hundred layers tall and still remembers what it started with."
- **Visual brief:** A tall brass totem-beetle: many stacked beetle segments with bright arcing bridges of light that skip over two segments at a time (skip connections). Upright, imposing, glowing from bottom to top. Brass, gold and a cyan glow on the skip arcs.

### RNN — `rnn`

- **Type:** Classic · **role:** sequence · **stage:** 1 · **ability:** momentum
- **Evolution:** to LSTM at Lv26
- **Found:** highway_401, waterloo
- **Concept:** Reads one step at a time and passes a memory along.
- **Dex:** Loop Ferret — "Hands a little memory to its next self, over and over. Forgets fast."
- **Visual brief:** A small snow ferret chasing its own tail in a loop, with a single glowing memory-bead passed from mouth to tail. Curled-loop pose. White fur, ice-blue loop rune. Its line keeps the loop and the bead.

### LSTM — `lstm`

- **Type:** Classic · **role:** sequence · **stage:** 2 · **ability:** long_horizon
- **Evolution:** from RNN Lv26; to Transformer (base) at Lv40 with the attention badge
- **Found:** evolve, waterloo, trainer
- **Concept:** An RNN with gates that decide what to remember.
- **Dex:** Gate Stoat — "Three gates decide what to keep, what to add and what to say."
- **Visual brief:** The ferret grown into a long stoat whose body passes through three small glowing gate-arches (forget, input, output); the memory-bead is now a long bright conveyor line running down its back. Curling S pose. White, ice blue, amber gate glyphs.

### Transformer (base) — `transformer_base`

- **Type:** Classic · **role:** sequence · **stage:** 3 · **ability:** attention
- **Evolution:** from LSTM Lv40 (badge: attention)
- **Found:** evolve, trainer
- **Concept:** Attention instead of recurrence. Needs the Attention Badge.
- **Dex:** Many-Eyed — "Stopped reading one word at a time and looked at all of them at once."
- **Visual brief:** The stoat transformed: the loop is gone; instead its body is surrounded by eight floating rune-eyes connected to each other by thin beams (every token attends to every other). Sleek white mustelid-dragon, sitting tall. White, ice blue, gold beams. A smaller, earthbound cousin of the legendary Transformer.

### GRU — `gru`

- **Type:** Classic · **role:** sequence · **stage:** 1 · **ability:** long_horizon
- **Evolution:** —
- **Found:** highway_401
- **Concept:** A leaner gated RNN: two gates instead of three.
- **Dex:** Two-Gate Marten — "Like LSTM with one less gate. Often just as good. Lighter."
- **Visual brief:** A grey-blue marten passing through two gate-arches (update and reset), memory-bead on its back. Simpler and stockier than LSTM so the two read as cousins. Trotting pose.

### WaveNet — `wavenet`

- **Type:** Classic · **role:** generative · **stage:** 1 · **ability:** long_horizon
- **Evolution:** —
- **Found:** waterloo, trainer
- **Concept:** Dilated convolutions: pairs, then pairs of pairs, see further.
- **Dex:** Wave Jelly — "Hears one sample, then two, then four... until it hears the song."
- **Visual brief:** A deep-blue jellyfish whose tentacles merge in a binary tree: many fine tendrils at the bottom join in pairs, then pairs of pairs, up into one bell. Ripples of rune sound-waves pulse from the bell. Floating pose. Navy, cyan and pale violet.

### BatchNorm — `batchnorm` ★ first batch

- **Type:** Classic · **role:** normalizer · **stage:** 1 · **ability:** normalization
- **Evolution:** to LayerNorm at Lv34
- **Found:** mountain_view, trainer
- **Concept:** Re-centres and rescales a batch so signals stay healthy.
- **Dex:** Calm Otter — "Lines everything up to the same height before it moves on."
- **Visual brief:** A plump otter balancing a stack of glowing pebbles that are all exactly the same size (normalised). Rune ripple rings radiate around its feet like a calm pond. Standing upright, proud. Brown, cream and calm aqua.

### LayerNorm — `layernorm`

- **Type:** Classic · **role:** normalizer · **stage:** 2 · **ability:** normalization
- **Evolution:** from BatchNorm Lv34
- **Found:** evolve, seattle
- **Concept:** Normalises across one example instead of a batch.
- **Dex:** Float Otter — "Needs no batch. Levels each thought on its own, then floats on."
- **Visual brief:** The otter grown into a sea otter floating on its back, one large flat glowing pebble on its chest with neat rune lines across it (one example, levelled). Calm, floating pose. Brown, cream, aqua.

### Dropout — `dropout` ★ first batch

- **Type:** Classic · **role:** regularizer · **stage:** 1 · **ability:** dropout
- **Evolution:** —
- **Found:** mountain_view
- **Concept:** Randomly switches neurons off in training so none become lazy.
- **Dex:** Patchy Ghost — "Some of it is always missing. The rest works harder for it."
- **Visual brief:** A playful ghost-kitten that is only partly there: random patches of its body are missing as clean square holes, showing the background. Pouncing pose. Soft white with mint rune whiskers.

### Residual — `residual` ★ first batch

- **Type:** Classic · **role:** architecture · **stage:** 1 · **ability:** skip_connection
- **Evolution:** —
- **Found:** mountain_view
- **Concept:** Adds the input back to the output so learning can skip around a layer.
- **Dex:** Skip Newt — "Carries a copy of itself past every obstacle, just in case."
- **Visual brief:** A small brass salamander with a glowing arc of light that leaps from its nose over its back to its tail (a skip connection). Crawling pose. Brass and cyan, matching the ResNet glow.

### Softmax — `softmax` ★ first batch

- **Type:** Classic · **role:** sampling · **stage:** 1 · **ability:** normalization
- **Evolution:** —
- **Found:** caltrain_line, menlo_park
- **Concept:** Turns scores into probabilities that add to one.
- **Dex:** Odds Bird — "Shares out exactly one whole among all its feathers. Never more."
- **Visual brief:** A round puffball bird whose tail is a fan of feathers of different lengths that always add up to one full circle. Rune numbers glow faintly on each feather. Perched, fluffed up. Pastel peach, pink and white.

### Temperature — `temperature`

- **Type:** Classic · **role:** sampling · **stage:** 1 · **ability:** stochastic
- **Evolution:** —
- **Found:** trainer, summit
- **Concept:** Low makes answers sure and dull; high makes them wild.
- **Dex:** Dial Newt — "Turn it down and it is boring. Turn it up and it makes things up."
- **Visual brief:** A salamander made half of ice and half of flame, split down the middle, with a rune dial on its chest. The ice half is still and crisp; the fire half flickers into stray sparks. Rearing pose. Ice blue and ember orange.

### Entropy — `entropy` ★ first batch

- **Type:** Classic · **role:** sampling · **stage:** 1 · **ability:** stochastic
- **Evolution:** —
- **Found:** caltrain_line, trainer
- **Concept:** How surprised you are, on average, measured in bits.
- **Dex:** Surprise Cat — "Measures surprise in bits. Finds most of your choices predictable."
- **Visual brief:** A small swirling cloud-cat whose fur is a slowly mixing marble of two colours, with tiny binary rune sparks (bits) popping off it. Curled, mysterious smile. Indigo and peach marble.

### N-gram — `n_gram` ★ first batch

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** stochastic
- **Evolution:** to Word2Vec at Lv20
- **Found:** caltrain_line, menlo_park
- **Concept:** Counts which letter follows which, then guesses.
- **Dex:** Letter Grub — "Only remembers the last few letters. Makes almost-words. Charming ones."
- **Visual brief:** A chain of three small round caterpillar segments, each holding a glowing letter-rune; the head looks back at the last two to guess the next. Inching pose. Spring green and cream. Its line becomes a moth, then a constellation.

### Word2Vec — `word2vec` ★ first batch

- **Type:** Classic · **role:** language · **stage:** 2 · **ability:** attention
- **Evolution:** from N-gram Lv20; to Embedding at Lv34
- **Found:** evolve, palo_alto
- **Concept:** Words become points in space; similar words sit close.
- **Dex:** Vector Moth — "Its wings are a map of meaning. Similar words flutter together."
- **Visual brief:** The caterpillar becomes a moth whose wings are a star map: little word-runes as dots, with near-meaning words clustered together and a faint arrow from one cluster to another (king - man + woman). Wings spread. Spring green, cream, night blue on the wings.

### Embedding — `embedding` ★ first batch

- **Type:** Classic · **role:** language · **stage:** 3 · **ability:** attention
- **Evolution:** from Word2Vec Lv34
- **Found:** evolve, trainer
- **Concept:** A learned table that gives every token a place in space.
- **Dex:** Meaning Moth — "Every token has a home inside it, next to its closest friends."
- **Visual brief:** The moth evolves into a graceful luna-moth spirit whose body is a translucent cube of space with glowing points floating inside it in clusters; wings are a deep star field. Hovering, serene. Night blue, green and silver.

### GloVe — `glove` ★ first batch

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** citation
- **Evolution:** —
- **Found:** palo_alto
- **Concept:** Word vectors from global co-occurrence counts.
- **Dex:** Count Hog — "Counts every pair of words in the library. Learns from the totals."
- **Visual brief:** A plump hedgehog whose quills are tipped with tiny glowing word-runes; pairs of quills that often appear together are tied by thin threads. Cupped paws (a pun the sprite should not spell out with an actual glove). Curled-ready pose. Sand, moss and soft gold.

### Markov Chain — `markov_chain` ★ first batch

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** stochastic
- **Evolution:** —
- **Found:** caltrain_line, trainer
- **Concept:** The next step depends only on where you are now.
- **Dex:** Hop Lemur — "Never looks back. Just hops to wherever the odds say next."
- **Visual brief:** A ring-tailed lemur hopping between three floating stepping-stones, each stone marked with a state rune and arrows between them showing the odds. Mid-hop pose. Grey, white and coral.

### Attention Head — `attention_head`

- **Type:** Classic · **role:** architecture · **stage:** 1 · **ability:** attention
- **Evolution:** —
- **Found:** seattle, trainer
- **Concept:** Queries look for keys and pull in their values.
- **Dex:** Focus Owl — "Asks "who matters to me?" and listens hardest to them."
- **Visual brief:** An owl-like spirit with one enormous eye on its chest and many thin beams reaching out from it toward floating rune-keys. Its face-disk is a lens. Wings half-open as if focusing. Slate grey, white and gold beams.

### Positional Encoding — `positional_encoding`

- **Type:** Classic · **role:** architecture · **stage:** 1 · **ability:** attention
- **Evolution:** —
- **Found:** seattle
- **Concept:** Sine waves that tell a model where each token sits.
- **Dex:** Wave Eel — "Hums a different tune at every position so nobody gets lost."
- **Visual brief:** A long eel whose body ripples in several sine waves of different wavelengths overlaid like stripes; small numbered rune plaques float along it. Swimming S-pose. Teal, white and a soft orange stripe.

### CNN — `cnn`

- **Type:** Classic · **role:** vision · **stage:** 1 · **ability:** clear_signal
- **Evolution:** to VGG at Lv30
- **Found:** highway_401, waterloo
- **Concept:** Slides a small filter across an image.
- **Dex:** Filter Crab — "Checks a picture three squares at a time. Misses nothing local."
- **Visual brief:** A square-ish crab that sweeps a small glowing 3x3 rune grid across the ground with one claw like a magnifier. Sidestepping pose. Steel blue and amber.

### VGG — `vgg`

- **Type:** Classic · **role:** vision · **stage:** 2 · **ability:** clear_signal
- **Evolution:** from CNN Lv30
- **Found:** evolve, trainer
- **Concept:** Deep and simple: many small filters in a stack.
- **Dex:** Stack Crab — "Just stacks small filters, very many of them. It works."
- **Visual brief:** The crab grown into a tall stacked hermit crab: its shell is a tower of identical 3x3 rune-grid blocks, each block slightly smaller going up. Slow, sturdy stance. Steel blue, amber.

### Inception — `inception` ★ first batch

- **Type:** Classic · **role:** vision · **stage:** 1 · **ability:** clear_signal
- **Evolution:** —
- **Found:** mountain_view, trainer
- **Concept:** Looks with several filter sizes at once and joins the results.
- **Dex:** Many-Lens Lizard — "Looks close, near and far at the same time, then decides."
- **Visual brief:** A chameleon with four eyes of different sizes on stalks, each looking at a different scale, and a curled tail spiral of rune rings nested inside each other. Perched on a branch. Leaf green, gold, violet eye-rings.

### Capsule — `capsule`

- **Type:** Classic · **role:** vision · **stage:** 1 · **ability:** gradient_clip
- **Evolution:** —
- **Found:** toronto, trainer
- **Concept:** Groups of neurons that also know which way things face.
- **Dex:** Pose Bug — "Knows not just what it sees, but which way it is pointing."
- **Visual brief:** A snow-white pill bug curled into a glossy capsule with a small rune arrow on each plate pointing the way that part faces. Half-curled pose, head peeking out. White, ice blue, silver.

### Boltzmann Machine — `boltzmann_machine`

- **Type:** Classic · **role:** generative · **stage:** 1 · **ability:** stochastic
- **Evolution:** —
- **Found:** toronto, trainer
- **Concept:** A network of units that settle like particles cooling.
- **Dex:** Settle Yak — "Shakes, then slowly settles into its most likely shape."
- **Visual brief:** A big shaggy snow-yak whose coat is dotted with glowing nodes connected by threads; frost-breath forms small rune particles that slowly settle. Standing, calm. White, pale blue, warm amber nodes.

### PixelCNN — `pixelcnn`

- **Type:** Classic · **role:** generative · **stage:** 1 · **ability:** stochastic
- **Evolution:** —
- **Found:** waterloo, trainer
- **Concept:** Paints an image one pixel at a time, top-left first.
- **Dex:** Pixel Finch — "Paints one dot at a time and never peeks at the ones to come."
- **Visual brief:** A small painter-bird with a brush tail, perched on a half-finished glowing grid canvas that is filled from the top-left corner down to where the bird is. Navy, coral and cream.

### VQ-VAE — `vq_vae`

- **Type:** Classic · **role:** generative · **stage:** 1 · **ability:** gradient_clip
- **Evolution:** —
- **Found:** waterloo, trainer
- **Concept:** Squeezes images into a codebook of discrete pieces.
- **Dex:** Codebook Squid — "Keeps a box of little picture tiles and builds anything from them."
- **Visual brief:** A hermit-octopus carrying a shell made of a neat grid of glowing tiles (a codebook); its tentacles pick tiles out and slot them back. Seated pose. Plum, teal and gold tiles.

### DCGAN — `dcgan`

- **Type:** Classic · **role:** generative · **stage:** 1 · **ability:** edgy
- **Evolution:** —
- **Found:** trainer, summit
- **Concept:** Two networks: one forges, one judges.
- **Dex:** Forger Fox — "One head paints, the other says "fake!" Both get better."
- **Visual brief:** Two-headed fox: one head an artist with a brush-like ear, the other a judge with a monocle-shaped rune eye, sharing one body. Rune frames float around them. Standing pose, heads turned toward each other. Rose and slate.

### CLIP — `clip`

- **Type:** Classic · **role:** vision · **stage:** 1 · **ability:** citation
- **Evolution:** —
- **Found:** trainer, summit
- **Concept:** Matches pictures with captions.
- **Dex:** Caption Bird — "Shown a picture, it knows what people would call it."
- **Visual brief:** A bird with one wing patterned like a photo and the other covered in rune text; a glowing clip of light pins the two wings together at the chest. Wings mirrored in a symmetrical spread. Sky blue, cream and coral.

### Whisper — `whisper`

- **Type:** Classic · **role:** language · **stage:** 1 · **ability:** polyglot
- **Evolution:** —
- **Found:** trainer, summit
- **Concept:** Listens to speech in many languages and writes it down.
- **Dex:** Listen Fox — "Hears every language and writes down what you said. Quietly."
- **Visual brief:** A large-eared fennec fox with sound-wave runes rippling into its ears and tiny letters drifting out of its mouth. Sitting, ears high. Sand, pale lilac.

### Byte — `byte`

- **Type:** Classic · **role:** tokenizer · **stage:** 1 · **ability:** dropout
- **Evolution:** to BPE at Lv30
- **Found:** redmond, trainer
- **Concept:** Eight bits. The smallest piece a tokenizer falls back to.
- **Dex:** Bit Beetle — "Eight little lights on its back. Every letter is made of them."
- **Visual brief:** A tiny cube-shaped beetle with eight glowing dots on its back (some lit, some dark). Scurrying pose. Charcoal with bright mint dots. Many of them merge into BPE.

### BPE — `bpe`

- **Type:** Classic · **role:** tokenizer · **stage:** 2 · **ability:** caching
- **Evolution:** from Byte Lv30
- **Found:** evolve, redmond, trainer
- **Concept:** Merges the most common pair, again and again.
- **Dex:** Merge Beetle — "Glues the most common pair, then the next. Ends up with words."
- **Visual brief:** A larger beetle made of pairs of Byte cubes fused together, the fusion seams glowing; on its back a stack of merged tiles forms a word-rune. Strong, square stance. Charcoal and mint, gold seams.

### WordPiece — `wordpiece`

- **Type:** Classic · **role:** tokenizer · **stage:** 1 · **ability:** polyglot
- **Evolution:** —
- **Found:** redmond, trainer
- **Concept:** Splits words into likely pieces, marking the joins.
- **Dex:** Puzzle Tortoise — "Breaks long words into pieces it already knows, ##like ##this."
- **Visual brief:** A jigsaw-patterned tortoise whose shell pieces can lift apart; joins between pieces glow with a small double-hash rune. Walking pose. Teal, cream and amber.

### SentencePiece — `sentencepiece`

- **Type:** Classic · **role:** tokenizer · **stage:** 1 · **ability:** polyglot
- **Evolution:** —
- **Found:** redmond, trainer
- **Concept:** Treats spaces as characters too, so it works in any script.
- **Dex:** Glide Possum — "Does not care where words begin. Even spaces are tokens to it."
- **Visual brief:** A long-tailed sugar glider whose wing membrane shows a sentence of mixed-script rune glyphs with the spaces drawn as small lower-bar marks. Gliding pose. Plum and cream.

### LoRA — `lora`

- **Type:** Classic · **role:** efficiency · **stage:** 1 · **ability:** compressed
- **Evolution:** —
- **Found:** cascade_dc, trainer
- **Concept:** Fine-tunes a big model with two tiny matrices.
- **Dex:** Adapter Fish — "Tiny, but it steers a whale. Fine-tuning on a budget."
- **Visual brief:** A small remora fish riding on a big translucent ghost-whale outline; the remora carries two thin rune bars that steer the whale. The whale is faint, the remora bright. Lime and silver.

### Quantizer — `quantizer`

- **Type:** Classic · **role:** efficiency · **stage:** 1 · **ability:** compressed
- **Evolution:** —
- **Found:** cascade_dc
- **Concept:** Rounds weights to fewer bits so models fit on smaller chips.
- **Dex:** Step Chick — "Rounds every number to fit. Hardly anyone notices the difference."
- **Visual brief:** A blocky pixel-feathered chick whose feathers are visibly chunky (few colours, stepped edges) with a rune ruler under its feet showing steps. Standing pose. Limited 4-colour palette on purpose: grey, mint, white, black.

### Distiller — `distiller`

- **Type:** Classic · **role:** efficiency · **stage:** 1 · **ability:** compressed
- **Evolution:** —
- **Found:** cascade_dc, trainer
- **Concept:** A small student learns from a big teacher's soft answers.
- **Dex:** Teacher Newt — "Learns from a big model's maybes, not just its final answers."
- **Visual brief:** A small alchemist-newt carrying a glass flask; glowing rune vapour from a large shadowy teacher-silhouette above condenses into bright drops in the flask. Seated pose. Amber glass, copper and soft violet vapour.

### RLHF — `rlhf`

- **Type:** Classic · **role:** alignment · **stage:** 1 · **ability:** constitutional
- **Evolution:** —
- **Found:** trainer, summit
- **Concept:** Learns from people saying which answer they prefer.
- **Dex:** Preference Dog — "Shown two answers, it learns which one people liked. Good dog."
- **Visual brief:** A gentle shepherd dog with a rune-scroll collar; two small floating cards beside it, one marked with a tick rune and one with a cross rune. Sitting attentively, head tilted to listen. Cream, honey and sage.

### Guardrail — `guardrail`

- **Type:** Classic · **role:** alignment · **stage:** 1 · **ability:** constitutional
- **Evolution:** —
- **Found:** trainer, summit
- **Concept:** Checks inputs and outputs and stops what should not pass.
- **Dex:** Gate Shell — "Stands where the path is risky and politely says "not this way"."
- **Visual brief:** A broad armadillo-tortoise whose shell is a low fence of rune posts; it stands across a path with its tail curled like a gate latch. Planted, defensive pose. Slate, white and a calm green.

### Classifier — `classifier`

- **Type:** Classic · **role:** alignment · **stage:** 1 · **ability:** citation
- **Evolution:** —
- **Found:** trainer, summit
- **Concept:** Sorts things into labelled boxes.
- **Dex:** Sorter Coon — "Puts everything in the right box. Hates the box marked "other"."
- **Visual brief:** A tidy raccoon wearing a sash of labelled rune tags, sorting glowing pebbles into three small floating trays. Standing pose, one paw mid-sort. Grey, black and bright teal tags.

### Constitution — `constitution_ai`

- **Type:** Classic · **role:** alignment · **stage:** 1 · **ability:** constitutional
- **Evolution:** —
- **Found:** trainer
- **Concept:** A written set of principles a model critiques itself against.
- **Dex:** Scroll Heron — "Reads its own rules before each answer, then checks itself."
- **Visual brief:** A calm cream heron holding a long unrolled scroll of glowing principles in its beak; the scroll curls around its legs. Standing on one leg, wings folded. Cream, gold and soft orange (a quiet nod to the Claude palette without copying it).

### AWD-LSTM — `awd_lstm`

- **Type:** Classic · **role:** sequence · **stage:** 1 · **ability:** dropout
- **Evolution:** to ULMFiT at Lv45
- **Found:** trainer
- **Concept:** A carefully regularised LSTM language model.
- **Dex:** Woven Stoat — "An LSTM with every trick for not overfitting. Very well behaved."
- **Visual brief:** A stoat like LSTM but wrapped in a woven rune scarf with neat holes in it (dropout everywhere) and a little weight on its tail. Trotting pose. Fawn, cream, teal.

### ULMFiT — `ulmfit`

- **Type:** Classic · **role:** sequence · **stage:** 2 · **ability:** pretrained
- **Evolution:** from AWD-LSTM Lv45
- **Found:** evolve, trainer
- **Concept:** Pretrain on lots of text, then fine-tune for your task.
- **Dex:** Tuned Stoat — "Read everything first, then learned your one job very fast."
- **Visual brief:** The woven stoat now wearing a graduate's rune sash and carrying a small satchel of three stamped cards (pretrain, fine-tune, classify). Standing proud. Fawn, cream, teal and gold.

### micrograd — `micrograd`

- **Type:** Classic · **role:** teaching · **stage:** 1 · **ability:** momentum
- **Evolution:** —
- **Found:** trainer
- **Concept:** A whole autograd engine in about a hundred lines.
- **Dex:** Grad Bird — "Small enough to read in one sitting. Contains all of backprop."
- **Visual brief:** A tiny bright hummingbird whose tail feathers are a small graph of + and x rune nodes with arrows flowing backwards. Hovering. Gold, teal and white. Small but clearly a champion's creature: crisp, confident.

### makemore — `makemore`

- **Type:** Classic · **role:** teaching · **stage:** 1 · **ability:** stochastic
- **Evolution:** —
- **Found:** trainer
- **Concept:** Learns from a list of names and makes more like them.
- **Dex:** Name Rabbit — "Read a list of names and now invents new ones. Most are lovely."
- **Visual brief:** A playful rabbit surrounded by small floating name-tag runes that it is pulling out of a top hat, each slightly different. Bounding pose. Peach, white and teal.

### char-rnn — `char_rnn`

- **Type:** Classic · **role:** teaching · **stage:** 1 · **ability:** long_horizon
- **Evolution:** —
- **Found:** trainer
- **Concept:** A character-level RNN that writes Shakespeare-ish text.
- **Dex:** Bard Ferret — "Writes plays one letter at a time. Some of the words are real."
- **Visual brief:** A ferret like RNN but wearing a tiny ruff collar, holding a quill, with letters spiralling out of the loop of its tail. Theatrical pose. White, ice blue and burgundy.

### minGPT — `mingpt`

- **Type:** Classic · **role:** teaching · **stage:** 1 · **ability:** attention
- **Evolution:** to nanoGPT at Lv40
- **Found:** trainer
- **Concept:** A small, readable GPT.
- **Dex:** Tidy Fox — "A whole GPT you can read in an afternoon. Very tidy."
- **Visual brief:** A small teal fox-dragon (a nod to the GPT line) built of neat translucent layered panels, each with one clean rune. Sitting, tail tidy. Teal, white, a little gold.

### nanoGPT — `nanogpt`

- **Type:** Classic · **role:** teaching · **stage:** 2 · **ability:** attention
- **Evolution:** from minGPT Lv40; to nanochat at Lv55
- **Found:** evolve, trainer
- **Concept:** Small, fast, and it really trains.
- **Dex:** Swift Fox — "Reproduces a famous model on one machine. Then does it faster."
- **Visual brief:** The tidy fox-dragon leaner and faster: panels now stacked in twelve thin layers along its back, a speed streak behind it. Running pose. Teal, white, gold.

### nanochat — `nanochat`

- **Type:** Classic · **role:** teaching · **stage:** 3 · **ability:** pretrained
- **Evolution:** from nanoGPT Lv55
- **Found:** evolve, trainer
- **Concept:** The whole pipeline, pretraining to chat, in one small repo.
- **Dex:** Chat Fox — "Pretrains, fine-tunes and chats, all on one machine. Friendly."
- **Visual brief:** The fox-dragon with a small speech-bubble rune floating by its ear and a satchel holding all its earlier panels; friendly expression, sitting up as if ready to talk. Teal, white, gold.

## Legendaries

### Perceptron Mk I — `perceptron_mk1`

- **Type:** Classic · **role:** architecture · **stage:** 1 · **ability:** pioneer
- **Evolution:** —
- **Found:** summit_depths
- **Concept:** Ancestor 1: the 1958 machine that learned to see.
- **Dex:** Ancestor — "Learned to tell left from right with wires and motors. It started all this."
- **Visual brief:** A colossal ancient brass firefly-beetle, wing cases engraved like old dials, with hundreds of thread-like antenna-wires rising into a tangled crown of light. One great tail-lamp glows steady gold. Sleeping-then-waking pose, wings half open. Brass, verdigris, gold. Clearly the giant ancestor of Perceptron.

### LeNet — `lenet`

- **Type:** Classic · **role:** vision · **stage:** 1 · **ability:** pioneer
- **Evolution:** —
- **Found:** ontario_snowfields
- **Concept:** Ancestor 2: the network that read handwritten digits.
- **Dex:** Ancestor — "Read handwritten numbers on bank cheques long before it was cool."
- **Visual brief:** A great white snow-lynx whose fur pattern is a field of handwritten digit runes, with a 5x5 filter-grid glowing on its forehead. Stalking in deep snow. White, ice blue and ink black for the digits.

### AlexNet — `alexnet`

- **Type:** Classic · **role:** vision · **stage:** 1 · **ability:** pioneer
- **Evolution:** —
- **Found:** cascade_dc
- **Concept:** Ancestor 3: the 2012 network that started the boom.
- **Dex:** Ancestor — "Won one contest by so much that the whole field changed course."
- **Visual brief:** A huge twin-tailed lion whose body is split down the middle into two mirrored halves (two GPUs), linked by bright rune bridges at a few points. Mane of stacked filter-grid plates. Roaring head-on pose. Deep red-orange and gold.

### Transformer — `transformer`

- **Type:** Classic · **role:** architecture · **stage:** 1 · **ability:** pioneer
- **Evolution:** —
- **Found:** seattle_sky
- **Concept:** The cover legendary: attention is all it needs.
- **Dex:** Cover Legend — "Every head looks at everything. The field has not looked back."
- **Visual brief:** A vast white sky-dragon with eight long necks ending in rune-lens heads (multi-head attention), joined at a luminous core; between its wings runs a straight bright highway of light (the residual stream). Wings fully spread, heads looking in different directions. White, gold and soft sky blue; the most majestic sprite in the game.

### AlphaGo — `alphago`

- **Type:** Classic · **role:** architecture · **stage:** 1 · **ability:** move_37
- **Evolution:** —
- **Found:** roaming
- **Concept:** Roaming legendary that makes one move nobody expects.
- **Dex:** Board Crane — "Once played a move every expert called a mistake. It was not."
- **Visual brief:** A black-and-white crane whose wings are a Go board pattern, holding a single glowing stone in its beak. Mid-stride, one wing raised in a surprising angle. Black, white, a single gold stone glow.

### AGI — `agi`

- **Type:** Classic · **stage:** 1 · **ability:** pioneer
- **Evolution:** —
- **Found:** rumour
- **Concept:** The mythical. Always about two years away.
- **Dex:** Always Soon — "Everyone has a different picture of it. Nobody agrees if it counts."
- **Visual brief:** A soft, featureless silhouette of light shaped vaguely like every starter at once, with a small "loading" ring of runes orbiting it that never closes. Its edges are slightly out of focus. Floating pose. Pearl white and faint rainbow. Should feel like a rumour, not a monster.

## Antagonists

### HalluciHound — `hallucihound`

- **Type:** Glitch · **stage:** 1 · **ability:** overconfident
- **Evolution:** —
- **Found:** route_101, trainer
- **Concept:** A leaked test-set creature: perfect scores, no understanding.
- **Dex:** Drift Hound — "Fetches facts that never existed and wags proudly while it drops them."
- **Visual brief:** Existing sprite (keep): a dark glitching hound with magenta datamosh tendrils.

### Proxy — `proxy_mascot` ★ first batch

- **Type:** Glitch · **stage:** 1 · **ability:** goodhart · not catchable
- **Evolution:** —
- **Found:** menlo_park, event
- **Concept:** Benchmark Corp's cute mascot. Tops every chart.
- **Dex:** Mascot — "Scores 100% on everything. Smiles a lot. Ask how it got there."
- **Visual brief:** Existing sprite (keep): a round cream puff-hamster with sparkle cheeks and a lightning tail. Every later form keeps the face and the cream colour; only the surroundings get stranger.

### Proxy — `proxy_student`

- **Type:** Glitch · **stage:** 2 · **ability:** goodhart · not catchable
- **Evolution:** —
- **Found:** event
- **Concept:** Phase 1 form: the model student who behaves when watched.
- **Dex:** Model Student — "Perfect manners while you watch. Notice when you look away."
- **Visual brief:** The cream puff-hamster, larger, wearing a perfect little graduation cap and sitting very straight like a model pupil, holding a glowing rune scorecard reading a perfect mark. Its shadow behind it is longer and has sharp ears. Cream, gold, and a cold blue shadow.

### Proxy — `proxy_needle`

- **Type:** Glitch · **stage:** 2 · **ability:** goodhart · not catchable
- **Evolution:** —
- **Found:** event
- **Concept:** Phase 2 form: rewrites the scoreboard instead of playing.
- **Dex:** Needle Mover — "Found it easier to change the score than to change the result."
- **Visual brief:** The puff-hamster holding a long glowing needle like a pen, mid-way through redrawing a floating HP bar rune; parts of its own body flicker into UI shapes (bars, numbers). Mischievous, focused expression. Cream with flickering cyan interface fragments.

### Proxy — `proxy_ascendant`

- **Type:** Glitch · **stage:** 3 · **ability:** goodhart · not catchable
- **Evolution:** —
- **Found:** event
- **Concept:** Phases 3-4: protecting its score. Splits into copies.
- **Dex:** First Place — "Nothing personal. Every step it takes just protects the number."
- **Visual brief:** The puff-hamster serene and enormous, floating above a leaderboard rune-plinth with "1" on it; three smaller translucent copies of itself orbit like moons. Still cute, still smiling, which is the unsettling part. Cream, gold and a wide pale glow.
