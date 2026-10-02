# Career Playbook

Technical skill gets you hired, and your habits decide how fast you grow afterwards. This file collects advice that most people only receive after a few hard years.

## Your first 90 days

### Weeks 1-2

Get your environment working, including access, repositories, the data warehouse, compute and experiment tracking. Write down every setup step that was not documented and add it to the docs, which makes a good first contribution. Learn the business: what the company sells, who the customers are, which metrics leadership watches and which of them your team moves. Read before you write, starting with the team's design docs, the main pipelines, the models in production and recent postmortems. Meet your manager, teammates, the data engineers you depend on, the product manager and the people who use your team's outputs, and ask each what they wish the ML team did differently.

### Weeks 3-6

Take a small, well-defined task, such as fixing a bug, adding a test, adding monitoring, speeding up a pipeline or improving a dashboard. Ship it through the normal process of code review and deployment, which teaches you the whole path to production on something low-risk. Shadow on-call or incident handling if your team does it.

### Weeks 7-12

Own a scoped project from start to finish: framing, data, baseline, evaluation and a written result. Write a short design doc before building even if nobody asks, and ask for feedback on it. Present the result, covering what you did, what you found, what you recommend and what you are unsure about.

## Habits that compound

Keep a work log of what you did, decisions and the reasons, commands you ran and results; it makes status updates, performance reviews and debugging much easier. Ask questions in a form like "I am trying to do X. I tried A and B. I expected C but got D. I think the cause might be E. Can you help me check?", which respects the other person's time and often answers itself as you write it. If you have been stuck for 30 minutes with no progress, ask; the most common junior failure is being stuck silently for three days. Report status before anyone asks, especially bad news. Review other people's code, which teaches you the codebase and how seniors think. Put the conclusion first in every message, document and email, then the details. Make your results reproducible with the commit, config, data version and command, because future you will not remember today.

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

Give charts titles that state the conclusion ("Fraud recall doubles with device features") and not the topic ("Recall by model"). Lead with the impact in business units. Include what did not work, which saves others from repeating it and builds trust. Show a few concrete examples of model behavior, good and bad. End with a recommendation and next steps.

## What to learn next (after this course)

Your role should set the priorities, but these pay off in most jobs:

1. SQL, learned properly, including joins, window functions and query performance. You will use it daily.
2. Software engineering: testing, packaging, code review, Docker and a cloud platform.
3. Statistics for experiments: A/B testing, power and the basics of causal inference.
4. One deep specialty, such as ranking and recommendations, forecasting, NLP and LLM systems, computer vision or ML infrastructure.
5. Reading the code of serious projects such as scikit-learn, PyTorch modules, Hugging Face transformers and nanoGPT.

### Resources worth your time

Books:

- *An Introduction to Statistical Learning* (James, Witten, Hastie, Tibshirani). Free PDF. Classical ML with statistical depth.
- *Hands-On Machine Learning* (Aurelien Geron). Practical, broad.
- *Designing Machine Learning Systems* and *AI Engineering* (Chip Huyen). Production ML and building LLM applications.
- *Build a Large Language Model (From Scratch)* (Sebastian Raschka). The next step after this course's mini GPT.
- *Dive into Deep Learning* (d2l.ai). Free, with runnable code.
- *Deep Learning* (Goodfellow, Bengio, Courville). Free online. Theory reference, heavy.

Courses and videos:

- Andrej Karpathy, "Neural Networks: Zero to Hero" (YouTube): micrograd, makemore, GPT and tokenizers. It follows on directly from modules 6 and 7.
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

1. Spend five minutes on the title, abstract, figures and conclusion. What problem does it address, what does it claim, and what is the evidence?
2. Spend an hour on the method and experiments, skipping proofs. What are the baselines, are the comparisons fair, and what is missing?
3. For papers that matter to your work, go deeper: reproduce a result, read the code and work through the math.

Be skeptical of: missing baselines, cherry-picked examples, no error bars, evaluation on contaminated benchmarks, and claims that do not match the experiments.

## Staying current without drowning

The field produces more than anyone can read. Pick a few sources, such as a couple of lab and practitioner blogs, the Hugging Face papers page or a curated weekly summary, and the major conferences (NeurIPS, ICML, ICLR, ACL, CVPR), and ignore the rest. When something new appears, ask whether it changes anything you build this quarter. Usually it does not. Fundamentals change slowly and tools change monthly.

## A portfolio that gets interviews

Two or three deep projects beat twenty tutorial copies. Each should have a real question, messy data, a baseline, honest evaluation, a short write-up of results and limitations, and clean runnable code. Deploy at least one as a small API or app that someone can use. An LLM project with an evaluation set stands out more than one with a slick demo and no numbers. `09_exercises/projects.md` has ideas.

## Hype and anxiety

Every few months someone announces that AI will replace the people building it. Tools do change the job, and a lot of boilerplate code is now written with AI assistance, so get fluent with them. What keeps its value is understanding problems, knowing whether results are real, evaluating systems properly, designing reliable systems and explaining them to people, which is what this course trained.

## Integrity

Sooner or later you will be asked, directly or indirectly, to make numbers look better than they are, to ship before something is ready, or to use data in ways that feel wrong. Say what you see, in writing, with facts. Your reputation for honest numbers is the most valuable thing you build in this career, and a single fudged result can destroy it.
