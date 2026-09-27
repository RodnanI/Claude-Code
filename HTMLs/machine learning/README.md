# Machine Learning, A Field Guide

An interactive, single-file course on machine learning: 25 chapters from the basics to neural networks, transformers, LLMs, reinforcement learning and a career roadmap, with live figures you can drag, tune and train.

**Open `machine-learning.html` in any modern browser.** It is fully standalone: no server, no internet connection, no installs. Light and dark mode follow your system (override with the button in the top bar). Progress, quiz answers and checklists are saved in your browser.

## Source layout

```
src/
  template.html        page shell with placeholders
  styles/              tokens.css (colors, type, dark mode), layout.css, components.css
  scripts/
    core.js            DOM helpers, theme, canvas Plot class, UI controls, navigation, quizzes
    ml.js              datasets, linear algebra, decision trees, random forests, a small MLP
    demos/NN-*.js      one file per chapter's interactive figures
  chapters/NN-*.html   chapter content, in reading order
build.py               concatenates everything into machine-learning.html
```

## Rebuild after editing

```
python3 build.py
```

The build fails if an em dash sneaks into the output.
