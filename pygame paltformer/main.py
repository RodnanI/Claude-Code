"""UPDRAFT - a tiny ember's climb to the sky. Run: python main.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from game import Game  # noqa: E402

if __name__ == '__main__':
    Game().run()
