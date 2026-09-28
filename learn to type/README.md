# Learn to Type

A ten-finger touch typing course in one standalone HTML file. English course on the US QWERTY layout, German course (with German interface) on the German QWERTZ layout, including ä ö ü ß and the AltGr symbols.

Open `learn-to-type.html` in Chrome, Edge, Firefox or Safari. No install, no network needed. Your operating system keyboard layout must match the course (English (US) or German); the app warns you if it doesn't.

## How it teaches

- **45 lessons (English) / 48 lessons (German)** in eight stages: home row, top row, bottom row, capitals, punctuation, numbers, symbols, fluency. Plan on several days at a few hours per day.
- Each lesson introduces one or two keys with an animated hand overlay showing which finger reaches where, then trains them: anchored key drills, combinations with known keys, pronounceable syllables, real words, mixed text with the punctuation you already know.
- Every generated exercise uses only keys you have learned so far.
- **Stars**: pass at 90% accuracy; two stars at 94% plus a speed target, three at 97% plus a higher target. Accuracy always comes first.
- **The coach** picks the next step so you can just keep pressing Space: a daily warm-up on your weakest keys, a second attempt when a pass was shaky, a review after every three new lessons, and break reminders every 30 minutes.
- **Adaptive practice** tracks error rate and hesitation per key and weights the text towards your weak keys.
- **Adaptive key hints**: new or weak keys light up immediately; keys you know only light up after you hesitate, so you learn to stop looking.
- Speed tests (1 to 5 minutes), statistics with speed and accuracy trends, practice time per day, a per-key heatmap and your most frequent mix-ups.

## Controls

Everything works from the keyboard. Space continues, Esc goes back or pauses, arrows move through menus, number keys 1 to 5 open the menu items on the course screen, F toggles fullscreen.

## Progress

Progress is stored in the browser's local storage, separately per course. Settings has export and import so you can move it to another browser or machine. Opening the file from a different path can count as a different origin in some browsers, so keep the file in one place or export first.

## Known limits

- Symbol positions follow the Windows/Linux layouts. On a Mac the German layout puts @, €, { } [ ] \ | ~ on Option combinations instead of AltGr; typing them still counts, but the on-screen hint shows the AltGr position.
- Dead keys (^ ´ ` on the German layout) are left out of the German course.

## Development

Sources live in `src/` (open `src/index.html` directly while editing). `node build.js` inlines all CSS and JS into `learn-to-type.html`. No dependencies.

```
src/
  index.html          page skeleton, lists stylesheets and scripts in load order
  css/                base tokens and themes, keyboard and hands, screens
  js/
    util.js i18n.js   helpers, all interface text (English and German)
    layouts.js        ANSI/ISO geometry, key labels, finger zones
    data/en.js de.js  word lists, sentences, punctuation and symbol templates
    generator.js      drills, pseudo-words (letter Markov model), word picking
    curriculum.js     lesson sequences, star targets, exercise plans
    store.js          settings, progress, per-key statistics
    coach.js          what to do next
    keyboard.js       on-screen keyboard and the hand overlay
    input.js          keyboard input incl. dead keys and IME composition
    typing.js         keystroke accounting and the scrolling tape
    screens/          one file per screen
    app.js            start-up
```
