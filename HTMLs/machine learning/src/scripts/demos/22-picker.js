{
  const Q = {
    start: ['What do you have?', [['Labeled examples: inputs with known answers', 'target'], ['Unlabeled data, and I want to find structure', 'unsup'], ['An agent making decisions that earn rewards over time', 'R:rl'], ['A general language or vision task: summarize, extract, answer, describe', 'R:llm']]],
    target: ['What are you predicting?', [['A number (regression)', 'data'], ['A category (classification)', 'data']]],
    data: ['What does the input look like?', [['Tabular: rows and columns', 'size'], ['Images', 'R:img'], ['Text', 'text'], ['A time series (forecasting)', 'R:ts']]],
    size: ['How many labeled rows do you have?', [['Under about 1,000', 'R:small'], ['1,000 to a few million', 'explain'], ['Many millions, with rich raw signals', 'R:big']]],
    explain: ['Must individual predictions be explainable (regulation, trust)?', [['Yes, strictly', 'R:interp'], ['Helpful but not required', 'R:gbm']]],
    text: ['How much labeled text do you have?', [['Little or none', 'R:fewtext'], ['Thousands of examples or more', 'R:text']]],
    unsup: ['What is the goal?', [['Group similar items', 'R:cluster'], ['Visualize or compress many features', 'R:dim'], ['Find unusual items', 'R:anom']]]
  };
  const R = {
    small: ['Keep it simple', 'Start with <b>linear or logistic regression</b> with regularization and a <b>random forest</b>. Use cross-validation instead of a single split, since every example counts. Watch out: with little data, complex models overfit fast and scores are noisy.'],
    gbm: ['Gradient-boosted trees', 'Start with <b>LightGBM, XGBoost or CatBoost</b>, tuned with early stopping on a validation set. Keep a <b>logistic/linear baseline</b> to prove the gain is real. Explain with SHAP values. Watch out: leakage in engineered features is the most common way these models look great and then fail.'],
    interp: ['An interpretable model first', 'Use <b>logistic or linear regression</b> with carefully engineered features, or a <b>shallow decision tree</b>. If a boosted model is much more accurate, consider it with <b>SHAP</b> explanations and document the trade-off. Watch out: fairness and stability checks across groups (chapter 23).'],
    big: ['Boosting at scale or deep learning', 'Boosted trees still scale well and are the first thing to try. With raw, high-dimensional signals (clickstreams, sequences, many categorical IDs), <b>neural networks with embeddings</b> start to pay off. Watch out: infrastructure and experiment tracking matter as much as the model.'],
    img: ['Transfer learning with a pretrained vision model', 'Fine-tune a pretrained <b>CNN (ResNet, EfficientNet) or Vision Transformer</b> using strong data augmentation. For detection or segmentation, start from pretrained YOLO or U-Net style models. Watch out: check that the model is not relying on backgrounds or watermarks instead of the object.'],
    text: ['Fine-tune a pretrained transformer', 'Baseline: <b>TF-IDF + logistic regression</b> (minutes to train, surprisingly strong). Then fine-tune a pretrained <b>transformer encoder</b> (a BERT-style model) or use embeddings + a simple classifier. Watch out: label noise and class imbalance.'],
    fewtext: ['Use a pretrained model directly', 'Try an <b>LLM with a clear prompt and a few examples</b>, or <b>embeddings + logistic regression</b> on the few labels you have. Build a small labeled evaluation set before trusting anything. Watch out: LLM outputs vary with wording; measure, do not eyeball.'],
    ts: ['Forecasting', 'Baselines first: <b>last value, seasonal naive, moving average</b>. Then <b>gradient-boosted trees on lag and calendar features</b>, or classic models (ARIMA, exponential smoothing). Validate with <b>time-based splits</b> only. Watch out: any feature computed with future data is leakage.'],
    cluster: ['Clustering', 'Standardize, then try <b>k-means</b> (choose k with elbow and silhouette) and <b>HDBSCAN/DBSCAN</b> for irregular shapes and noise. Describe each cluster in plain words. Watch out: clustering always returns clusters, even from random data.'],
    dim: ['Dimensionality reduction', '<b>PCA</b> for compression and as preprocessing; <b>UMAP or t-SNE</b> for 2D pictures. Watch out: do not read distances between clusters on a t-SNE or UMAP plot.'],
    anom: ['Anomaly detection', 'Try <b>Isolation Forest</b> or robust statistics (z-scores, percentiles) per segment. If you have even a few labeled anomalies, a supervised model with class weights often wins. Watch out: evaluate with precision at the top of the ranking, since investigators only look at the top alerts.'],
    rl: ['Reinforcement learning, carefully', 'First ask whether a supervised model or a <b>bandit</b> (A/B-style exploration) is enough. If you truly need RL, build a <b>simulator</b>, start with established algorithms like <b>PPO</b> (Stable-Baselines3), and design the reward with care. Watch out: reward hacking.'],
    llm: ['Start from a foundation model', 'Use a strong <b>LLM or vision-language model</b> with good prompts. Add <b>retrieval (RAG)</b> for your own knowledge, and consider fine-tuning only once you have an evaluation set that shows prompting is not enough. Watch out: hallucinations and prompt injection.']
  };
  ML.demo('picker', body => {
    let trail = [];
    const tr = h('div', { class: 'pick-trail' }), box = h('div'), nav = UI.row(body);
    body.prepend(tr, box);
    body.append(nav);
    const back = UI.btn(nav, 'Back', () => { trail.pop(); show(); });
    UI.btn(nav, 'Start over', () => { trail = []; show(); });
    const show = () => {
      const cur = trail.length ? trail[trail.length - 1][1] : 'start';
      tr.textContent = trail.length ? trail.map(t => t[0]).join('  →  ') : 'Answer a few questions to get a sensible starting point.';
      back.disabled = !trail.length; box.innerHTML = '';
      if (cur.startsWith('R:')) {
        const [t, b] = R[cur.slice(2)];
        box.append(h('div', { class: 'pick-res' }, h('div', { class: 'sub-lbl', text: 'Recommendation' }), h('h4', { text: t }), h('p', { html: b })));
        return;
      }
      const [q, opts] = Q[cur];
      box.append(h('div', { class: 'pick-q', text: q }));
      const o = h('div', { class: 'pick-opts' });
      for (const [label, next] of opts) { const b = h('button', { type: 'button', text: label }); b.addEventListener('click', () => { trail.push([label.split(':')[0].split(' (')[0], next]); show(); }); o.append(b); }
      box.append(o);
    };
    show();
  });
}
