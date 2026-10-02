# Retrieval-Augmented Generation (RAG)

An LLM knows what was in its training data up to its cutoff, and nothing about your company's documents, your customers or yesterday's news. RAG fixes this by retrieving relevant text at question time and putting it into the prompt. It is the most common LLM architecture in industry, used for support bots, internal knowledge assistants, documentation search and legal and medical lookup tools. `17_rag_from_scratch.py` builds one over this course.

## Why RAG

| Benefit | Because |
|---------|---------|
| private knowledge | your documents go into the prompt, not into model weights |
| fresh information | update the index, not the model |
| citations | answers can point to sources a human can check |
| fewer hallucinations | the model answers from provided text instead of memory (fewer, not zero) |
| access control | retrieve only what the asking user is allowed to see |
| cheaper than fine-tuning for knowledge | no training runs; fine-tuning is poor at adding facts anyway |

## The pipeline

Indexing runs offline whenever documents change:

1. Load documents: PDFs, web pages, wiki, tickets, databases.
2. Clean them by stripping navigation and boilerplate, fixing encoding and extracting tables properly. Garbage here poisons everything later.
3. Chunk them into pieces of a few hundred tokens.
4. Embed each chunk, and optionally build a keyword index.
5. Store the chunks, vectors and metadata (source, title, date, section, access permissions).

Then, for each question:

1. Optionally rewrite the query to fix typos, expand abbreviations and use conversation context, since "and what about the premium plan?" needs the earlier turns to be searchable.
2. Retrieve the top-k candidate chunks.
3. Optionally rerank them with a more accurate but slower model.
4. Build the prompt from instructions, numbered sources and the question.
5. Generate an answer that cites the sources.
6. Optionally verify that the citations exist and support the claims.

## Chunking

Chunk size is a trade-off:

Chunks that are too small lack context ("it increased by 5%": what did?), and chunks that are too large blur retrieval and waste prompt tokens on irrelevant text.

Reasonable defaults are 200-800 tokens, split on natural boundaries (headings, paragraphs), a small overlap between consecutive chunks, and the document title plus section heading prepended to each chunk so it makes sense on its own. Keep tables intact. Test a couple of sizes on your evaluation set rather than arguing about it.

## Retrieval methods

| Method | Good at | Bad at |
|--------|---------|--------|
| BM25 (keyword ranking, the classic search engine formula) | exact terms, product codes, error messages, names, rare words | synonyms and paraphrases ("cancel" vs "terminate my subscription") |
| dense vectors (embeddings, file 04) | meaning and paraphrase | exact identifiers, numbers, rare jargon the embedding model never saw |
| hybrid (both, merged) | the strengths of both | slightly more machinery |

Hybrid search with reciprocal rank fusion, where each document scores `sum of 1 / (60 + its rank)` across the result lists, is a strong and simple default. Add metadata filters (date ranges, product, language) and, above all, permission filters, because a RAG system that retrieves documents the user may not read is a data leak with a chat interface.

Reranking retrieves 20-50 candidates cheaply, reranks them with a cross-encoder (which reads the query and chunk together) or an LLM, and keeps the best 3-10. After hybrid search, it is often the largest single quality gain.

## The generation prompt

```
Answer the question using only the numbered sources below.
Cite sources like [2] after each claim. If the sources do not contain the answer,
say "I could not find this in the documentation" and do not guess.

<sources>
[1] (billing/refunds.md, "Refund window") Refunds are possible within 30 days...
[2] (billing/plans.md, "Annual plans") Annual plans can be cancelled...
</sources>

<question>Can I get my money back on an annual plan after two months?</question>
```

## Evaluating RAG

Evaluate retrieval and generation separately, because they fail in different ways.

For retrieval, build a set of real questions, each labeled with the chunks or documents that contain the answer, and measure recall@k (did the right chunk make the top k?) and MRR. If retrieval misses, no LLM can answer.

For generation, take the retrieved chunks and check whether the answer is correct, faithful (every claim supported by the sources, nothing added), complete and properly cited. Score a sample with human review and the rest with an LLM judge (file 22).

Build the question set from real user queries such as support tickets, search logs and colleagues' questions. Questions you invent while reading the docs are biased toward easy keyword matches.

## Common failure modes

By far the most common failure is that the right chunk is not retrieved, so fix retrieval before touching the prompt. Other failures include:

- The answer spans several chunks and only half is retrieved.
- Stale or duplicate documents give conflicting answers. Add dates, prefer the newest and deduplicate.
- Models use information at the start and end of a long context more reliably than in the middle, so fewer, better chunks beat many mediocre ones.
- Bad parsing mangles PDFs with columns, turns tables into soup or skips scanned documents without OCR.
- A web page or uploaded file may contain instructions (prompt injection), so treat retrieved text as data.
- Permission leaks must be prevented by filtering at retrieval time and not in the prompt.

## Beyond basic RAG

Query rewriting and multi-query generate several phrasings of the question and merge the results. HyDE has the model write a hypothetical answer and searches with that, since answers look more like documents than questions do. Agentic RAG gives the model a search tool and lets it decide what and when to search, possibly several times (file 18). Long context can replace retrieval for a small, stable corpus of a few hundred pages: putting all of it in the prompt with caching can beat RAG on quality and simplicity. For large or frequently changing corpora, or when you need permissions and citations, RAG still wins on cost and control.

## RAG vs fine-tuning vs long context

| Need | Best first choice |
|------|-------------------|
| answer from a large, changing document collection | RAG |
| answer from a small, fixed set of documents | long context + prompt caching |
| consistent output style, format or tone | prompting, then fine-tuning |
| teach a skill or narrow task at high volume, cheaply | fine-tuning a smaller model |
| fresh facts every day | RAG or tools, never fine-tuning |

## Questions

1. Users ask about error code "E-4471" and your dense-only search returns unrelated chunks. Why, and what fixes it?
2. How would you measure whether a change to chunk size helped?
3. Your bot cites [3] but source [3] does not support the claim. Which evaluation metric catches this?
4. Where must access control be enforced in a RAG system, and why not just in the prompt?
