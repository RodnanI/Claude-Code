# Learn Machine Learning

A course for someone who knows for loops and dictionaries and wants to end up doing machine learning and LLM work for a company. Everything runs on an ordinary laptop. You do not need a GPU.

## Before you start

Machine learning is mostly data handling, evaluation and glue code. The models are perhaps a fifth of the work. Courses that only cover models leave the rest for you to find out on the job, and this one covers it.

You also cannot jump straight to LLMs. An LLM is a neural network trained with gradient descent and judged with the same statistics as any other model. People who skip that end up writing prompts they cannot debug.

Reading will not teach you much by itself. Run the code, change it, break it and fix it. Every `.py` file is meant to be edited. The math sections feel slow, but you will use them constantly later.

## How the folder is laid out

| Type | What to do with it |
|------|--------------------|
| `.md` files | Read them. They cover concepts, vocabulary and how things work in industry. |
| `.py` files | Run them, read the comments, change something and run again. Each file is self-contained. |

A script runs from inside its own folder:

```bash
cd "learn machine learning/03_ml_foundations"
python 03_linear_regression_lab.py
```

Scripts that draw plots save them to an `outputs/` folder next to the script.

The `.py` files also contain `# %%` markers. In VS Code (with the Python extension) or PyCharm they split the file into cells, as in a Jupyter notebook. Click "Run Cell" above a `# %%` line to run only that part.

## Setup

Read `00_setup/01_setup_guide.md`, then:

```bash
cd "learn machine learning"
python -m venv .venv
# Windows:      .venv\Scripts\activate
# Mac / Linux:  source .venv/bin/activate
pip install -r requirements.txt
python 00_setup/02_check_environment.py
```

## Modules

Go through them in order. The hours are estimates for a beginner who does the labs.

| Module | Folder | Contents | Hours |
|--------|--------|----------|-------|
| 0 | `00_setup` | Python environment, editors, notebooks | 1-2 |
| 1 | `01_python_for_ml` | Python you may have missed, NumPy, pandas, plotting | 10-15 |
| 2 | `02_math` | Linear algebra, calculus, probability, limited to what ML uses | 12-20 |
| 3 | `03_ml_foundations` | What ML is, first models from scratch, overfitting, metrics, data leakage | 15-20 |
| 4 | `04_classical_algorithms` | kNN, Naive Bayes, decision trees, ensembles, k-means, PCA, all from scratch | 12-18 |
| 5 | `05_practical_ml` | scikit-learn, feature engineering, one realistic project | 10-15 |
| 6 | `06_deep_learning` | Neural networks, backprop from scratch, optimizers, PyTorch, CNNs | 15-25 |
| 7 | `07_llms` | Tokenizers, embeddings, attention, a GPT you train yourself, APIs, prompting, RAG, agents, fine-tuning, evaluation | 30-45 |
| 8 | `08_industry` | ML inside companies, MLOps, deployment, monitoring, interviews, careers | 8-12 |
| 9 | `09_exercises` | Self-grading exercises and project ideas | ongoing |

`GLOSSARY.md` sits at the top level. It explains the terms you will hear at work. Keep it open in a tab.

## A schedule

This assumes about 10 hours a week.

| Weeks | Work |
|-------|------|
| 1-2 | Modules 0 and 1, then `09_exercises/01_python_numpy_exercises.py` |
| 3-4 | Module 2. Take your time |
| 5-7 | Modules 3 and 4, then `09_exercises/02_ml_exercises.py` |
| 8 | Module 5. Finish the churn project, then rebuild it without looking |
| 9-11 | Module 6, then `09_exercises/03_deep_learning_exercises.py` |
| 12-16 | Module 7, then `09_exercises/04_llm_exercises.py` |
| 17 | Module 8 |
| 18+ | Pick a project from `09_exercises/projects.md` and build it from start to finish |

## Habits that help

1. When a lab shows something important, retype it in a scratch file instead of pasting it. Typing makes you read every character.
2. Guess what a script will print before you run it. The wrong guesses are the useful ones.
3. Break things on purpose. Set the learning rate to 100, drop the scaling step, delete a line from backprop, and work out why the result changed.
4. Try explaining overfitting to a friend in two sentences. If you stumble, reread the lesson.
5. Most ML bugs are wrong array shapes, so print `.shape` often.
6. Compare every model against the simplest possible baseline before you believe its score.

## Where you will end up

You will be able to take a messy business dataset, clean it, fit a model, evaluate it properly and explain the result to a manager who does not code. You will have written linear models, trees, a neural network and attention yourself, so library code will no longer be a black box. You will have trained a small GPT on your own text, built LLM applications with API calls, retrieval, tool-using agents and evaluation harnesses, and picked up the deployment and monitoring vocabulary that comes up in meetings from the first day.

## Credits

All code here was written for this course. Several labs follow well-known teaching projects and say so in their headers: Andrej Karpathy's micrograd, makemore, minbpe and nanoGPT, and Stanford's CS231n. They are good things to work through after this folder.
