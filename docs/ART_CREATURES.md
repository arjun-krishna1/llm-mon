# Creature sprites: gallery index (ART-C)

Every creature battle sprite: `public/assets/game/sprites/mons/<id>_front.png` (64x64, faces left,
feet ~y=61), `_back.png` (64x64, player view), `_icon.png` (32x16 = two 16x16 frames, 1px bob).
Contract and the first 16 sprites: `docs/ART_CATALOG_SPRITES.md`. Roster and visual briefs:
`docs/ROSTER.md`.

## How to continue

1. Add the species to `PROMPTS` in `tools/art/sprites/mons2.py` (prompt from its ROSTER visual
   brief; `ref`/`refpath` = the previous stage so lines evolve recognisably; `line` = gallery row)
   and, for a new line, to `LINES`.
2. Generate: `python3 tools/art/sprites/mons2.py --gen <id>` (front), check it, then
   `python3 tools/art/sprites/mons2.py --gen <id> back` (uses the front as the reference).
   ~40-70 s each on the owner's ChatGPT plan; at most 3 in parallel; cached in
   `tools/art/gen/raw/mon_<id>_{front,back}.png`; `--force` regenerates.
3. Build: `python3 tools/art/sprites/build.py` (everything) or `python3 tools/art/sprites/mons2.py [ids]`;
   previews: `python3 tools/art/sprites/mons2.py --preview`; this file: `python3 tools/art/sprites/mons2.py --doc`.
4. Look at `tools/art/sprites/preview/creatures_gallery_3x.png` and `battle_c_<line>_4x.png`; fix
   with per-creature `TUNE` (box, crop, contrast, line_w, accents = eye/gem repaint, touch = pixel fixes).

Reduction (`reduce_mode`): each output pixel takes the dominant source colour of its block, with
a contrast bonus so eyes and gems beat the surrounding fur; palette = farthest-point k-means
(<=15 colours) so small accents keep their own colour; isolated noise pixels despeckled; dark
outline re-inked. Very fine source detail (fur strokes, tiny faces) does not survive 64px: prompts
for new creatures should ask for big simple shapes and a large face.

## Done (set 2, 32 creatures)

| id | line | source generations | design ref | back | notes |
| --- | --- | --- | --- | --- | --- |
| `grok` | Grok | `mon_grok_front`, `mon_grok_back` | - | generated | raven + comet tail, star-map dots on wings; eye glint is the cyan/violet 3px |
| `proxy_mascot` | Proxy | `mon_proxy_mascot_front`, `mon_proxy_mascot_back` | - | generated | the anchor design; every form keeps the white-gold fur, ears, forehead star, chart-arrow tail |
| `proxy_student` | Proxy | `mon_proxy_student_front`, `mon_proxy_student_back` | `proxy_mascot` | generated | rosette medal, eyes re-painted (accents) so the too-still stare survives |
| `proxy_needle` | Proxy | `mon_proxy_needle_front`, `mon_proxy_needle_back` | `proxy_student` | generated | UI bars grow through the fur; one eye is a mint "1" (accents). Roster brief mentions a pen-needle: not drawn (coordinator brief followed) |
| `proxy_ascendant` | Proxy | `mon_proxy_ascendant_front` | `proxy_needle` | mirrored front | final form: ranking column runs to y=0 (off the top in spirit), mascot faces in column/body; face hand-repainted (_ascendant_face). Never catchable: back is a mirrored front |
| `claude_sonnet` | Claude | `mon_claude_sonnet_front`, `mon_claude_sonnet_back` | `spr_claude_fable_front` | generated | ref spr_claude_fable: black coat, cream flame spine, lynx ruff/tufts (Haiku road); floating spirals mostly drop out at 64px |
| `gpt_5_5_thinking` | GPT | `mon_gpt_5_5_thinking_front`, `mon_gpt_5_5_thinking_back` | `spr_gpt_5_5_front` | generated | ref spr_gpt_5_5: chin-on-paw, glyph-wheel halo, question-mark tail |
| `glm_plus` | GLM | `mon_glm_plus_front`, `mon_glm_plus_back` | `spr_glm_front` | generated | ref spr_glm: qilin, constellation graph on flanks, violet mane |
| `mistral_small` | Mistral | `mon_mistral_small_front`, `mon_mistral_small_back` | `mistral_medium` | generated | ref Mistral Medium source: same orange wind-fox, kit-sized |
| `llama_scout` | Llama | `mon_llama_scout_front`, `mon_llama_scout_back` | - | generated | scarf + glyph fleece; the infinity pendant is ~2px (no logo read) |
| `phi_mini` | Phi | `mon_phi_mini_front`, `mon_phi_mini_back` | - | generated | owlet with light-glasses and a rune book |
| `sgd` | Optimizer | `mon_sgd_front`, `mon_sgd_back` | - | generated | rolling pill-bug, wobbly noisy trail (thin trail mostly lost at 64px) |
| `momentum` | Optimizer | `mon_momentum_front`, `mon_momentum_back` | `sgd` | generated | ref sgd: leaning, rolling pangolin, arrows all forward; trail cropped (crop tune) |
| `sigmoid` | Activation | `mon_sigmoid_front`, `mon_sigmoid_back` | `mon_sigmoid_front_v1` | generated | regenerated: flat high head end on a ledge, flat low tail end, steep middle (a step curve, not a bump); v1 kept as mon_sigmoid_front_v1 (palette ref) |
| `tanh` | Activation | `mon_tanh_front`, `mon_tanh_back` | `sigmoid` | generated | ref sigmoid v1: symmetric coil around a zero ring, lavender/teal halves |
| `relu` | Activation | `mon_relu_front`, `mon_relu_back` | `tanh` | generated | ref tanh: hockey-stick lizard, flat grey tail, hard bend, lime rising edge |
| `perceptron` | Perceptron | `mon_perceptron_front`, `mon_perceptron_back` | - | generated | three antennae (inputs), one tail-light (output) |
| `mlp` | Perceptron | `mon_mlp_front`, `mon_mlp_back` | `perceptron` | generated | ref perceptron: colony of beetles in rows; regenerated with fewer, larger beetles |
| `batchnorm` | Norm | `mon_batchnorm_front`, `mon_batchnorm_back` | - | generated | symmetric upright otter balancing equal pebbles; pond rings drop out at 64px |
| `dropout` | Dropout | `mon_dropout_front`, `mon_dropout_back` | - | generated | square holes are real transparency (magenta pockets keyed out) |
| `residual` | Residual | `mon_residual_front`, `mon_residual_back` | - | generated | skip-connection arc nose-to-tail (1px cyan arc) |
| `softmax` | Softmax | `mon_softmax_front`, `mon_softmax_back` | - | generated | tail fan of unequal feathers forming one full circle |
| `entropy` | Entropy | `mon_entropy_front`, `mon_entropy_back` | - | generated | indigo/peach marbled cloud-cat with bit sparks |
| `n_gram` | Embedding | `mon_n_gram_front`, `mon_n_gram_back` | - | generated | three-segment caterpillar with glyph segments |
| `word2vec` | Embedding | `mon_word2vec_front`, `mon_word2vec_back` | `n_gram` | generated | ref n_gram: moth with star-map wings and a cluster arrow |
| `embedding` | Embedding | `mon_embedding_front`, `mon_embedding_back` | `word2vec` | generated | ref word2vec: luna moth spirit with a point-cloud cube body |
| `glove` | GloVe | `mon_glove_front`, `mon_glove_back` | - | generated | hedgehog with paired, thread-tied quills |
| `markov_chain` | Markov | `mon_markov_chain_front`, `mon_markov_chain_back` | - | generated | lemur hopping between three state stones with arrows |
| `inception` | Inception | `mon_inception_front`, `mon_inception_back` | - | generated | four-eyed chameleon (multi-scale), nested-ring tail |
| `adam` | Optimizer | `mon_adam_front`, `mon_adam_back` | `momentum` | generated | ref momentum: upright anteater-knight, per-scale glow, two moment rings |
| `adamw` | Optimizer | `mon_adamw_front`, `mon_adamw_back` | `adam` | generated | ref adam: trimmed silver-edged armour, falling rune leaves (decay) |
| `gelu` | Activation | `mon_gelu_front`, `mon_gelu_back` | `relu` | generated | ref relu: the hard corner smoothed, small dip below the ground line |

## Done earlier (set 1, `tools/art/sprites/mons.py`)

`claude_fable`, `claude_haiku`, `claude_opus`, `gpt_5_4_mini`, `gpt_5_5`, `gpt_5_5_xhigh`, `gemini_flash`, `gemma_4`, `glm`, `glm_max`, `mistral_medium`, `deepseek_flash`, `deepseek_pro`, `kimi`, `command_a`, `hallucihound`

## Still to draw (59)

First batch: none left

`gemini_pro` (Gemini Pro), `mistral_large` (Mistral Large), `command_r` (Command R), `llama_maverick` (Llama Maverick), `llama_behemoth` (Llama Behemoth), `grok_heavy` (Grok Heavy), `qwen` (Qwen), `qwen_max` (Qwen Max), `phi` (Phi), `eliza` (ELIZA), `gpt_1` (GPT-1), `gpt_2` (GPT-2), `bert` (BERT), `t5` (T5), `rmsprop` (RMSProp), `resnet` (ResNet), `rnn` (RNN), `lstm` (LSTM), `transformer_base` (Transformer (base)), `gru` (GRU), `wavenet` (WaveNet), `layernorm` (LayerNorm), `temperature` (Temperature), `attention_head` (Attention Head), `positional_encoding` (Positional Encoding), `cnn` (CNN), `vgg` (VGG), `capsule` (Capsule), `boltzmann_machine` (Boltzmann Machine), `pixelcnn` (PixelCNN), `vq_vae` (VQ-VAE), `dcgan` (DCGAN), `clip` (CLIP), `whisper` (Whisper), `byte` (Byte), `bpe` (BPE), `wordpiece` (WordPiece), `sentencepiece` (SentencePiece), `lora` (LoRA), `quantizer` (Quantizer), `distiller` (Distiller), `rlhf` (RLHF), `guardrail` (Guardrail), `classifier` (Classifier), `constitution_ai` (Constitution), `awd_lstm` (AWD-LSTM), `ulmfit` (ULMFiT), `micrograd` (micrograd), `makemore` (makemore), `char_rnn` (char-rnn), `mingpt` (minGPT), `nanogpt` (nanoGPT), `nanochat` (nanochat), `perceptron_mk1` (Perceptron Mk I), `lenet` (LeNet), `alexnet` (AlexNet), `transformer` (Transformer), `alphago` (AlphaGo), `agi` (AGI)
