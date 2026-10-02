# Lean Machine Learning

A complete, hands-on path from "I know for loops and dictionaries" to "I can do machine learning and LLM work at a company". Everything here runs on a normal laptop. No GPU needed.

## The blunt truth before you start

- Machine learning is about 20% models and 80% data, evaluation and plumbing. The courses that only teach models are lying to you by omission. This one does not.
- You cannot skip the fundamentals and go straight to LLMs. LLMs are neural networks, trained with gradient descent, evaluated with the same statistics as everything else. People who skip the basics end up as prompt typists who cannot debug anything.
- Reading is not learning. Running code, changing it, breaking it and fixing it is learning. Every `.py` file here is meant to be edited.
- Expect the math sections to feel slow. They pay for themselves ten times over later.

## How this folder works

There are two kinds of files:

| Type | What to do with it |
|------|--------------------|
| `.md` files | Read them. They explain concepts, vocabulary and how things work in industry. |
| `.py` files | Run them, read the comments, then change things and run again. Each one is self-contained. |

Every `.py` file runs on its own from inside its folder:

```bash
cd "lean machine learning/03_ml_foundations"
python 03_linear_regression_lab.py
```

Scripts that make plots save them into an `outputs/` folder next to the script.

The `.py` files also use `# %%` markers. In VS Code (with the Python extension) or PyCharm, those turn the file into runnable cells, like a Jupyter notebook. Click "Run Cell" above any `# %%` line to run just that part.

## Setup (do this first)

Read `00_setup/01_setup_guide.md`, then:

```bash
cd "lean machine learning"
python -m venv .venv
# Windows:      .venv\Scripts\activate
# Mac / Linux:  source .venv/bin/activate
pip install -r requirements.txt
python 00_setup/02_check_environment.py
```

## The roadmap

Work through the modules in order. Hours are honest estimates for a beginner who actually does the labs.

| Module | Folder | What you learn | Hours |
|--------|--------|----------------|-------|
| 0 | `00_setup` | Python environment, editors, notebooks | 1-2 |
| 1 | `01_python_for_ml` | The Python you are missing, NumPy, pandas, plotting | 10-15 |
| 2 | `02_math` | Linear algebra, calculus, probability. Only what ML needs | 12-20 |
| 3 | `03_ml_foundations` | What ML is, your first models from scratch, overfitting, metrics, data leakage | 15-20 |
| 4 | `04_classical_algorithms` | kNN, Naive Bayes, decision trees, ensembles, k-means, PCA, all from scratch | 12-18 |
| 5 | `05_practical_ml` | scikit-learn, feature engineering, a full realistic project | 10-15 |
| 6 | `06_deep_learning` | Neural networks, backprop from scratch, optimizers, PyTorch, CNNs | 15-25 |
| 7 | `07_llms` | Tokenizers, embeddings, attention, a GPT you train yourself, APIs, prompting, RAG, agents, fine-tuning, evaluation | 30-45 |
| 8 | `08_industry` | How ML works in companies, MLOps, deployment, monitoring, interviews, career | 8-12 |
| 9 | `09_exercises` | Self-grading exercises and project ideas | ongoing |

Also at the top level:

- `GLOSSARY.md`: every term you will hear at work, explained plainly. Keep it open in a tab.

## A realistic schedule

If you study about 10 hours a week:

| Weeks | Focus |
|-------|-------|
| 1-2 | Modules 0, 1 and the exercises in `09_exercises/01_python_numpy_exercises.py` |
| 3-4 | Module 2. Do not rush it |
| 5-7 | Modules 3 and 4, plus `09_exercises/02_ml_exercises.py` |
| 8 | Module 5. Finish the churn project and then rebuild it without looking |
| 9-11 | Module 6, plus `09_exercises/03_deep_learning_exercises.py` |
| 12-16 | Module 7, plus `09_exercises/04_llm_exercises.py` |
| 17 | Module 8 |
| 18+ | Pick a project from `09_exercises/projects.md` and build it end to end |

## Rules that will make you good at this

1. **Type, do not copy.** When a lab shows something important, retype it in a scratch file. Your fingers learn things your eyes skip.
2. **Predict before you run.** Before running a script, guess what it will print. Being wrong is where learning happens.
3. **Break it on purpose.** Change the learning rate to 100. Remove the scaling step. Delete a line in backprop. See what happens and explain why.
4. **Explain it out loud.** If you cannot explain overfitting to a friend in two sentences, you do not understand it yet.
5. **Shapes, shapes, shapes.** Most bugs in ML code are wrong array shapes. Print `.shape` constantly.
6. **Always have a baseline.** Never trust a model score until you compare it with the dumbest possible approach.

## What you will be able to do at the end

- Take a messy business dataset, clean it, build a model, evaluate it correctly and explain the result to a non-technical manager.
- Implement linear models, trees, neural networks and attention from scratch, which means you actually understand what libraries do.
- Train a small GPT on your own text and explain every line of it.
- Build LLM applications: API calls, prompts, retrieval-augmented generation, tool-using agents and evaluation harnesses.
- Talk fluently about deployment, monitoring, drift, fine-tuning, quantization and the rest of the vocabulary that shows up in meetings on day one.

## Where the code came from

All code here was written for this course. Some labs are inspired by famous educational projects, credited in the files: Andrej Karpathy's micrograd, makemore, minbpe and nanoGPT, and Stanford's CS231n. When you finish this folder, those are excellent next steps.
