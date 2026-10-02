# Interview Preparation

Questions you are likely to get for junior data science, ML engineering and AI engineering roles, with short answers. Do not memorize the answers. Make sure you could explain each one in your own words, with an example, and answer the obvious follow-up. Every answer points back to a lesson in this course.

## How ML interviews are usually structured

1. **Recruiter screen**: motivation, background, logistics.
2. **Coding**: Python data manipulation, sometimes algorithm questions, sometimes "implement X from scratch with NumPy".
3. **ML fundamentals**: concepts below.
4. **Practical / take-home**: a dataset and a question; judged on process, correctness and communication.
5. **ML system design** (file 07), more for engineering roles.
6. **Behavioral**: past projects, collaboration, mistakes.

## Fundamentals

**What is the bias-variance tradeoff?**
Error comes from wrong assumptions (bias, underfitting) and from sensitivity to the particular training sample (variance, overfitting). More model capacity lowers bias and raises variance; the goal is the best balance on unseen data.

**How do you detect and fix overfitting?**
Training performance much better than validation. Fix with more data, regularization, simpler models, early stopping, dropout, augmentation, or ensembling.

**Why do we need a validation set and a test set?**
Validation is used to make decisions (tuning, model choice), which slowly overfits to it. The untouched test set gives an honest final estimate.

**Explain cross-validation. When would you not use plain k-fold?**
Rotate which fold is held out and average. Use stratified folds for imbalance, group folds when several rows belong to one entity, time-based splits for temporal data.

**What is data leakage? Give an example.**
Information unavailable at prediction time leaks into training or evaluation. Example: a churn model using "cancellation reason", or scaling with statistics from the whole dataset before splitting.

**L1 vs L2 regularization?**
L1 adds the sum of absolute weights and drives many weights to exactly zero (feature selection). L2 adds the sum of squared weights and shrinks all weights smoothly.

**Why scale features? Which models need it?**
Distance- and gradient-based models (kNN, SVM, linear and logistic regression with regularization, neural nets, PCA, k-means) are sensitive to feature scale. Tree models are not.

**Parameters vs hyperparameters?**
Parameters are learned during training (weights). Hyperparameters are chosen before training (learning rate, depth, regularization strength).

**How does gradient descent work? What does the learning rate do?**
Repeatedly move parameters against the gradient of the loss. The learning rate sets the step size: too small is slow, too large oscillates or diverges.

**Batch, mini-batch and stochastic gradient descent?**
Gradient from all data, from a small batch, or from one example. Mini-batch is the standard trade-off between noise and speed.

## Models

**How does logistic regression work, and why not use linear regression for classification?**
A linear score passed through a sigmoid gives a probability; trained with log loss. Linear regression outputs unbounded values and its squared loss behaves poorly for 0/1 targets.

**How does a decision tree choose splits?**
It tries features and thresholds and picks the split that most reduces impurity (Gini or entropy) for classification, or squared error for regression.

**Random forest vs gradient boosting?**
Random forests average many deep trees trained independently on bootstrap samples with random feature subsets (reduces variance). Boosting adds shallow trees sequentially, each fitting the remaining errors (reduces bias); usually more accurate, needs tuning and early stopping.

**How does k-means work and what are its limits?**
Alternate assigning points to the nearest centroid and moving centroids to the mean. You must choose k, it assumes round similar-sized clusters, is sensitive to scale and initialization.

**What does PCA do?**
Finds orthogonal directions of maximum variance (eigenvectors of the covariance matrix) and projects data onto the top ones for compression or visualization.

**Why is Naive Bayes "naive"?**
It assumes features are independent given the class. Often false, but it still works well for text classification as a fast baseline.

**Which model would you try first for tabular data? For images? For text?**
Tabular: a simple baseline, then gradient boosting. Images: fine-tune a pretrained CNN or vision transformer. Text: TF-IDF + linear model as a baseline, then embeddings or a pretrained transformer or LLM depending on cost and accuracy needs.

## Metrics

**Precision vs recall? When does each matter more?**
Precision: of predicted positives, how many are right. Recall: of actual positives, how many were found. Recall for cancer screening, precision for spam filtering; in general, decide from the costs of each error.

**Why is accuracy misleading with imbalanced classes?**
Predicting the majority class gives high accuracy with zero usefulness.

**ROC AUC vs PR AUC?**
ROC AUC measures ranking quality across thresholds (probability a random positive outranks a random negative). PR AUC focuses on the positive class and is more informative when positives are rare.

**How do you choose a classification threshold?**
From the business costs of false positives and false negatives, using validation data: minimize expected cost or meet a required precision or recall.

**MAE vs RMSE?**
MAE is the average absolute error, robust to outliers. RMSE squares errors first, so it punishes large errors more.

**What is calibration?**
Whether predicted probabilities match observed frequencies. Check with reliability diagrams; fix with Platt scaling or isotonic regression.

## Deep learning

**What does backpropagation do?**
Applies the chain rule backward through the computational graph to get the gradient of the loss with respect to every parameter in one pass.

**Why do we need non-linear activation functions?**
Without them, stacked linear layers collapse into a single linear function.

**What are vanishing and exploding gradients, and how are they handled?**
Gradients shrink or blow up through many layers. Handled with ReLU-family activations, careful initialization, normalization layers, residual connections and gradient clipping.

**Dropout and batch norm: what do they do, and what changes at inference?**
Dropout randomly zeroes activations during training as regularization; turned off at inference. BatchNorm normalizes with batch statistics in training and running averages at inference. Hence `model.eval()`.

**Adam vs SGD?**
Adam adapts the step size per parameter using running averages of gradients and squared gradients; fast and robust default. SGD with momentum is simpler and sometimes generalizes slightly better in vision.

**Your training loss is not decreasing. What do you check?**
Data and labels, the learning rate, that gradients flow and `optimizer.step()` runs, loss at initialization, whether the model can overfit one small batch.

## LLMs and generative AI

**How does a transformer work, briefly?**
Tokens become embeddings plus position information; each block applies self-attention (tokens exchange information) and an MLP, with residual connections and normalization; a final layer gives next-token probabilities.

**Explain self-attention.**
Each token makes a query, key and value; scores are query-key dot products scaled by the square root of the dimension, softmaxed into weights that mix the values. Causal masking stops tokens from seeing the future.

**What is tokenization, and why does it matter?**
Splitting text into subword units mapped to ids (often BPE). It affects cost, context usage, multilingual fairness and quirks like letter counting and arithmetic.

**What are the training stages of a chat model?**
Self-supervised pretraining on huge text, supervised fine-tuning on instruction-response examples, preference tuning (RLHF or DPO), and often reinforcement learning on verifiable tasks.

**What is temperature?**
Logits are divided by it before softmax: lower is more deterministic, higher more random. Many newer API models replace sampling knobs with effort or reasoning settings.

**What is RAG and when would you use it instead of fine-tuning?**
Retrieve relevant documents and include them in the prompt. Use it for private or changing knowledge and citations; fine-tuning is better for style, format and narrow behaviors.

**How do you evaluate an LLM application?**
A task-specific evaluation set from real inputs, code-based checks where possible, LLM judges calibrated against humans, per-slice results, regression tracking, then online metrics.

**What causes hallucinations, and how do you reduce them?**
The model generates plausible text without grounding. Reduce with retrieval and citations, permission to abstain, tools for facts and calculation, verification steps and evaluation.

**What is LoRA?**
Freeze the pretrained weights and learn a low-rank update (two small matrices) for selected layers. Trains a tiny fraction of parameters, saves memory and allows swappable adapters.

**What is quantization?**
Storing weights (and sometimes activations or KV cache) in fewer bits, like int8 or int4, to cut memory and speed up inference at a small quality cost.

**What is the KV cache?**
Stored attention keys and values of previous tokens, reused during generation so each new token does not recompute them. Its memory grows with context length and batch size.

**What is prompt injection?**
Malicious instructions inside content the model reads (documents, web pages, tool output). Defenses: least privilege, separating data from instructions, confirmation for risky actions, output validation.

## Practical and statistics

**How would you design an A/B test for a new recommendation model?**
Randomize users, pick a primary metric and guardrail metrics in advance, compute the sample size for the minimum effect worth detecting, run for full weekly cycles, avoid peeking, analyze with confidence intervals.

**Correlation vs causation, with an example.**
Ice cream sales and drownings both rise in summer; neither causes the other. Predictive models find correlations; causal questions need experiments or causal inference methods.

**You have 1% positive examples. What do you do?**
Use appropriate metrics (PR AUC, recall at precision), stratified splits, class weights or threshold tuning, collect more positives if possible, and check that the business case is defined in terms of costs.

**How do you handle missing data?**
Understand why it is missing, then impute (median, most frequent, model-based), add missing indicators, or use models that handle missing values natively. Never fill blindly with zeros for linear models.

## Coding tasks you should be able to do without help

- Implement: train/test split, standardization, accuracy, precision/recall/F1, confusion matrix, MSE.
- Implement: linear regression with gradient descent, logistic regression, kNN, k-means.
- Implement: softmax (numerically stable), cross-entropy, a two-layer network forward and backward pass.
- Implement: scaled dot-product attention with a causal mask.
- pandas: group-by aggregations, merges, pivoting, handling missing values, date features.
- SQL: joins, group by, window functions (running totals, ranking, "previous value").

`09_exercises` drills most of these with automatic checks.

## Behavioral questions (prepare stories)

Prepare short stories (situation, what you did, result, what you learned) for:

- a project you are proud of, with numbers
- a time your model or analysis was wrong, and what you did
- a disagreement with a colleague or stakeholder
- explaining something technical to a non-technical person
- learning something quickly under pressure

Honesty about mistakes, with what you changed afterwards, impresses more than a flawless story.

## Take-home assignments: how to stand out

1. Read the question twice. Answer the question asked.
2. Explore the data and say what you found (problems included).
3. Split properly and build a baseline first.
4. Choose metrics that fit the problem and justify them.
5. Keep the modeling reasonable; do not tune for days.
6. Write a short, clear summary: approach, results with uncertainty, limitations, next steps.
7. Clean, runnable code with instructions. A reviewer who cannot run your notebook stops reading.
