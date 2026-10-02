"""
pandas: tables of data.

A DataFrame is a table: named columns, one row per record. Think of it as a dict
of columns (you know dicts) with superpowers. In industry, almost every ML
project starts with pandas: load, inspect, clean, reshape, then hand NumPy
arrays to a model.

Run it:  python 04_pandas_lab.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

pd.set_option("display.width", 120)
OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


# %% 1. A DataFrame from a dict (deliberately messy, like real data)
raw = {
    "order_id": [101, 102, 103, 104, 105, 106, 107, 107],
    "date": ["2026-01-03", "2026-01-03", "2026-01-04", "2026-01-05",
             "2026-01-05", "2026-01-06", "2026-01-07", "2026-01-07"],
    "drink": ["Latte", "espresso", "latte ", "Cappuccino", "ESPRESSO", "latte", "Mocha", "Mocha"],
    "size": ["M", "S", "L", "M", None, "M", "L", "L"],
    "price": [4.5, 2.8, 5.2, 4.9, 2.8, 4.5, 5.5, 5.5],
    "customer_age": [34, 51, np.nan, 28, 45, 34, 22, 22],
}
df = pd.DataFrame(raw)
print(df)


# %% 2. First look: ALWAYS do these four things with a new dataset
print("\nshape:", df.shape)
print("\ndtypes:\n", df.dtypes)
print("\nmissing values per column:\n", df.isna().sum())
print("\nsummary statistics:\n", df.describe())
# Problems you should spot already:
#   - "Latte", "latte " and "latte" are the same drink spelled three ways
#   - size and customer_age have missing values
#   - order 107 appears twice (a duplicate row)
#   - dates are strings, not dates


# %% 3. Cleaning
df = df.drop_duplicates()                                   # remove exact duplicate rows
df["drink"] = df["drink"].str.strip().str.lower()           # .str gives string methods for a whole column
df["date"] = pd.to_datetime(df["date"])                     # real dates
df["size"] = df["size"].fillna("unknown")                   # fill missing categories with a label
median_age = df["customer_age"].median()
df["age_was_missing"] = df["customer_age"].isna()           # keep the fact that it was missing (can be predictive)
df["customer_age"] = df["customer_age"].fillna(median_age)  # fill missing numbers with the median
print("\ncleaned:\n", df)
# Why median and not mean? The median ignores extreme values. One 120-year-old typo
# would drag the mean, not the median.


# %% 4. Selecting
print("\none column (a Series):\n", df["price"].head(3))
print("\ntwo columns (a DataFrame):\n", df[["drink", "price"]].head(3))
print("\nrow by position, iloc[0]:\n", df.iloc[0])
lattes = df[df["drink"] == "latte"]                        # boolean mask, like NumPy
print("\nlattes:\n", lattes)
cheap_large = df[(df["price"] < 5.3) & (df["size"] == "L")]   # & for AND, | for OR, parentheses required
print("\ncheap large:\n", cheap_large)
print("\nloc with mask and columns:\n", df.loc[df["price"] > 5, ["order_id", "drink"]])


# %% 5. New columns (feature engineering starts here)
df["weekday"] = df["date"].dt.day_name()
df["is_weekend"] = df["date"].dt.dayofweek >= 5
df["price_with_tax"] = (df["price"] * 1.2).round(2)
size_to_ml = {"S": 240, "M": 350, "L": 470, "unknown": np.nan}
df["volume_ml"] = df["size"].map(size_to_ml)             # map a dict over a column
df["price_per_100ml"] = (df["price"] / df["volume_ml"] * 100).round(2)
print("\nwith new columns:\n", df[["drink", "size", "weekday", "price_per_100ml"]])


# %% 6. Group by: split, apply, combine
summary = df.groupby("drink").agg(
    orders=("order_id", "count"),
    revenue=("price", "sum"),
    avg_price=("price", "mean"),
).sort_values("revenue", ascending=False)
print("\nper drink:\n", summary)
print("\nvalue_counts:\n", df["drink"].value_counts())
print("\npivot table (drink x size, count):\n",
      df.pivot_table(index="drink", columns="size", values="order_id", aggfunc="count", fill_value=0))


# %% 7. Joining tables
# Real data lives in several tables. You merge them on a shared key, like SQL JOIN.
drinks_info = pd.DataFrame({
    "drink": ["latte", "espresso", "cappuccino", "mocha"],
    "has_milk": [True, False, True, True],
    "caffeine_mg": [120, 65, 120, 95],
})
merged = df.merge(drinks_info, on="drink", how="left")   # left join: keep every order
print("\nmerged:\n", merged[["order_id", "drink", "has_milk", "caffeine_mg"]])
# Always check row counts after a merge. If they grow, your key was not unique and rows got duplicated.
assert len(merged) == len(df), "merge duplicated rows"


# %% 8. Apply: custom logic per row (slow, use only when vectorized code is awkward)
def describe_order(row):
    return f"{row['size']} {row['drink']} at {row['price']:.2f}"


print("\n", df.apply(describe_order, axis=1).head(3).tolist())


# %% 9. Saving and loading
path = OUT / "orders_clean.csv"
df.to_csv(path, index=False)
back = pd.read_csv(path, parse_dates=["date"])
print("\nreloaded shape:", back.shape)
# Parquet (df.to_parquet) is what companies use for big tables: smaller, faster, keeps dtypes.


# %% 10. Handing data to a model
features = ["price", "customer_age", "is_weekend"]
X = df[features].to_numpy(dtype=float)      # models want plain numeric arrays
y = (df["drink"] == "latte").to_numpy()      # e.g. predict "is it a latte?"
print("\nX shape:", X.shape, "| y:", y)

# One-hot encoding turns categories into 0/1 columns, because models need numbers:
print("\none-hot sizes:\n", pd.get_dummies(df["size"], prefix="size", dtype=int))


# %% 11. Your turn
# 1. Which weekday had the highest revenue?
# 2. Add a column "age_group" with "under 30", "30-49", "50+" (hint: pd.cut).
# 3. What fraction of orders were lattes? (hint: (df["drink"] == "latte").mean())
# 4. Introduce a typo price of 450.0 in one row. How does describe() reveal it?
#    How would you detect such outliers automatically?
