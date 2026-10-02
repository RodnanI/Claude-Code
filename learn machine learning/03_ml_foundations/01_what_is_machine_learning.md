# What Machine Learning Actually Is

## The one-sentence definition

Machine learning is **learning a function from examples** instead of writing the function by hand.

```
Traditional programming:   rules + input   ->  output
Machine learning:          inputs + outputs (examples)  ->  rules (a model)
```

A spam filter written by hand is a pile of `if` statements: "if the email contains 'FREE MONEY', mark as spam". It breaks the moment spammers change wording. A learned spam filter looks at 100,000 emails already marked spam or not spam and figures out the patterns itself, including ones no human would think of. When spammers adapt, you retrain on new examples.

## Vocabulary

You will hear several names for the same thing, depending on whether the speaker came from statistics, computer science or a particular company.

| Term | Also called | Meaning |
|------|-------------|---------|
| example | sample, instance, observation, row, record, data point | one thing you have data about: one house, one email, one customer |
| feature | attribute, variable, input, predictor, column, covariate, `X` | one measurable property of an example: size, word counts, age |
| label | target, output, ground truth, response, `y` | the answer you want to predict |
| dataset | data, corpus (for text) | all your examples |
| model | estimator, predictor, network | the function that maps features to predictions |
| parameters | weights, coefficients, `theta` | numbers inside the model that training learns |
| hyperparameters | config, settings | numbers YOU choose before training: learning rate, tree depth, number of layers |
| training | fitting, learning, optimization | adjusting parameters to reduce error on examples |
| loss | cost, objective, error, criterion | a number measuring how wrong the model is. Training minimizes it |
| inference | prediction, scoring, serving | using a trained model on new inputs |
| generalization | out-of-sample performance | how well the model does on data it never saw |
| ground truth | gold labels | the real correct answers, usually labeled by humans or observed later |

Beginners mix up two pairs of terms. Parameters are learned (the slope of a line, the weights of a network), while hyperparameters are set by you (the learning rate, the size of the model). Tuning hyperparameters means trying several settings and keeping the one that scores best on validation data. Training happens once or now and then and costs a lot. Inference happens every time a user wants a prediction, so it has to be fast and cheap. Companies often run the two on separate systems, sometimes with separate teams.

## Kinds of machine learning

### Supervised learning: you have the answers

Every training example comes with a label. The model learns to map features to labels.

- Regression: predict a number. House price, delivery time, demand for next week.
- Classification: predict a category.
  - binary: two classes (spam / not spam, churn / stay, fraud / legit)
  - multi-class: one of many (which digit, which product category)
  - multi-label: several can be true at once (tags on a photo: "beach", "dog", "sunset")

Most business ML is supervised, and the hard part is usually getting good labels.

### Unsupervised learning: no answers, find structure

- Clustering: group similar examples (customer segments).
- Dimensionality reduction: compress many features into a few while keeping the important structure (PCA, visualizing embeddings).
- Anomaly detection: find things that look unlike the rest (broken sensors, unusual transactions).

### Self-supervised learning: the labels hide inside the data

Take text, hide the next word, and ask the model to predict it. The "label" is just the next word, so every sentence on the internet becomes free training data. **This is how LLMs are pretrained.** It is technically supervised learning, but nobody had to label anything, which is why it scales to trillions of examples.

### Reinforcement learning: learn from rewards

An agent takes actions in an environment and gets rewards. It learns which actions lead to more reward over time. Game-playing AIs, robotics, and the "RL" in **RLHF** (reinforcement learning from human feedback), which turns a raw LLM into a helpful assistant. Recent "reasoning" models are trained heavily with RL on problems where answers can be checked automatically.

### Other terms you will hear

- Semi-supervised: a few labeled examples plus many unlabeled ones.
- Transfer learning: start from a model trained on a big general task and adapt it to your small specific one. The default approach for images and text today. Fine-tuning an LLM is transfer learning.
- Online learning: the model updates continuously as new data arrives.

## Anatomy of every model

```
prediction = f(features; parameters)
loss       = how_wrong(prediction, true_label)
training   = repeatedly nudge parameters to make loss smaller
```

Linear regression, decision trees, neural networks and GPT all fit this template. They differ in what `f` looks like, which loss they use and how they search for good parameters.

## The workflow

1. Frame the problem. What decision will the prediction drive? What is a good enough result? What does a mistake cost? Skipping this step is the number one reason ML projects fail.
2. Get data. Find it, query it, join it, label it.
3. Explore it. Distributions, missing values, weird values, how the label relates to features.
4. Split it. Training, validation, test. Before you do anything clever.
5. Build a baseline. The simplest thing: predict the average, the most common class, or a single rule. Your model must beat this.
6. Train models and iterate. Feature engineering, try models, tune hyperparameters on validation data.
7. Evaluate once on the test set. Honest estimate of real-world performance.
8. Deploy. Put it where it makes decisions.
9. Monitor and retrain. The world changes and models decay.

Junior people tend to rush steps 1-3 and 8-9, and those are where experienced people spend most of their time.

## Structured versus unstructured data

| Data | Looks like | What usually wins |
|------|-----------|-------------------|
| structured / tabular | spreadsheets, database tables | gradient boosted trees (XGBoost, LightGBM, CatBoost). Still, in 2026 |
| images | pixel grids | deep learning (CNNs, vision transformers), usually pretrained |
| text | sequences of words | transformers: pretrained LLMs and embedding models |
| audio | waveforms | deep learning, usually pretrained |
| time series | values over time | depends: boosted trees with lag features, classical statistics, sometimes deep models |

If someone proposes a neural network for a tabular dataset of 5,000 rows, ask why they did not try gradient boosting first.

## Where LLMs fit

An LLM is a deep neural network (a transformer), trained with self-supervised learning to predict the next token, then fine-tuned with supervised learning and reinforcement learning to follow instructions. Modules 2 to 6 cover its parts. "AI engineering" (building products on LLMs) and classical ML engineering now overlap a lot, since both need data handling, evaluation, deployment and monitoring.

## When not to use machine learning

- A simple rule solves it. If "flag orders over 10,000 dollars from new accounts" catches 95% of the problem, ship the rule.
- You have no data, or no way to get labels.
- Every mistake is unacceptable and must be explainable (some legal and safety settings).
- The pattern changes faster than you can retrain.
- Nobody will act on the prediction. An unused model is worth nothing, however accurate.

## Generalization

A model that gets every training example right has learned nothing if it fails on new ones. Memorizing is easy; the difficulty is doing well on unseen data. The next files cover how models fail at this (overfitting), how to measure it (splits and metrics), and how people fool themselves without noticing (data leakage).

## Questions

1. Classify each as regression, binary, multi-class or multi-label: predicting tomorrow's temperature; detecting which of 5 languages a text is in; tagging a movie with genres; predicting whether a loan defaults.
2. Is the learning rate a parameter or a hyperparameter? What about the weights of a neural network?
3. Why do LLMs not need humans to label their pretraining data?
4. Your manager wants "AI" to decide which support tickets are urgent. Write down the questions you ask before touching any data.
