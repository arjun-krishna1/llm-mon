// Level-up learnsets for every species in roster.ts. Level-1 entries are the
// moves a freshly created mon knows (the last four up to its level).
// The early entries of the slice species are balance-locked (route + rival tests).

type L = [number, string][]

export const LEARNSETS: Record<string, L> = {
  // ── Anthropic ──
  claude_fable: [[1, 'warm_nudge'], [1, 'guardrail'], [7, 'artifact'], [11, 'constitution'], [15, 'summarize'], [19, 'extended_thinking'], [25, 'quick_reply']],
  claude_haiku: [[1, 'warm_nudge'], [1, 'quick_reply'], [4, 'artifact'], [9, 'constitution'], [14, 'extended_thinking'], [20, 'summarize']],
  claude_sonnet: [[1, 'warm_nudge'], [1, 'guardrail'], [1, 'artifact'], [16, 'self_critique'], [19, 'extended_thinking'], [24, 'knowledge_transfer'], [29, 'summarize'], [33, 'polite_refusal']],
  claude_opus: [[1, 'warm_nudge'], [1, 'guardrail'], [1, 'artifact'], [1, 'constitution'], [34, 'extended_thinking'], [38, 'self_critique'], [40, 'summarize'], [46, 'reward_model']],
  // ── OpenAI ──
  gpt_5_4_mini: [[1, 'autocomplete'], [1, 'small_talk'], [4, 'function_call'], [7, 'quick_reply'], [11, 'custom_instruction'], [16, 'reasoning_effort']],
  gpt_5_5: [[1, 'autocomplete'], [1, 'focus_token'], [7, 'function_call'], [11, 'jailbreak'], [15, 'custom_instruction'], [19, 'reasoning_effort'], [25, 'quick_reply']],
  gpt_5_5_thinking: [[1, 'autocomplete'], [1, 'focus_token'], [1, 'function_call'], [16, 'jailbreak'], [19, 'reasoning_effort'], [22, 'next_token'], [24, 'backprop'], [28, 'custom_instruction'], [33, 'big_batch']],
  gpt_5_5_xhigh: [[1, 'function_call'], [1, 'focus_token'], [1, 'custom_instruction'], [32, 'reasoning_effort'], [38, 'brute_force'], [40, 'quick_reply'], [46, 'loss_spike']],
  // ── Google ──
  gemini_flash: [[1, 'prompt_pulse'], [1, 'small_talk'], [4, 'multimodal_beam'], [7, 'quick_reply'], [11, 'grounding'], [15, 'long_context'], [22, 'next_token']],
  gemini_pro: [[1, 'multimodal_beam'], [1, 'grounding'], [1, 'long_context'], [30, 'next_token'], [35, 'attend'], [40, 'tpu_slam'], [45, 'analogy']],
  gemma_4: [[1, 'autocomplete'], [1, 'small_talk'], [4, 'multimodal_beam'], [8, 'long_context'], [12, 'grounding'], [17, 'tpu_slam'], [22, 'augment']],
  // ── Zhipu ──
  glm: [[1, 'graph_paw'], [1, 'pattern_guard'], [7, 'graph_reason'], [11, 'thinking_mode'], [15, 'summarize'], [19, 'blank_infill'], [25, 'quick_reply']],
  glm_plus: [[1, 'graph_paw'], [1, 'pattern_guard'], [1, 'graph_reason'], [16, 'thinking_mode'], [19, 'blank_infill'], [24, 'embed'], [29, 'summarize'], [33, 'analogy']],
  glm_max: [[1, 'graph_paw'], [1, 'graph_reason'], [1, 'thinking_mode'], [30, 'blank_infill'], [36, 'summarize'], [42, 'multi_head']],
  // ── Mistral ──
  mistral_small: [[1, 'autocomplete'], [1, 'small_talk'], [5, 'tailwind'], [9, 'jailbreak'], [13, 'le_chat'], [17, 'cool_breeze']],
  mistral_medium: [[1, 'autocomplete'], [1, 'jailbreak'], [4, 'tailwind'], [8, 'le_chat'], [12, 'cool_breeze'], [18, 'graph_paw'], [24, 'look_ahead'], [30, 'big_batch']],
  mistral_large: [[1, 'tailwind'], [1, 'le_chat'], [1, 'cool_breeze'], [38, 'brute_force'], [44, 'quick_reply'], [50, 'loss_spike']],
  // ── DeepSeek ──
  deepseek_flash: [[1, 'autocomplete'], [1, 'quick_reply'], [1, 'expert_mix'], [16, 'distill'], [22, 'deep_think'], [28, 'knowledge_transfer']],
  deepseek_pro: [[1, 'expert_mix'], [1, 'graph_paw'], [1, 'pattern_guard'], [28, 'distill'], [33, 'deep_think'], [38, 'knowledge_transfer'], [42, 'summarize']],
  // ── Moonshot / Cohere ──
  kimi: [[1, 'agent_swarm'], [1, 'orbit'], [1, 'small_talk'], [29, 'summarize'], [34, 'moonshot'], [40, 'long_memory']],
  command_r: [[1, 'autocomplete'], [1, 'small_talk'], [6, 'retrieval'], [12, 'command'], [18, 'embed'], [24, 'rerank']],
  command_a: [[1, 'autocomplete'], [1, 'focus_token'], [1, 'retrieval'], [1, 'command'], [26, 'rerank'], [32, 'summarize'], [38, 'knowledge_transfer']],
  // ── Meta ──
  llama_scout: [[1, 'autocomplete'], [1, 'pattern_guard'], [5, 'herd_charge'], [10, 'fleece_wall'], [15, 'augment'], [21, 'long_trail'], [27, 'big_batch']],
  llama_maverick: [[1, 'herd_charge'], [1, 'fleece_wall'], [1, 'augment'], [30, 'long_trail'], [36, 'brute_force'], [42, 'behemoth_stomp']],
  llama_behemoth: [[1, 'herd_charge'], [1, 'fleece_wall'], [1, 'long_trail'], [50, 'behemoth_stomp'], [56, 'summarize']],
  // ── xAI ──
  grok: [[1, 'autocomplete'], [1, 'small_talk'], [5, 'hot_take'], [10, 'fun_mode'], [16, 'quick_reply'], [22, 'big_brain'], [28, 'clickbait']],
  grok_heavy: [[1, 'hot_take'], [1, 'fun_mode'], [1, 'big_brain'], [36, 'heavy_thinking'], [42, 'brute_force'], [48, 'loss_spike']],
  // ── Alibaba ──
  qwen: [[1, 'prompt_pulse'], [1, 'small_talk'], [5, 'polyglot_beam'], [11, 'param_sweep'], [17, 'coder_strike'], [24, 'embed'], [30, 'thousand_tongues']],
  qwen_max: [[1, 'polyglot_beam'], [1, 'coder_strike'], [1, 'param_sweep'], [34, 'thousand_tongues'], [40, 'analogy'], [46, 'knowledge_transfer']],
  // ── Microsoft ──
  phi_mini: [[1, 'prompt_pulse'], [1, 'pattern_guard'], [5, 'textbook_answer'], [10, 'study_session'], [16, 'fact_check'], [22, 'small_wonder']],
  phi: [[1, 'textbook_answer'], [1, 'study_session'], [1, 'small_wonder'], [28, 'analogy'], [34, 'fact_check'], [40, 'reward_model']],
  // ── Historic ──
  eliza: [[1, 'reflect'], [1, 'small_talk'], [10, 'warm_nudge'], [18, 'long_preamble'], [26, 'fact_check'], [34, 'next_token']],
  gpt_1: [[1, 'autocomplete'], [1, 'next_token'], [20, 'focus_token'], [30, 'backprop'], [36, 'big_batch']],
  gpt_2: [[1, 'next_token'], [1, 'big_batch'], [1, 'generate'], [40, 'sample'], [46, 'loss_spike']],
  bert: [[1, 'embed'], [1, 'attend'], [1, 'mask_fill'], [44, 'long_memory'], [50, 'analogy']],
  t5: [[1, 'next_token'], [1, 'attend'], [1, 'seq2seq'], [44, 'subword_split'], [50, 'knowledge_transfer']],
  // ── Optimizers ──
  sgd: [[1, 'descent'], [1, 'pattern_guard'], [6, 'focus_token'], [10, 'look_ahead'], [16, 'backprop']],
  momentum: [[1, 'descent'], [1, 'look_ahead'], [1, 'focus_token'], [14, 'backprop'], [20, 'adaptive_step'], [26, 'big_batch']],
  adam: [[1, 'look_ahead'], [1, 'adaptive_step'], [1, 'backprop'], [30, 'big_batch'], [36, 'warmup'], [42, 'brute_force']],
  adamw: [[1, 'look_ahead'], [1, 'adaptive_step'], [1, 'big_batch'], [1, 'weight_decay'], [40, 'regularize'], [46, 'brute_force']],
  rmsprop: [[1, 'descent'], [1, 'look_ahead'], [1, 'adaptive_step'], [36, 'backprop'], [42, 'warmup']],
  // ── Activations ──
  sigmoid: [[1, 'squash'], [1, 'pattern_guard'], [7, 'small_talk'], [12, 'fire_neuron'], [16, 'hidden_layer']],
  tanh: [[1, 'squash'], [1, 'hidden_layer'], [1, 'fire_neuron'], [18, 'next_token'], [23, 'normalize_odds']],
  relu: [[1, 'fire_neuron'], [1, 'squash'], [1, 'rectify'], [28, 'quick_reply'], [33, 'backprop'], [38, 'brute_force']],
  gelu: [[1, 'rectify'], [1, 'smooth_curve'], [1, 'quick_reply'], [42, 'attend'], [48, 'brute_force']],
  // ── Perceptron line ──
  perceptron: [[1, 'fire_neuron'], [1, 'guardrail'], [8, 'small_talk'], [13, 'descent']],
  mlp: [[1, 'fire_neuron'], [1, 'hidden_layer'], [1, 'descent'], [16, 'backprop'], [21, 'embed'], [26, 'big_batch']],
  resnet: [[1, 'backprop'], [1, 'hidden_layer'], [1, 'residual_strike'], [30, 'big_batch'], [38, 'brute_force']],
  // ── Sequence ──
  rnn: [[1, 'recur'], [1, 'small_talk'], [10, 'next_token'], [18, 'long_memory']],
  lstm: [[1, 'recur'], [1, 'long_memory'], [1, 'forget_gate'], [26, 'next_token'], [32, 'knowledge_transfer']],
  transformer_base: [[1, 'attend'], [1, 'next_token'], [1, 'long_memory'], [40, 'multi_head'], [46, 'self_critique']],
  gru: [[1, 'recur'], [1, 'forget_gate'], [1, 'next_token'], [34, 'long_memory']],
  wavenet: [[1, 'dilate'], [1, 'recur'], [1, 'long_memory'], [40, 'generate'], [46, 'loss_spike']],
  // ── Normalizers / regularizers ──
  batchnorm: [[1, 'normalize'], [1, 'hidden_layer'], [1, 'descent'], [26, 'backprop'], [30, 'squash']],
  layernorm: [[1, 'normalize'], [1, 'hidden_layer'], [1, 'squash'], [34, 'attend'], [40, 'fact_check']],
  dropout: [[1, 'drop_units'], [1, 'quick_reply'], [1, 'fire_neuron'], [26, 'backprop'], [32, 'add_noise']],
  residual: [[1, 'residual_strike'], [1, 'hidden_layer'], [1, 'descent'], [30, 'summarize']],
  // ── Sampling / language ──
  softmax: [[1, 'normalize_odds'], [1, 'small_talk'], [10, 'add_noise'], [16, 'sample']],
  temperature: [[1, 'sample'], [1, 'add_noise'], [1, 'normalize_odds'], [52, 'loss_spike'], [58, 'regularize']],
  entropy: [[1, 'sample'], [1, 'add_noise'], [12, 'normalize_odds'], [18, 'stale_cache']],
  n_gram: [[1, 'bigram_bite'], [1, 'small_talk'], [9, 'next_token'], [15, 'sample']],
  word2vec: [[1, 'bigram_bite'], [1, 'next_token'], [1, 'embed'], [20, 'analogy'], [27, 'sample']],
  embedding: [[1, 'embed'], [1, 'analogy'], [1, 'next_token'], [34, 'attend'], [40, 'long_memory']],
  glove: [[1, 'embed'], [1, 'next_token'], [1, 'small_talk'], [26, 'analogy']],
  markov_chain: [[1, 'sample'], [1, 'next_token'], [1, 'small_talk'], [20, 'add_noise'], [26, 'bigram_bite']],
  attention_head: [[1, 'attend'], [1, 'next_token'], [1, 'add_noise'], [46, 'multi_head']],
  positional_encoding: [[1, 'attend'], [1, 'recur'], [1, 'hidden_layer'], [46, 'dilate']],
  // ── Vision / generative ──
  cnn: [[1, 'convolve'], [1, 'pattern_guard'], [10, 'augment'], [20, 'max_pool']],
  vgg: [[1, 'convolve'], [1, 'max_pool'], [1, 'augment'], [30, 'brute_force'], [36, 'big_batch']],
  inception: [[1, 'convolve'], [1, 'max_pool'], [1, 'augment'], [30, 'generate'], [36, 'regularize']],
  capsule: [[1, 'convolve'], [1, 'hidden_layer'], [1, 'max_pool'], [36, 'regularize']],
  boltzmann_machine: [[1, 'sample'], [1, 'generate'], [1, 'hidden_layer'], [36, 'normalize']],
  pixelcnn: [[1, 'generate'], [1, 'convolve'], [1, 'dilate'], [42, 'sample']],
  vq_vae: [[1, 'generate'], [1, 'merge'], [1, 'hidden_layer'], [42, 'regularize']],
  dcgan: [[1, 'adversarial'], [1, 'generate'], [1, 'convolve'], [56, 'loss_spike']],
  clip: [[1, 'embed'], [1, 'attend'], [1, 'analogy'], [56, 'knowledge_transfer']],
  whisper: [[1, 'next_token'], [1, 'attend'], [1, 'subword_split'], [56, 'seq2seq']],
  // ── Tokenizers ──
  byte: [[1, 'byte_bite'], [1, 'small_talk'], [10, 'subword_split'], [20, 'merge']],
  bpe: [[1, 'byte_bite'], [1, 'merge'], [1, 'subword_split'], [30, 'big_batch'], [38, 'brute_force']],
  wordpiece: [[1, 'subword_split'], [1, 'merge'], [1, 'embed'], [50, 'mask_fill']],
  sentencepiece: [[1, 'subword_split'], [1, 'merge'], [1, 'next_token'], [50, 'seq2seq']],
  // ── Efficiency ──
  lora: [[1, 'low_rank'], [1, 'quantize'], [1, 'knowledge_transfer'], [50, 'prune']],
  quantizer: [[1, 'quantize'], [1, 'prune'], [1, 'byte_bite'], [50, 'regularize']],
  distiller: [[1, 'knowledge_transfer'], [1, 'distill'], [1, 'prune'], [50, 'summarize']],
  // ── Alignment ──
  rlhf: [[1, 'reward_model'], [1, 'polite_refusal'], [1, 'preference_shift'], [56, 'self_critique']],
  guardrail: [[1, 'guardrail'], [1, 'polite_refusal'], [1, 'content_filter'], [56, 'regularize']],
  classifier: [[1, 'reward_model'], [1, 'content_filter'], [1, 'pattern_guard'], [56, 'red_team']],
  constitution_ai: [[1, 'constitution'], [1, 'self_critique'], [1, 'preference_shift'], [1, 'reward_model'], [60, 'extended_thinking']],
  // ── fast.ai ──
  awd_lstm: [[1, 'recur'], [1, 'drop_units'], [1, 'long_memory'], [50, 'next_token']],
  ulmfit: [[1, 'next_token'], [1, 'long_memory'], [1, 'knowledge_transfer'], [52, 'seq2seq']],
  // ── Karpathy's repos ──
  micrograd: [[1, 'backprop'], [1, 'descent'], [1, 'fire_neuron'], [55, 'zero_to_hero']],
  makemore: [[1, 'bigram_bite'], [1, 'sample'], [1, 'embed'], [55, 'zero_to_hero']],
  char_rnn: [[1, 'recur'], [1, 'next_token'], [1, 'long_memory'], [55, 'zero_to_hero']],
  mingpt: [[1, 'attend'], [1, 'next_token'], [1, 'backprop'], [50, 'multi_head']],
  nanogpt: [[1, 'attend'], [1, 'multi_head'], [1, 'backprop'], [55, 'zero_to_hero']],
  nanochat: [[1, 'multi_head'], [1, 'self_critique'], [1, 'knowledge_transfer'], [1, 'zero_to_hero']],
  // ── Legendaries ──
  perceptron_mk1: [[1, 'fire_neuron'], [1, 'hidden_layer'], [1, 'backprop'], [1, 'ancestral_light']],
  lenet: [[1, 'convolve'], [1, 'max_pool'], [1, 'backprop'], [1, 'ancestral_light']],
  alexnet: [[1, 'convolve'], [1, 'max_pool'], [1, 'brute_force'], [1, 'imagenet_roar']],
  transformer: [[1, 'attend'], [1, 'multi_head'], [1, 'self_critique'], [1, 'self_attention']],
  alphago: [[1, 'look_ahead'], [1, 'sample'], [1, 'reward_model'], [1, 'move_37']],
  agi: [[1, 'two_years_away'], [1, 'summarize'], [1, 'self_critique'], [1, 'zero_to_hero']],
  // ── Antagonists ──
  hallucihound: [[1, 'glitch_bite'], [1, 'static_howl'], [5, 'confabulate'], [9, 'fake_citation'], [13, 'prompt_injection'], [18, 'token_flood'], [24, 'overfit_slam']],
  proxy_mascot: [[1, 'warm_nudge'], [1, 'score_hack'], [1, 'small_talk']],
  proxy_student: [[1, 'warm_nudge'], [1, 'small_talk'], [1, 'overfit_slam'], [1, 'leaderboard']],
  proxy_needle: [[1, 'score_hack'], [1, 'goodhart'], [1, 'confabulate'], [1, 'leaderboard']],
  proxy_ascendant: [[1, 'leaderboard'], [1, 'goodhart'], [1, 'score_hack'], [1, 'token_flood']],
}
