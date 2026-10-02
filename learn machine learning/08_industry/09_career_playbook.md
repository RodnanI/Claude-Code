# Career Playbook: Your First Year in Machine Learning

Technical skill gets you hired. Habits decide how fast you grow after that. This file is the advice most people only get after a few painful years.

## Your first 90 days

### Weeks 1-2: orient

- Get your environment working: access, repositories, data warehouse, compute, experiment tracking. Write down every setup step that was not documented and add it to the docs. That is your first contribution.
- Learn the business: what does the company sell, who are the customers, which metrics leadership watches, and which of them your team moves.
- Read before you write: the team's design docs, the main pipelines, the models in production, recent postmortems.
- Meet people: your manager, teammates, the data engineers you depend on, the product manager, the people who use your team's outputs. Ask each: "What do you wish the ML team did differently?"

### Weeks 3-6: a small, real win

- Take a small, well-defined task: fix a bug, add a test, add monitoring, speed up a pipeline, improve a dashboard.
- Ship it through the normal process (code review, deployment). You learn the whole path to production on something low-risk.
- Shadow on-call or incident handling if your team does it.

### Weeks 7-12: own something

- Own a scoped project end to end: framing, data, baseline, evaluation, a written result.
- Write a short design doc before building, even if nobody asks. Ask for feedback on it.
- Present the result: what you did, what you found, what you recommend, what you are unsure about.

## Habits that compound

- **Keep a work log**: what you did, decisions and why, commands you ran, results. It makes status updates, performance reviews and debugging much easier.
- **Ask good questions**: "I am trying to do X. I tried A and B. I expected C but got D. I think the cause might be E. Can you help me check?" Respectful of time, and it often answers itself while you write it.
- **The 30-minute rule**: stuck for 30 minutes with no progress? Ask. Stuck for 3 days silently is the most common junior failure.
- **Communicate status before anyone asks**, especially bad news.
- **Review other people's code**: you learn the codebase and how seniors think.
- **Write the TL;DR first** in every message, document and email: the conclusion, then the details.
- **Make your results reproducible**: commit, config, data version, command. Future you is a different person with no memory of today.

## Common junior mistakes

| Mistake | Instead |
|---------|---------|
| starting with a complex model | baseline first, complexity only when measured to help |
| trusting a great result | assume leakage or a bug until proven otherwise |
| not looking at the data | look at raw rows, distributions and errors, every time |
| reporting one number | uncertainty, slices, baselines |
| polishing in private for weeks | share early drafts, get feedback, iterate |
| optimizing the metric, not the goal | ask what decision the model changes |
| notebooks as production code | move reusable code into modules with tests |
| learning only new models | go deep on evaluation, data and engineering; they age slowly |

## Communicating results

- Titles of charts state the conclusion ("Fraud recall doubles with device features"), not the topic ("Recall by model").
- Lead with the impact in business units.
- Include what did not work. It saves others from repeating it and builds trust.
- Show a few concrete examples of model behavior, good and bad.
- End with a recommendation and next steps.

## What to learn next (after this course)

Prioritize by your role, but these pay off almost everywhere:

1. **SQL**, properly: joins, window functions, query performance. You will use it daily.
2. **Software engineering**: testing, packaging, code review, Docker, a cloud platform.
3. **Statistics for experiments**: A/B testing, power, causal inference basics.
4. **One deep specialty**: ranking/recommendations, forecasting, NLP and LLM systems, computer vision, or ML infrastructure.
5. **Reading code of serious projects**: scikit-learn, PyTorch modules, Hugging Face transformers, nanoGPT.

### Resources worth your time

Books:

- *An Introduction to Statistical Learning* (James, Witten, Hastie, Tibshirani). Free PDF. Classical ML with statistical depth.
- *Hands-On Machine Learning* (Aurelien Geron). Practical, broad.
- *Designing Machine Learning Systems* and *AI Engineering* (Chip Huyen). Production ML and building LLM applications.
- *Build a Large Language Model (From Scratch)* (Sebastian Raschka). The next step after this course's mini GPT.
- *Dive into Deep Learning* (d2l.ai). Free, with runnable code.
- *Deep Learning* (Goodfellow, Bengio, Courville). Free online. Theory reference, heavy.

Courses and videos:

- Andrej Karpathy, "Neural Networks: Zero to Hero" (YouTube): micrograd, makemore, GPT, tokenizers. The perfect continuation of modules 6 and 7.
- 3Blue1Brown: "Essence of Linear Algebra" and the neural network series. Intuition for the math.
- StatQuest (Josh Starmer): clear explanations of statistics and classical ML.
- fast.ai, "Practical Deep Learning for Coders": top-down, practical.
- Stanford CS229 (machine learning), CS231n (vision), CS224n (NLP), with lectures online.
- The Hugging Face courses (LLMs, transformers, fine-tuning).

Papers to read (in roughly this order):

1. "Hidden Technical Debt in Machine Learning Systems" (Sculley et al., 2015)
2. "Deep Residual Learning for Image Recognition" (He et al., 2015)
3. "Attention Is All You Need" (Vaswani et al., 2017)
4. "BERT" (Devlin et al., 2018)
5. "Language Models are Few-Shot Learners" (GPT-3, Brown et al., 2020)
6. "Scaling Laws for Neural Language Models" (Kaplan et al., 2020)
7. "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020)
8. "LoRA: Low-Rank Adaptation of Large Language Models" (Hu et al., 2021)
9. "Training Compute-Optimal Large Language Models" (Chinchilla, Hoffmann et al., 2022)
10. "Training language models to follow instructions with human feedback" (InstructGPT, Ouyang et al., 2022)
11. "Constitutional AI" (Bai et al., 2022)
12. "Direct Preference Optimization" (Rafailov et al., 2023)

## How to read a paper (three passes)

1. **Five minutes**: title, abstract, figures, conclusion. What problem, what claim, what evidence?
2. **One hour**: the method and experiments, skipping proofs. What are the baselines? Are the comparisons fair? What is missing?
3. **Deep dive** (only for papers that matter to your work): reproduce a result, read the code, work through the math.

Be skeptical of: missing baselines, cherry-picked examples, no error bars, evaluation on contaminated benchmarks, and claims that do not match the experiments.

## Staying current without drowning

The field produces more than anyone can read. Pick a small number of sources (a couple of lab and practitioner blogs, the Hugging Face papers page or a curated weekly summary, the major conferences: NeurIPS, ICML, ICLR, ACL, CVPR) and ignore the rest. When something new appears, ask: does it change anything I build this quarter? Usually the answer is no, and that is fine. Fundamentals change slowly; tools change monthly.

## A portfolio that gets interviews

- Two or three **deep** projects beat twenty tutorial copies.
- Each project: a real question, messy data, a baseline, honest evaluation, a short write-up with results and limitations, clean runnable code.
- Deploy at least one: a small API or app that someone can actually use.
- One LLM project with an evaluation set will stand out more than one with a slick demo and no numbers.
- See `09_exercises/projects.md` for ideas.

## About the hype and the anxiety

Every few months someone announces that AI will replace the people building it. Tools do change what the job looks like: a lot of boilerplate code is now written with AI assistance, and you should get fluent with these tools. What stays valuable: understanding problems, knowing whether results are real, evaluating systems properly, designing reliable systems and explaining them to humans. That is what this course trained. Keep building those.

## Integrity at work

You will be asked, directly or indirectly, to make numbers look better than they are, to ship before something is ready, or to use data in ways that feel wrong. Say what you see, in writing, with facts. Your reputation for honest numbers is the most valuable thing you build in this career, and it takes one fudged result to lose it.
