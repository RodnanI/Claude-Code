# Tokenization

Neural networks eat numbers, not text. A **tokenizer** converts text into a sequence of integers (token ids) and back. It sounds like boring plumbing. It is responsible for a surprising number of LLM quirks, it determines what you pay for API calls, and every model has its own. Then build one in `03_bpe_tokenizer_lab.py`.

## Three ways to cut text

| Unit | Vocabulary | Sequence length | Problems |
|------|-----------|-----------------|----------|
| characters | tiny (~100-300) | very long | the model must learn spelling from scratch; long sequences make attention expensive |
| words | huge (millions) | short | unknown words ("unbelievableness", typos, names, new slang) have no id; "run", "runs", "running" share nothing |
| **subwords** | 30K-260K | medium | the compromise every modern LLM uses |

Subword tokenization keeps common words whole (" the", " learning") and splits rare words into reusable pieces (" token" + "ization"). Nothing is ever unknown, because in the worst case text falls back to individual bytes.

## Byte Pair Encoding (BPE)

The most common subword algorithm (GPT models and Llama 3 use byte-level BPE, for example). Training is beautifully simple:

1. Start with the 256 possible bytes as the vocabulary. Any text in any language (and emoji, and code) is a sequence of UTF-8 bytes.
2. Count every pair of adjacent tokens in the training text.
3. Merge the most frequent pair into a new token. Record the merge.
4. Repeat until the vocabulary reaches the target size.

Encoding new text replays the learned merges in the order they were learned. Decoding looks up each id's bytes and joins them.

Real tokenizers add two things:

- **Pre-tokenization**: a regular expression first splits text into chunks (words with their leading space, numbers, punctuation runs) so merges never cross those boundaries. That is why " the" with its leading space is a typical token.
- **Special tokens**: ids reserved for markers that never appear in normal text: end of text, start and end of each chat message, tool calls, padding. The chat format you send through an API is turned into these.

Other algorithms you will see named: **WordPiece** (BERT), **Unigram** (in the SentencePiece library, used by T5 and many multilingual models). Same goal, different merge rules.

## Vocabulary size is a trade-off

- **Bigger vocabulary**: fewer tokens per text, so more text fits in the context window and generation needs fewer steps. But the embedding table and output layer grow (vocab_size x hidden_size each), and rare tokens get little training.
- **Smaller vocabulary**: smaller matrices, more tokens per text.

Modern LLMs have moved from 32K-50K toward 100K-260K tokens, largely to handle many languages and code efficiently.

## Rules of thumb

- English: about **4 characters per token**, or about **0.75 words per token**. 1,000 tokens is roughly 750 English words.
- Other languages often need more tokens for the same meaning, sometimes 2-3 times more, especially for scripts underrepresented in the tokenizer's training data. Same content, higher cost and less fits in context. The lab shows this.
- Code tokenization depends heavily on whitespace handling; indentation can cost a lot of tokens in older tokenizers.

## Quirks caused by tokenization

- **Leading spaces matter**: "learning", " learning" and " Learning" are different tokens with different ids.
- **Letter counting**: "How many r's in strawberry?" was a famous failure. The model sees maybe 2-3 tokens, not 10 letters. It has to have memorized the spelling of each token.
- **Arithmetic**: numbers split into arbitrary chunks ("12345" might be "123" + "45"), so digit-level operations are awkward. This is one reason tools and code execution help.
- **Trailing whitespace** in a prompt can push the model into an unusual token boundary and degrade output.
- **Glitch tokens**: tokens that appeared in the tokenizer's training data but almost never in the model's training data have nearly untrained embeddings. Early GPT models produced bizarre output for a few such strings.

## Tokens are money and limits

- APIs charge **per token**, with separate prices for input and output tokens (output is usually several times more expensive per token).
- Context windows, rate limits and maximum output lengths are all measured in tokens.
- Count tokens with the provider's own tokenizer or token-counting endpoint. Never estimate one model's tokens with another model's tokenizer when it matters.

Back-of-envelope example: a support bot that sends a 3,000-token prompt (instructions + retrieved documents) and gets 300 tokens back, 100,000 times a day, uses 300 million input tokens and 30 million output tokens daily. Multiply by your provider's per-million prices. This calculation decides architectures (caching, smaller models, shorter prompts).

## In practice

| Library | Used by |
|---------|---------|
| `tiktoken` | OpenAI models |
| Hugging Face `tokenizers` / `AutoTokenizer` | nearly every open model |
| `sentencepiece` | T5, many multilingual models, older Llama |
| provider token counting endpoints | Claude and other API models |

The tokenizer is part of the model. Using the wrong tokenizer with a model produces garbage, silently.

## Check yourself

1. Why does byte-level BPE never produce an "unknown token"?
2. What does a larger vocabulary buy you, and what does it cost?
3. Your app serves users in English and Thai. Why might Thai users cost you more per conversation?
4. Why do LLMs struggle to reverse the letters of a long word?
