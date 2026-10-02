# Retrieval-Augmented Generation (RAG)

An LLM knows what was in its training data, up to its cutoff, and nothing about your company's documents, your customers or yesterday's news. **RAG** fixes this by retrieving relevant text at question time and putting it into the prompt. It is the most common LLM architecture in industry: support bots, internal knowledge assistants, documentation search, legal and medical lookup tools. `17_rag_from_scratch.py` builds one over this course.

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

**Offline (indexing), whenever documents change:**

1. **Load** documents: PDFs, web pages, wiki, tickets, databases.
2. **Clean** them: strip navigation and boilerplate, fix encoding, extract tables properly. Garbage here poisons everything later.
3. **Chunk** them into pieces of a few hundred tokens.
4. **Embed** each chunk (and/or build a keyword index).
5. **Store** chunks, vectors and **metadata** (source, title, date, section, access permissions).

**Online, per question:**

1. Optionally **rewrite the query** (fix typos, expand abbreviations, use conversation context: "and what about the premium plan?" needs the earlier turns to be searchable).
2. **Retrieve** the top-k candidate chunks.
3. Optionally **rerank** them with a more accurate (and slower) model.
4. **Build the prompt**: instructions + numbered sources + the question.
5. **Generate** an answer that cites the sources.
6. Optionally **verify**: check that citations exist and support the claims.

## Chunking

Chunk size is a trade-off:

- too small: a chunk lacks context ("it increased by 5%": what did?)
- too large: retrieval gets blurry and you waste prompt tokens on irrelevant text

Practical defaults: 200-800 tokens, split on natural boundaries (headings, paragraphs), a small overlap between consecutive chunks, and the document title plus section heading prepended to each chunk so it makes sense on its own. Keep tables intact. Test a couple of sizes on your evaluation set rather than arguing about it.

## Retrieval methods

| Method | Good at | Bad at |
|--------|---------|--------|
| **BM25** (keyword ranking, the classic search engine formula) | exact terms, product codes, error messages, names, rare words | synonyms and paraphrases ("cancel" vs "terminate my subscription") |
| **dense vectors** (embeddings, file 04) | meaning and paraphrase | exact identifiers, numbers, rare jargon the embedding model never saw |
| **hybrid** (both, merged) | the strengths of both | slightly more machinery |

Hybrid search with **reciprocal rank fusion** (each document scores `sum of 1 / (60 + its rank)` across the result lists) is a strong, simple default. Add **metadata filters** (date ranges, product, language) and, critically, **permission filters**: a RAG system that retrieves documents the user is not allowed to read is a data leak with a chat interface.

**Reranking**: retrieve 20-50 candidates cheaply, then rerank them with a cross-encoder model (reads query and chunk together) or an LLM, and keep the best 3-10. Often the single biggest quality improvement after hybrid search.

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

## Evaluating RAG (do not skip this)

Evaluate the two halves separately, because they fail differently:

1. **Retrieval**: build a set of real questions, each labeled with the chunk(s) or document(s) that contain the answer. Measure **recall@k** (did the right chunk make the top k?) and MRR. If retrieval misses, the best LLM in the world cannot answer.
2. **Generation**: given the retrieved chunks, is the answer **correct**, **faithful** (every claim supported by the sources, no additions), **complete**, and are the **citations** right? Score with human review on a sample and an LLM judge at scale (file 22).

Start the question set from real user queries (support tickets, search logs, questions from colleagues), not questions you invented while reading the docs, which are biased toward easy lexical matches.

## Common failure modes

- **The right chunk is not retrieved.** The most common problem by far. Fix retrieval before touching the prompt.
- **The answer is spread across chunks** and only half is retrieved.
- **Stale or duplicate documents** with conflicting answers; add dates and prefer the newest, deduplicate.
- **Lost in the middle**: models use information at the start and end of a long context more reliably than the middle. Fewer, better chunks beat many mediocre ones.
- **Bad parsing**: PDFs with columns, tables turned into soup, scanned documents without OCR.
- **Prompt injection inside documents**: a web page or uploaded file containing instructions. Treat retrieved text as data.
- **Permission leaks**: see above. Filter at retrieval time, not in the prompt.

## Beyond basic RAG

- **Query rewriting and multi-query**: generate several phrasings of the question and merge results.
- **HyDE**: have the model write a hypothetical answer and search with that (answers look more like documents than questions do).
- **Agentic RAG**: give the model a search tool and let it decide what and when to search, possibly several times (file 18).
- **Long context instead of retrieval**: for a small, stable corpus (say, a few hundred pages), putting all of it in the prompt with caching can beat RAG on quality and simplicity. For large or frequently changing corpora, or when you need permissions and citations, RAG still wins on cost and control.

## RAG vs fine-tuning vs long context

| Need | Best first choice |
|------|-------------------|
| answer from a large, changing document collection | RAG |
| answer from a small, fixed set of documents | long context + prompt caching |
| consistent output style, format or tone | prompting, then fine-tuning |
| teach a skill or narrow task at high volume, cheaply | fine-tuning a smaller model |
| fresh facts every day | RAG or tools, never fine-tuning |

## Check yourself

1. Users ask about error code "E-4471" and your dense-only search returns unrelated chunks. Why, and what fixes it?
2. How would you measure whether a change to chunk size helped?
3. Your bot cites [3] but source [3] does not support the claim. Which evaluation metric catches this?
4. Where must access control be enforced in a RAG system, and why not just in the prompt?
