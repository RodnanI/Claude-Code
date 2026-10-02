"""
Naive Bayes spam filter, from scratch with dicts.

This was THE spam filter of the early 2000s. It is also your first language model of
sorts: it assigns a probability to text by multiplying word probabilities. LLMs do the
same thing with a vastly better model of which words follow which.

Ideas you will meet again: tokenization, vocabularies, log probabilities, smoothing.

Run it:  python 02_naive_bayes_lab.py
"""

import math
import re

# %% 1. A tiny labeled dataset
spam = [
    "WIN a FREE iPhone now, click the link to claim your prize",
    "Congratulations! You have been selected for a cash reward, reply YES",
    "Limited offer: cheap meds, no prescription needed, order today",
    "URGENT: your account is suspended, verify your password at this link",
    "You won a lottery of 1,000,000 dollars, send your bank details to claim",
    "Earn money fast from home, no experience needed, click here",
    "Free entry to win a holiday, text WIN to 80085",
    "Exclusive deal just for you: 90% off designer watches, buy now",
    "Your parcel is waiting, pay the small delivery fee at this link",
    "Claim your free bonus credits today, offer expires at midnight",
    "Get a loan instantly with no credit check, apply now",
    "You are a winner! Click to claim your free gift card",
    "Crypto investment doubles your money in a week, guaranteed profit",
    "Final notice: claim your refund now by confirming your bank account",
    "Lose weight fast with this free trial pill, order now",
    "Act now to receive your cash prize, limited time only",
    "Your free subscription is ready, just enter your card number",
    "Make money online, guaranteed income, click the link",
    "Winner! You have won a free cruise, call now to claim",
    "Hot deal: free shipping on everything if you order in the next hour",
]
ham = [
    "Are we still meeting for lunch tomorrow at noon?",
    "Can you send me the slides from the meeting today?",
    "Mom says dinner is at seven, bring the salad",
    "The project deadline moved to Friday, let me know if that works",
    "Thanks for your help with the report, it looks great",
    "I will be late to the office, the train is delayed",
    "Happy birthday! Hope you have a great day",
    "Did you finish the homework for the statistics class?",
    "Let's review the model results in the team meeting",
    "Can you pick up milk and bread on your way home?",
    "The doctor appointment is confirmed for Tuesday morning",
    "Great game last night, we should play again next week",
    "Please review my pull request when you have time",
    "The flight lands at six, can you pick me up at the airport?",
    "I uploaded the dataset to the shared folder",
    "Are you coming to the party on Saturday?",
    "The meeting notes are attached, call me if anything is unclear",
    "Thanks for dinner, it was lovely to see you",
    "Our team won the quiz night, see you at practice",
    "Can we move our call to Thursday afternoon?",
]
texts = spam + ham
labels = ["spam"] * len(spam) + ["ham"] * len(ham)


# %% 2. Tokenization: text -> list of tokens
def tokenize(text):
    return re.findall(r"[a-z0-9']+", text.lower())


print(tokenize("WIN a FREE iPhone now, click the link!"))
# Real tokenizers (module 7) split into subword pieces, keep case and punctuation, and map
# to integer ids. This lowercase word split is the simplest version of the same idea.


# %% 3. The model
# Bayes: P(class | words) is proportional to P(class) * P(words | class)
# The NAIVE assumption: words are independent given the class, so
#   P(words | class) = P(w1 | class) * P(w2 | class) * ...
# Obviously false ("credit" and "card" are not independent), yet it works surprisingly well.
class NaiveBayes:
    def __init__(self, alpha=1.0):
        self.alpha = alpha                      # Laplace smoothing strength (explained below)

    def fit(self, texts, labels):
        self.classes_ = sorted(set(labels))
        self.vocab_ = {w for t in texts for w in tokenize(t)}
        self.word_counts_ = {c: {} for c in self.classes_}    # class -> {word: count}
        self.total_words_ = {c: 0 for c in self.classes_}
        class_counts = {c: 0 for c in self.classes_}
        for text, label in zip(texts, labels):
            class_counts[label] += 1
            for w in tokenize(text):
                self.word_counts_[label][w] = self.word_counts_[label].get(w, 0) + 1
                self.total_words_[label] += 1
        self.log_prior_ = {c: math.log(class_counts[c] / len(labels)) for c in self.classes_}
        return self

    def word_log_prob(self, word, c):
        count = self.word_counts_[c].get(word, 0)
        numerator = count + self.alpha
        if numerator == 0:
            return float("-inf")                  # log(0): this class becomes impossible
        return math.log(numerator / (self.total_words_[c] + self.alpha * len(self.vocab_)))

    def log_scores(self, text):
        words = [w for w in tokenize(text) if w in self.vocab_]   # unknown words are skipped
        return {c: self.log_prior_[c] + sum(self.word_log_prob(w, c) for w in words) for c in self.classes_}

    def predict_proba(self, text):
        scores = self.log_scores(text)
        top = max(scores.values())
        if top == float("-inf"):
            return {c: 1 / len(scores) for c in scores}
        exps = {c: math.exp(s - top) for c, s in scores.items()}   # softmax with the max trick
        total = sum(exps.values())
        return {c: v / total for c, v in exps.items()}

    def predict(self, text):
        scores = self.log_scores(text)
        return max(scores, key=scores.get)


model = NaiveBayes(alpha=1.0).fit(texts, labels)
print(f"\nvocabulary size: {len(model.vocab_)} words")


# %% 4. Classify new messages
new_messages = [
    ("Claim your free prize now", "spam"),
    ("Can you send the report before the meeting?", "ham"),
    ("You won a free ticket, click to claim", "spam"),
    ("We won the game, see you at dinner", "ham"),
    ("Verify your bank password at this link", "spam"),
    ("Lunch tomorrow? I can pick you up", "ham"),
]
print("\nprediction  P(spam)  truth  message")
correct = 0
for text, truth in new_messages:
    pred = model.predict(text)
    correct += pred == truth
    print(f"{pred:<10}  {model.predict_proba(text)['spam']:>6.3f}  {truth:<5}  {text}")
print(f"{correct}/{len(new_messages)} correct")


# %% 5. What did it learn? Words with the biggest spam/ham probability ratio
ratios = {w: model.word_log_prob(w, "spam") - model.word_log_prob(w, "ham") for w in model.vocab_}
ranked = sorted(ratios.items(), key=lambda kv: kv[1])
print("\nmost spammy:", [w for w, _ in ranked[-8:][::-1]])
print("most hammy: ", [w for w, _ in ranked[:8]])


# %% 6. Why we use logs: underflow
long_text = " ".join(ham * 10)          # 2,000+ words
words = [w for w in tokenize(long_text) if w in model.vocab_]
product = 1.0
for w in words:
    product *= math.exp(model.word_log_prob(w, "ham"))
log_sum = sum(model.word_log_prob(w, "ham") for w in words)
print(f"\n{len(words)} words: raw probability product = {product}, log-probability sum = {log_sum:.1f}")


# %% 7. Why we smooth: the zero-probability problem
unsmoothed = NaiveBayes(alpha=0.0).fit(texts, labels)
tricky = "Claim your free prize, it was discussed in the meeting"
print(f"\nmessage: '{tricky}'")
print(f"  without smoothing: P(spam) = {unsmoothed.predict_proba(tricky)['spam']:.3f}")
print(f"  with smoothing:    P(spam) = {model.predict_proba(tricky)['spam']:.3f}")
# 'meeting' never appeared in spam, and 'claim' never appeared in ham. Without smoothing, each
# class contains a word with probability exactly 0, so BOTH classes become impossible and the
# model gives up (0.5). A single unseen word vetoes all other evidence. Adding alpha to every
# count (Laplace smoothing) says "unseen does not mean impossible". LLMs face the same issue:
# never assign exactly zero probability to anything.


# %% 8. The same thing with scikit-learn (what you would write at work)
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

sk_model = make_pipeline(CountVectorizer(), MultinomialNB(alpha=1.0)).fit(texts, labels)
sk_preds = sk_model.predict([t for t, _ in new_messages])
print("\nscikit-learn predictions:", sk_preds.tolist())

# %% Limits
# Bag of words ignores order: "not good" and "good, not" look identical. It cannot use
# context or meaning: "free" in "feel free to ask" counts as spammy. Modern spam filters use
# richer features and neural models, and the text understanding in module 7 fixes the
# order problem entirely. Still, Naive Bayes trains in milliseconds and makes a strong
# baseline for text classification. Always try a cheap baseline first.

# %% Your turn
# 1. Add 5 spam and 5 ham messages of your own. Does accuracy on the new messages change?
# 2. Use word PAIRS (bigrams) as tokens: "click the" "the link". Does it help?
# 3. Set alpha to 0.01 and 10. How do the probabilities change?
