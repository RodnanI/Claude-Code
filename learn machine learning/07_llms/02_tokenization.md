# Tokenization

Neural networks take numbers, not text. A tokenizer converts text into a sequence of integers (token ids) and back. It looks like plumbing, but it explains many LLM quirks, determines what you pay for API calls, and differs for every model. `03_bpe_tokenizer_lab.py` builds one.

## Three ways to cut text

| Unit | Vocabulary | Sequence length | Problems |
|------|-----------|-----------------|----------|
| characters | tiny (~100-300) | very long | the model must learn spelling from scratch; long sequences make attention expensive |
| words | huge (millions) | short | unknown words ("unbelievableness", typos, names, new slang) have no id; "run", "runs", "running" share nothing |
| subwords | 30K-260K | medium | the compromise every modern LLM uses |

Subword tokenization keeps common words whole (" the", " learning") and splits rare words into reusable pieces (" token" + "ization"). Nothing is ever unknown, because in the worst case text falls back to individual bytes.

## Byte Pair Encoding (BPE)

This is the most common subword algorithm; GPT models and Llama 3 use byte-level BPE, for example. Training is simple:

1. Start with the 256 possible bytes as the vocabulary. Any text in any language (and emoji, and code) is a sequence of UTF-8 bytes.
2. Count every pair of adjacent tokens in the training text.
3. Merge the most frequent pair into a new token. Record the merge.
4. Repeat until the vocabulary reaches the target size.

Encoding new text replays the learned merges in the order they were learned. Decoding looks up each id's bytes and joins them.

Real tokenizers add two things. Pre-tokenization first splits text with a regular expression into chunks (words with their leading space, numbers, runs of punctuation) so merges never cross those boundaries, which is why " the" with its leading space is a typical token. Special tokens are ids reserved for markers that never appear in normal text, such as end of text, the start and end of each chat message, tool calls and padding, and the chat format you send through an API is turned into these.

WordPiece (BERT) and Unigram (in the SentencePiece library, used by T5 and many multilingual models) pursue the same goal with different merge rules.

## Vocabulary size

A bigger vocabulary means fewer tokens per text, so more text fits in the context window and generation needs fewer steps. The cost is that the embedding table and output layer grow (vocab_size x hidden_size each) and rare tokens get little training. A smaller vocabulary gives smaller matrices but more tokens per text. Modern LLMs have moved from 32K-50K toward 100K-260K tokens, largely to handle many languages and code efficiently.

## Rules of thumb

English averages about 4 characters, or 0.75 words, per token, so 1,000 tokens is roughly 750 words. Other languages often need 2-3 times more tokens for the same meaning, especially scripts that were underrepresented in the tokenizer's training data, which means higher cost and less fitting in context; the lab shows this. Code tokenization depends heavily on whitespace handling, and indentation can cost many tokens in older tokenizers.

## Quirks caused by tokenization

Leading spaces matter, because "learning", " learning" and " Learning" are different tokens with different ids. Letter counting fails: "How many r's in strawberry?" was a famous failure, since the model sees perhaps 2-3 tokens and not 10 letters, and has to have memorized the spelling of each token. Numbers split into arbitrary chunks ("12345" might be "123" + "45"), which makes digit-level arithmetic awkward and is one reason tools and code execution help. Trailing whitespace in a prompt can push the model onto an unusual token boundary and degrade output. Glitch tokens are tokens that appeared in the tokenizer's training data but almost never in the model's, so their embeddings are nearly untrained, and early GPT models produced bizarre output for a few such strings.

## Tokens and cost

APIs charge per token, with separate prices for input and output tokens, and output usually costs several times more per token. Context windows, rate limits and maximum output lengths are also measured in tokens. When precision matters, count tokens with the provider's own tokenizer or token-counting endpoint, not another model's tokenizer.

A rough example: a support bot that sends a 3,000-token prompt (instructions plus retrieved documents) and gets 300 tokens back, 100,000 times a day, uses 300 million input tokens and 30 million output tokens daily. Multiply by your provider's per-million prices. Calculations like this decide architecture choices such as caching, smaller models and shorter prompts.

## In practice

| Library | Used by |
|---------|---------|
| `tiktoken` | OpenAI models |
| Hugging Face `tokenizers` / `AutoTokenizer` | nearly every open model |
| `sentencepiece` | T5, many multilingual models, older Llama |
| provider token counting endpoints | Claude and other API models |

The tokenizer is part of the model, and using the wrong one gives garbage output without any error.

## Questions

1. Why does byte-level BPE never produce an "unknown token"?
2. What does a larger vocabulary buy you, and what does it cost?
3. Your app serves users in English and Thai. Why might Thai users cost you more per conversation?
4. Why do LLMs struggle to reverse the letters of a long word?
