\version "2.24.0"
#(set-global-staff-size 18)
sffz = #(make-dynamic-script "sffz")

\header {
  title = "Passacaglia, Chorale and Fugue"
  subtitle = "in C minor"
  subsubtitle = "on a ground of eight bars"
  composer = "Claude"
  tagline = ##f
}

\paper {
  #(set-paper-size "a4")
  top-margin = 11
  bottom-margin = 11
  left-margin = 14
  right-margin = 12
  ragged-last-bottom = ##f
  max-systems-per-page = 5
  markup-system-spacing.basic-distance = 12
  system-system-spacing = #'((basic-distance . 14) (minimum-distance . 10) (padding . 2.5) (stretchability . 60))
  print-first-page-number = ##f
}
rhA = {
  \autoLineBreaksOff
  \key c \minor \time 4/4 \tempo "Maestoso" 4 = 50  <c' c''>2-> <es' es''>4-> <d' d''>4-> |  % 1
     <g' b' d'' g''>2.-> r4\fermata |  % 2
     <as' c'' es'' as''>2-> <as' c'' f'' as''>4-> <as' b' d'' f''>4-> |  % 3
     <g' c'' es'' g''>1\fermata |  % 4
   \break \tempo "Allegro agitato" 4 = 96  \change Staff = "lh" c,,32 g,, c, es, g, c es g \change Staff = "rh" c' es' g' c'' es'' g'' c''' es''' g''' es''' c''' g'' es'' c'' g' es' c' \change Staff = "lh" g es c g, es, c, g,, \change Staff = "rh" |  % 5
   \break   \change Staff = "lh" f,,32 c, f, as, c f as \change Staff = "rh" c' f' as' c'' f'' as'' c''' f''' as''' fis''' es''' c''' a'' fis'' es'' c'' a' fis' es' c' \change Staff = "lh" a fis es c a, \change Staff = "rh" |  % 6
   \break   \change Staff = "lh" g,,32 c, es, g, c es g \change Staff = "rh" c' es' g' c'' es'' g'' c''' es''' g''' b''' g''' d''' b'' g'' d'' b' g' d' \change Staff = "lh" b g d b, g, d, b,, \change Staff = "rh" |  % 7
   \break   \ottava #1 <b'' d''' f''' g'''>16-> r <g'' b'' d''' f'''> r <f'' g'' b'' d'''> r <d'' f'' g'' b''> r \ottava #0 <b' d'' f'' g''> r <g' b' d'' f''> r <f' g' b' d''> r <d' f' g' b'> r |  % 8
  \cadenzaOn    r8 \change Staff = "lh" b,,32[ d, f, as,] b,[ d f as] \change Staff = "rh" b[ d' f' as'] b'[ d'' f'' as''] b''[ d''' f''' as'''] \cadenzaOff \bar "" |  % 9
  \cadenzaOn \set Score.currentBarNumber = #10  \break   g'''32[ ges''' f''' e''' es''' d''' des''' c'''] \bar "" b''[ bes'' a'' as'' g'' ges'' f'' e''] \bar "" es''[ d'' des'' c'' b' bes' a' as'] g'16[ f' es' d'] c'8[ b]\fermata \cadenzaOff \bar "||" |  % 10
  \set Score.currentBarNumber = #11 \time 3/4 \break \sectionLabel "Passacaglia" \tempo "Andante sostenuto" 4 = 63  R2. |  % 11
     R2. |  % 12
     R2. |  % 13
     R2. |  % 14
   \break   R2. |  % 15
     R2. |  % 16
     R2. |  % 17
     R2. |  % 18
   \break \sectionLabel "Var. 1"   r4 <g' c'' es''>2 |  % 19
     r4 <g' b' f''>2 |  % 20
     r4 <as' c'' es''>4 <as' c'' f''> |  % 21
     r4 <as' b' d'' f''>2 |  % 22
   \break   r4 <g' c'' es''>2 |  % 23
     r4 <f' as' c''>4 <es' a' c''> |  % 24
     r4 <es' g' c''>4 <d' g' b'> |  % 25
     r4 <d' f' b'>2 |  % 26
   \break \sectionLabel "Var. 2"   es''4.( d''8 c'' g' |  % 27
     b'4 c''8 d'' f''4) |  % 28
     es''4.( d''8 c''4 |  % 29
     b'8 d'' f''4 as'') |  % 30
   \break   g''4.( f''8 es'' c'' |  % 31
     f''8 as'' c'''4 es'') |  % 32
     es''2( d''4 |  % 33
     d''8 b' g' b' d'' f'') |  % 34
   \break \sectionLabel "Var. 3"   \tuplet 3/2 4 { g8 c' es' g' c'' es'' c'' g' es' } |  % 35
     \tuplet 3/2 4 { g8 b f' g' b' f'' b' g' f' } |  % 36
     \tuplet 3/2 4 { as8 c' es' as' c'' es'' c'' as' f' } |  % 37
     \tuplet 3/2 4 { as8 b d' as' b' d'' b' as' d' } |  % 38
   \break   \tuplet 3/2 4 { g8 c' es' g' c'' es'' c'' g' es' } |  % 39
     \tuplet 3/2 4 { f8 as c' f' as' c'' a' es' c' } |  % 40
     \tuplet 3/2 4 { es8 g c' es' g' c'' g' d' b } |  % 41
     \tuplet 3/2 4 { d8 f b d' f' b' f' d' b } |  % 42
   \break \sectionLabel "Var. 4"   g'16 es'' c'' es'' g'16 es'' c'' es'' g'16 es'' c'' es'' |  % 43
     g'16 f'' b' f'' g'16 f'' b' f'' g'16 f'' b' f'' |  % 44
     as'16 es'' c'' es'' as'16 es'' c'' es'' as'16 f'' c'' f'' |  % 45
     as'16 f'' d'' f'' as'16 f'' d'' f'' as'16 f'' d'' f'' |  % 46
   \break   g'16 es'' c'' es'' g'16 es'' c'' es'' g'16 es'' c'' es'' |  % 47
     f'16 c'' as' c'' f'16 c'' as' c'' es'16 c'' a' c'' |  % 48
     es'16 c'' g' c'' es'16 c'' g' c'' d'16 b' g' b' |  % 49
     d'16 b' f' b' d'16 b' f' b' d'16 b' f' b' |  % 50
   \break \sectionLabel "Var. 5"   <c'' g'' c'''>2-> <es'' g'' es'''>4-> |  % 51
     <d'' g'' d'''>2-> <g' d'' g''>4-> |  % 52
     <as' d'' f'' as''>2-> <f' as' d'' f''>4-> |  % 53
   \break   <b d' f' b'>2.-> |  % 54
     <c' es' g' c''>2-> <es' g' c'' es''>4-> |  % 55
     <f' as' c'' f''>2-> <fis' a' c'' es'' fis''>4-> |  % 56
   \break   <g' c'' es'' g''>2-> <g' b' d'' g''>4-> |  % 57
     <g' b' d'' f'' g''>2.-> |  % 58
  \bar "||" \key c \major \break \sectionLabel "Var. 6" \tempo "Poco più lento" 4 = 58  \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } |  % 59
     \tuplet 6/4 4 { d''16 f'' b'' d''' b'' f'' } \tuplet 6/4 4 { d''16 f'' b'' d''' b'' f'' } \tuplet 6/4 4 { d''16 f'' b'' d''' b'' f'' } |  % 60
     \tuplet 6/4 4 { e''16 a'' c''' e''' c''' a'' } \tuplet 6/4 4 { e''16 a'' c''' e''' c''' a'' } \tuplet 6/4 4 { f''16 a'' c''' f''' c''' a'' } |  % 61
   \break   \tuplet 6/4 4 { f''16 as'' b'' f''' b'' as'' } \tuplet 6/4 4 { f''16 as'' b'' f''' b'' as'' } \tuplet 6/4 4 { f''16 as'' b'' f''' b'' as'' } |  % 62
     \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } |  % 63
     \tuplet 6/4 4 { f''16 a'' c''' f''' c''' a'' } \tuplet 6/4 4 { f''16 a'' c''' f''' c''' a'' } \tuplet 6/4 4 { es''16 a'' c''' es''' c''' a'' } |  % 64
   \break   \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } \tuplet 6/4 4 { e''16 g'' c''' e''' c''' g'' } \tuplet 6/4 4 { d''16 g'' b'' d''' b'' g'' } |  % 65
     \tuplet 6/4 4 { d''16 f'' b'' d''' b'' f'' } \tuplet 6/4 4 { d''16 f'' b'' d''' b'' f'' } \tuplet 6/4 4 { d''16 f'' b'' d''' b'' f'' } |  % 66
  \bar "||" \key c \minor \break \sectionLabel "Var. 7" \tempo "Allegro" 4 = 80  <g' c'' es''>8-> q16 q <c'' es'' g''>8-> q16 q <es'' g'' c'''>8-> q16 q |  % 67
     <d'' f'' b''>8-> q16 q <b' d'' g''>8-> q16 q <g' b' f''>8-> q16 q |  % 68
     <as' c'' es''>8-> q16 q <c'' es'' as''>8-> q16 q <c'' f'' as''>8-> q16 q |  % 69
     <b' d'' as''>8-> q16 q <d'' f'' b''>8-> q16 q <f'' as'' d'''>8-> q16 q |  % 70
   \break   <es'' g'' c'''>8-> q16 q <c'' es'' g''>8-> q16 q <g' c'' es''>8-> q16 q |  % 71
     <f' as' c''>8-> q16 q <as' c'' f''>8-> q16 q <a' c'' es''>8-> q16 q |  % 72
     <g' c'' es''>8-> q16 q <c'' es'' g''>8-> q16 q <b' d'' g''>8-> q16 q |  % 73
     <b' d'' f''>8-> q16 q <d'' f'' b''>8-> q16 q <f'' b'' d'''>8-> q16 q |  % 74
   \break \sectionLabel "Var. 8"   \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } |  % 75
     \tuplet 6/4 4 { f'16 <b' d'' g''> f' <b' d'' g''> f' <b' d'' g''> } \tuplet 6/4 4 { f'16 <b' d'' g''> f' <b' d'' g''> f' <b' d'' g''> } \tuplet 6/4 4 { f'16 <b' d'' g''> f' <b' d'' g''> f' <b' d'' g''> } |  % 76
     \tuplet 6/4 4 { es'16 <as' c'' es''> es' <as' c'' es''> es' <as' c'' es''> } \tuplet 6/4 4 { es'16 <as' c'' es''> es' <as' c'' es''> es' <as' c'' es''> } \tuplet 6/4 4 { f'16 <as' c'' f''> f' <as' c'' f''> f' <as' c'' f''> } |  % 77
   \break   \tuplet 6/4 4 { as'16 <b' d'' f''> as' <b' d'' f''> as' <b' d'' f''> } \tuplet 6/4 4 { as'16 <b' d'' f''> as' <b' d'' f''> as' <b' d'' f''> } \tuplet 6/4 4 { as'16 <b' d'' f''> as' <b' d'' f''> as' <b' d'' f''> } |  % 78
     \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } |  % 79
     \tuplet 6/4 4 { f'16 <as' c'' f''> f' <as' c'' f''> f' <as' c'' f''> } \tuplet 6/4 4 { f'16 <as' c'' f''> f' <as' c'' f''> f' <as' c'' f''> } \tuplet 6/4 4 { es'16 <a' c'' es''> es' <a' c'' es''> es' <a' c'' es''> } |  % 80
   \break   \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } \tuplet 6/4 4 { g'16 <c'' es'' g''> g' <c'' es'' g''> g' <c'' es'' g''> } \tuplet 6/4 4 { g'16 <b' d'' g''> g' <b' d'' g''> g' <b' d'' g''> } |  % 81
     \tuplet 6/4 4 { f'16 <b' d'' g''> f' <b' d'' g''> f' <b' d'' g''> } \tuplet 6/4 4 { f'16 <b' d'' g''> f' <b' d'' g''> f' <b' d'' g''> } \tuplet 6/4 4 { f'16 <b' d'' g''> f' <b' d'' g''> f' <b' d'' g''> } |  % 82
   \break \sectionLabel "Var. 9" \tempo "Grandioso" 4 = 66  <g' c'' es'' g''>2-> <c'' es'' g'' c'''>4-> |  % 83
     <b' d'' f'' b''>2-> <f'' g'' b'' d'''>4-> |  % 84
     <c'' es'' as'' c'''>2-> <as' c'' f'' as''>4-> |  % 85
     <as' b' d'' f'' as''>2-> as''32 f'' d'' b' as' f' d' b |  % 86
   \break   <g' c'' es'' g''>2-> <c'' es'' g'' c'''>4-> |  % 87
     <f' as' c'' f''>2-> f'32 as' c'' f'' as'' c''' f''' as''' |  % 88
     <c'' es'' fis'' c'''>2.->\fermata |  % 89
  \cadenzaOn  \break   ges'''32[ es''' c''' as''] ges''[ es'' c'' as'] ges'[ es' c' \change Staff = "lh" as] ges[ es c as,] ges,[ es, c, as,,] \change Staff = "rh" \change Staff = "lh" as,,16[ es, ges, c] es[ ges \change Staff = "rh" c' es'] ges'4\fermata \cadenzaOff \bar "||" |  % 90
  \set Score.currentBarNumber = #91 \key des \major \time 4/4 \break \sectionLabel "Chorale" \tempo "Adagio religioso" 4 = 52 \voiceOne f''2 ges''4 f'' |  % 91
     es''2 as'' |  % 92
     bes''4. as''8 ges''4 f'' |  % 93
     es''1\fermata |  % 94
   \break   f''2 ges''4 as'' |  % 95
     bes''2 des''' |  % 96
     c'''4. bes''8 as''4 ges'' |  % 97
     f''4 es'' des''2\fermata |  % 98
   \break \tempo "Più mosso" 4 = 56 \oneVoice <f' as' des'' f''>2 <ges' bes' es'' ges''>4 <f' as' des'' f''> |  % 99
     <es' as' c'' es''>2 <as' des'' f'' as''> |  % 100
     <bes' des'' ges'' bes''>4. <as' as''>8 <ges' bes' es'' ges''>4 <f' bes' des'' f''> |  % 101
     <es' ges' c'' es''>1 |  % 102
   \break   <f' as' des'' f''>2 <ges' bes' es'' ges''>4 <as' des'' f'' as''> |  % 103
     <bes' des'' ges'' bes''>2 <des'' fes'' bes'' des'''> |  % 104
     <c'' es'' as'' c'''>4. <bes' bes''>8 <as' c'' es'' as''>4 <ges' c'' es'' ges''> |  % 105
     <f' as' des'' f''>4 <es' as' c'' es''> <des' f' as' des''>2 |  % 106
   \break \tempo "Adagio" 4 = 48 \voiceOne as''4( ges'' f''2) |  % 107
    \oneVoice <as' des'' f''>1 |  % 108
  \bar "||" \key c \minor   <g' b' f''>1\fermata |  % 109
  \time 4/4 \break \sectionLabel "Fuga" \tempo "Allegro energico" 4 = 100  c'4 es'8 d' g'4 as'8 f' |  % 110
     b8 c' es'16 f' fis' g' as' g' f' es' d'8 g |  % 111
    \voiceOne g'4 bes'8 a' d''4 es''8 c'' |  % 112
   \break   fis'8 g' bes'16 c'' cis'' d'' es'' d'' c'' bes' a'8 d' |  % 113
     g'8 bes'16 d'' es''8 c''16 g' as'8 f'16 d'' b'8 d''16 f'' |  % 114
     c''4 bes'8 as' g'4 f'8 as' |  % 115
   \break   f''8 es'' g'' c'''~ c'''4 as''8 g'' |  % 116
     es''16 d'' c'' es'' d''8 b' as''16 g'' f'' as'' g''8 e'' |  % 117
     d''16 c'' bes' d'' c''8 a' g''16 f'' es'' g'' f''8 d'' |  % 118
   \break   es''4 g''8 f'' bes''4 c'''8 as'' |  % 119
     d''8 es'' g''16 as'' a'' bes'' c''' bes'' as'' g'' f''8 bes' |  % 120
     es''8 g''16 f'' bes''8 g'' e''8 g''16 f'' c'''8 bes'' |  % 121
   \break  \oneVoice as'16 bes' des'' bes' c'' des'' bes' c'' as' bes' as' g' f' g' bes' des'' |  % 122
     c''8 as' f'' g'' f'' des'' bes' as' |  % 123
    \voiceOne f''8 as''16 g'' c'''8 as'' a''8 c'''16 bes'' es'''8 c''' |  % 124
   \break   d''8 es'' g'' fis'' g''4 c'''8 a'' |  % 125
     a''8 g''4 e'''8 es'''4 fis''8 g'' |  % 126
     d'''8 bes'' c''' g'' des''' as'' b'' d''' |  % 127
   \break \tempo "Grandioso" 4 = 76 \oneVoice <c' es' g' c''>4-> <es' g' es''>8 <d' f' d''> <g' c'' es'' g''>4-> <as' d'' as''>8 <f' as' f''> |  % 128
     <b d' b'>8-> <c' es' c''> <es' es''>16 <f' f''> <fis' fis''> <g' g''> <as' as''> <g' g''> <f' f''> <es' es''> <d' f' d''>8 <b d' b'> |  % 129
   \break   <d' g' b' d''>4-> <c' es' g' c''>-> <c' es' fis' c''>-> <b d' g' b'>-> |  % 130
     <g' b' d'' f'' g''>1\arpeggio\fermata |  % 131
  \bar "||" \key c \major \break \sectionLabel "Apoteosi" \tempo "Grandioso" 4 = 54  <e' g' c'' e''>2-> <f' a' d'' f''>4 <e' g' c'' e''> |  % 132
     <d' g' b' d''>2 <g' c'' e'' g''>2 |  % 133
   \break   <a' c'' f'' a''>4. <g' g''>8 <f' a' d'' f''>4 <e' a' c'' e''> |  % 134
     <d' f' b' d''>1 |  % 135
   \break   <e' g' c'' e''>2 <f' a' d'' f''>4 <g' c'' e'' g''> |  % 136
     <a' c'' f'' a''>2 <c'' es'' a'' c'''>2-> |  % 137
   \break   <b' d'' g'' b''>4. <a' a''>8 <g' b' d'' g''>4 <f' b' d'' f''> |  % 138
     <e' g' c'' e''>4 <d' g' b' d''> <c' e' g' c''>2 |  % 139
  \time 3/4 \break \sectionLabel "Coda" \tempo "Tempo I, maestoso" 4 = 60  <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 |  % 140
     <d'' g'' b'' d'''>8 <d'' g'' b'' d'''>8 <d'' g'' b'' d'''>8 <d'' g'' b'' d'''>8 <d'' g'' b'' d'''>8 <d'' g'' b'' d'''>8 |  % 141
     <e'' a'' c''' e'''>8 <e'' a'' c''' e'''>8 <e'' a'' c''' e'''>8 <e'' a'' c''' e'''>8 <f'' a'' c''' f'''>8 <f'' a'' c''' f'''>8 |  % 142
     <f'' as'' b'' d'''>8 <f'' as'' b'' d'''>8 <f'' as'' b'' d'''>8 <f'' as'' b'' d'''>8 <f'' as'' b'' d'''>8 <f'' as'' b'' d'''>8 |  % 143
   \break   <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 |  % 144
     <f'' a'' c''' f'''>8 <f'' a'' c''' f'''>8 <f'' a'' c''' f'''>8 <f'' a'' c''' f'''>8 <es'' fis'' a'' c'''>8 <es'' fis'' a'' c'''>8 |  % 145
     <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <e'' g'' c''' e'''>8 <d'' g'' b'' d'''>8 <d'' g'' b'' d'''>8 |  % 146
     <d'' f'' g'' b''>8 <d'' f'' g'' b''>8 <d'' f'' g'' b''>8 <d'' f'' g'' b''>8 <d'' f'' g'' b''>8 <d'' f'' g'' b''>8 |  % 147
   \break   <c'' e'' g'' c'''>2-> <e'' g'' c''' e'''>4-> |  % 148
     <d'' g'' b'' d'''>2-> <b' d'' g'' b''>4-> |  % 149
     <c'' e'' a'' c'''>2-> <c'' f'' as'' c'''>4-> |  % 150
     <b' d'' f'' g'' b''>2.-> |  % 151
     <c'' e'' g'' c'''>2.\arpeggio\fermata |  % 152
}

rhB = {
  s1 |  % 1
  s1 |  % 2
  s1 |  % 3
  s1 |  % 4
  s1 |  % 5
  s1 |  % 6
  s1 |  % 7
  s1 |  % 8
  s2. |  % 9
  s1*5/4 |  % 10
  s2. |  % 11
  s2. |  % 12
  s2. |  % 13
  s2. |  % 14
  s2. |  % 15
  s2. |  % 16
  s2. |  % 17
  s2. |  % 18
  s2. |  % 19
  s2. |  % 20
  s2. |  % 21
  s2. |  % 22
  s2. |  % 23
  s2. |  % 24
  s2. |  % 25
  s2. |  % 26
  s2. |  % 27
  s2. |  % 28
  s2. |  % 29
  s2. |  % 30
  s2. |  % 31
  s2. |  % 32
  s2. |  % 33
  s2. |  % 34
  s2. |  % 35
  s2. |  % 36
  s2. |  % 37
  s2. |  % 38
  s2. |  % 39
  s2. |  % 40
  s2. |  % 41
  s2. |  % 42
  s2. |  % 43
  s2. |  % 44
  s2. |  % 45
  s2. |  % 46
  s2. |  % 47
  s2. |  % 48
  s2. |  % 49
  s2. |  % 50
  s2. |  % 51
  s2. |  % 52
  s2. |  % 53
  s2. |  % 54
  s2. |  % 55
  s2. |  % 56
  s2. |  % 57
  s2. |  % 58
  s2. |  % 59
  s2. |  % 60
  s2. |  % 61
  s2. |  % 62
  s2. |  % 63
  s2. |  % 64
  s2. |  % 65
  s2. |  % 66
  s2. |  % 67
  s2. |  % 68
  s2. |  % 69
  s2. |  % 70
  s2. |  % 71
  s2. |  % 72
  s2. |  % 73
  s2. |  % 74
  s2. |  % 75
  s2. |  % 76
  s2. |  % 77
  s2. |  % 78
  s2. |  % 79
  s2. |  % 80
  s2. |  % 81
  s2. |  % 82
  s2. |  % 83
  s2. |  % 84
  s2. |  % 85
  s2. |  % 86
  s2. |  % 87
  s2. |  % 88
  s2. |  % 89
  s1*11/8 |  % 90
  \voiceTwo <as' des''>2 <bes' es''>4 <as' des''> |  % 91
  \voiceTwo <as' c''>2 <as' des''> |  % 92
  \voiceTwo <des'' ges''>2 <bes' es''>4 <bes' des''> |  % 93
  \voiceTwo <ges' c''>1 |  % 94
  \voiceTwo <f' des''>2 <bes' es''>4 <des'' f''> |  % 95
  \voiceTwo <des'' ges''>2 <fes'' bes''> |  % 96
  \voiceTwo <es'' as''>2 <c'' es''>4 q |  % 97
  \voiceTwo <as' des''>4 <as' c''> <f' as'>2 |  % 98
  s1 |  % 99
  s1 |  % 100
  s1 |  % 101
  s1 |  % 102
  s1 |  % 103
  s1 |  % 104
  s1 |  % 105
  s1 |  % 106
  \voiceTwo <des'' f''>4 <c'' es''> <as' des''>2 |  % 107
  s1 |  % 108
  s1 |  % 109
  s1 |  % 110
  s1 |  % 111
  \voiceTwo bes16 c' es' c' d' es' c' d' bes c' bes a g a c' es' |  % 112
  \voiceTwo d'8 bes g' a' g' es' c' bes |  % 113
  \voiceTwo bes8 d' c' es' f' d' g' f' |  % 114
  \voiceTwo es'16 f' as' f' g' as' f' g' es' f' es' d' c' d' f' as' |  % 115
  \voiceTwo g'8 es' c'' d'' c'' as' f' es' |  % 116
  \voiceTwo g'2 c'' |  % 117
  \voiceTwo f'2 bes' |  % 118
  \voiceTwo g'16 as' c'' as' bes' c'' as' bes' g' as' g' f' es' f' as' c'' |  % 119
  \voiceTwo bes'8 g' es'' f'' es'' c'' as' g' |  % 120
  \voiceTwo g'8 bes'16 as' g'8 es' g'8 c''16 bes' g'8 e' |  % 121
  s1 |  % 122
  s1 |  % 123
  \voiceTwo as'8 c''16 bes' as'8 f' c''8 es''16 d'' c''8 a' |  % 124
  \voiceTwo bes16 c' es' c' d' es' c' d' bes c' bes a g a c' es' |  % 125
  \voiceTwo d'8 bes g' a' g' es' c' bes |  % 126
  \voiceTwo d'8 g' g' es' as' f' f' d' |  % 127
  s1 |  % 128
  s1 |  % 129
  s1 |  % 130
  s1 |  % 131
  s1 |  % 132
  s1 |  % 133
  s1 |  % 134
  s1 |  % 135
  s1 |  % 136
  s1 |  % 137
  s1 |  % 138
  s1 |  % 139
  s2. |  % 140
  s2. |  % 141
  s2. |  % 142
  s2. |  % 143
  s2. |  % 144
  s2. |  % 145
  s2. |  % 146
  s2. |  % 147
  s2. |  % 148
  s2. |  % 149
  s2. |  % 150
  s2. |  % 151
  s2. |  % 152
}

rhC = {
  s1 |  % 1
  s1 |  % 2
  s1 |  % 3
  s1 |  % 4
  s1 |  % 5
  s1 |  % 6
  s1 |  % 7
  s1 |  % 8
  s2. |  % 9
  s1*5/4 |  % 10
  s2. |  % 11
  s2. |  % 12
  s2. |  % 13
  s2. |  % 14
  s2. |  % 15
  s2. |  % 16
  s2. |  % 17
  s2. |  % 18
  s2. |  % 19
  s2. |  % 20
  s2. |  % 21
  s2. |  % 22
  s2. |  % 23
  s2. |  % 24
  s2. |  % 25
  s2. |  % 26
  s2. |  % 27
  s2. |  % 28
  s2. |  % 29
  s2. |  % 30
  s2. |  % 31
  s2. |  % 32
  s2. |  % 33
  s2. |  % 34
  s2. |  % 35
  s2. |  % 36
  s2. |  % 37
  s2. |  % 38
  s2. |  % 39
  s2. |  % 40
  s2. |  % 41
  s2. |  % 42
  s2. |  % 43
  s2. |  % 44
  s2. |  % 45
  s2. |  % 46
  s2. |  % 47
  s2. |  % 48
  s2. |  % 49
  s2. |  % 50
  s2. |  % 51
  s2. |  % 52
  s2. |  % 53
  s2. |  % 54
  s2. |  % 55
  s2. |  % 56
  s2. |  % 57
  s2. |  % 58
  s2. |  % 59
  s2. |  % 60
  s2. |  % 61
  s2. |  % 62
  s2. |  % 63
  s2. |  % 64
  s2. |  % 65
  s2. |  % 66
  s2. |  % 67
  s2. |  % 68
  s2. |  % 69
  s2. |  % 70
  s2. |  % 71
  s2. |  % 72
  s2. |  % 73
  s2. |  % 74
  s2. |  % 75
  s2. |  % 76
  s2. |  % 77
  s2. |  % 78
  s2. |  % 79
  s2. |  % 80
  s2. |  % 81
  s2. |  % 82
  s2. |  % 83
  s2. |  % 84
  s2. |  % 85
  s2. |  % 86
  s2. |  % 87
  s2. |  % 88
  s2. |  % 89
  s1*11/8 |  % 90
  s1 |  % 91
  s1 |  % 92
  s1 |  % 93
  s1 |  % 94
  s1 |  % 95
  s1 |  % 96
  s1 |  % 97
  s1 |  % 98
  s1 |  % 99
  s1 |  % 100
  s1 |  % 101
  s1 |  % 102
  s1 |  % 103
  s1 |  % 104
  s1 |  % 105
  s1 |  % 106
  s1 |  % 107
  s1 |  % 108
  s1 |  % 109
  s1 |  % 110
  s1 |  % 111
  s1 |  % 112
  s1 |  % 113
  s1 |  % 114
  s1 |  % 115
  s1 |  % 116
  s1 |  % 117
  s1 |  % 118
  s1 |  % 119
  s1 |  % 120
  s1 |  % 121
  s1 |  % 122
  s1 |  % 123
  s1 |  % 124
  s1 |  % 125
  s1 |  % 126
  s1 |  % 127
  s1 |  % 128
  s1 |  % 129
  s1 |  % 130
  s1 |  % 131
  s1 |  % 132
  s1 |  % 133
  s1 |  % 134
  s1 |  % 135
  s1 |  % 136
  s1 |  % 137
  s1 |  % 138
  s1 |  % 139
  s2. |  % 140
  s2. |  % 141
  s2. |  % 142
  s2. |  % 143
  s2. |  % 144
  s2. |  % 145
  s2. |  % 146
  s2. |  % 147
  s2. |  % 148
  s2. |  % 149
  s2. |  % 150
  s2. |  % 151
  s2. |  % 152
}

lhA = {
  \key c \minor \time 4/4   <c,, c,>2-> <es,, es,>4-> <d,, d,>4-> |  % 1
     <g,, d, g,>2.-> r4\fermata |  % 2
     <as,, es, as,>2-> <f,, c, f,>4-> <b,,, b,,>4-> |  % 3
     <c,, g,, c,>1\fermata |  % 4
     s1 |  % 5
     s1 |  % 6
     s1 |  % 7
     \clef treble r16 <b d' f' g'> r <g b d' f'> r <f g b d'> r \clef bass <d f g b> r <b, d f g> r <g, b, d f> r <f, g, b, d> r <d, f, g, b,> |  % 8
  \cadenzaOn    <g,, g,>8-> s8 s2 \cadenzaOff \bar "" |  % 9
  \cadenzaOn \set Score.currentBarNumber = #10    s1 s4 \cadenzaOff \bar "||" |  % 10
  \set Score.currentBarNumber = #11 \time 3/4   <c c'>2 <es es'>4 |  % 11
     <d d'>2 <g, g>4 |  % 12
     <as, as>2 <f, f>4 |  % 13
     <b,, b,>2. |  % 14
     <c, c>2 <es, es>4 |  % 15
     <f, f>2 <fis, fis>4 |  % 16
     <g, g>2. |  % 17
     <g,, g,>2. |  % 18
     c2 es4 |  % 19
     d2 g,4 |  % 20
     as,2 f,4 |  % 21
     b,,2. |  % 22
     c,2 es,4 |  % 23
     f,2 fis,4 |  % 24
     g,2. |  % 25
     g,,2. |  % 26
     c8 g c' g es g |  % 27
     d8 g b g g, f |  % 28
     as,8 es as es f, c |  % 29
     b,,8 as, d f as f |  % 30
     c,8 g, c g, es, g, |  % 31
     f,8 c as c fis, es |  % 32
     g,8 c es c g, b, |  % 33
     g,,8 d, g, b, d f |  % 34
     c2 es4 |  % 35
     d2 g,4 |  % 36
     as,2 f,4 |  % 37
     b,,2. |  % 38
     c,2 es,4 |  % 39
     f,2 fis,4 |  % 40
     g,2. |  % 41
     g,,2. |  % 42
     <c, c>4-. <c, c>4-. <es, es>4-. |  % 43
     <d, d>4-. <d, d>4-. <g,, g,>4-. |  % 44
     <as,, as,>4-. <as,, as,>4-. <f,, f,>4-. |  % 45
     <b,,, b,,>4-. <b,,, b,,>4-. <b,,, b,,>4-. |  % 46
     <c,, c,>4-. <c,, c,>4-. <es,, es,>4-. |  % 47
     <f,, f,>4-. <f,, f,>4-. <fis,, fis,>4-. |  % 48
     <g,, g,>4-. <g,, g,>4-. <g,, g,>4-. |  % 49
     <g,, g,>4-. <g,, g,>4-. <g,, g,>4-. |  % 50
     \tuplet 6/4 4 { c,16 g, c es c g, } \tuplet 6/4 4 { c,16 g, c es c g, } \tuplet 6/4 4 { c,16 g, c es c g, } |  % 51
     \tuplet 6/4 4 { b,,16 g, d g d g, } \tuplet 6/4 4 { b,,16 g, d g d g, } \tuplet 6/4 4 { b,,16 g, d g d g, } |  % 52
     \tuplet 6/4 4 { bes,,16 f, as, d as, f, } \tuplet 6/4 4 { bes,,16 f, as, d as, f, } \tuplet 6/4 4 { bes,,16 f, as, d as, f, } |  % 53
     \tuplet 6/4 4 { as,,16 f, b, d b, f, } \tuplet 6/4 4 { as,,16 f, b, d b, f, } \tuplet 6/4 4 { as,,16 f, b, d b, f, } |  % 54
     \tuplet 6/4 4 { g,,16 es, g, c g, es, } \tuplet 6/4 4 { g,,16 es, g, c g, es, } \tuplet 6/4 4 { g,,16 es, g, c g, es, } |  % 55
     \tuplet 6/4 4 { as,,16 f, as, c as, f, } \tuplet 6/4 4 { as,,16 f, as, c as, f, } \tuplet 6/4 4 { a,,16 es, fis, c fis, es, } |  % 56
     \tuplet 6/4 4 { g,,16 es, g, c g, es, } \tuplet 6/4 4 { g,,16 es, g, c g, es, } \tuplet 6/4 4 { g,,16 d, g, b, g, d, } |  % 57
     \tuplet 6/4 4 { g,,16 d, f, b, f, d, } \tuplet 6/4 4 { g,,16 d, f, b, f, d, } \tuplet 6/4 4 { g,,16 d, f, b, f, d, } |  % 58
  \bar "||" \key c \major   <c c'>2 <e e'>4 |  % 59
     <d d'>2 <g, g>4 |  % 60
     <a, a>2 <f, f>4 |  % 61
     <b,, b,>2. |  % 62
     <c, c>2 <e, e>4 |  % 63
     <f, f>2 <fis, fis>4 |  % 64
     <g, g>2. |  % 65
     <g,, g,>2. |  % 66
  \bar "||" \key c \minor   <c, c>8 q16 q <c, c>8 q16 q <es, es>8 q16 q |  % 67
     <d, d>8 q16 q <d, d>8 q16 q <g,, g,>8 q16 q |  % 68
     <as,, as,>8 q16 q <as,, as,>8 q16 q <f,, f,>8 q16 q |  % 69
     <b,,, b,,>8 q16 q <b,,, b,,>8 q16 q <b,,, b,,>8 q16 q |  % 70
     <c,, c,>8 q16 q <c,, c,>8 q16 q <es,, es,>8 q16 q |  % 71
     <f,, f,>8 q16 q <f,, f,>8 q16 q <fis,, fis,>8 q16 q |  % 72
     <g,, g,>8 q16 q <g,, g,>8 q16 q <g,, g,>8 q16 q |  % 73
     <g,, g,>8 q16 q <g,, g,>8 q16 q <g,, g,>8 q16 q |  % 74
     <c, c>4 g,16 f, es, d, <es, es>4 |  % 75
     <d, d>4 d16 c b, a, <g,, g,>4 |  % 76
     <as,, as,>4 as,16 g, f, es, <f,, f,>4 |  % 77
     <b,,, b,,>4 b,,16 d, f, as, <b,, b,>4 |  % 78
     <c,, c,>4 g,,16 f,, es,, d,, <es,, es,>4 |  % 79
     <f,, f,>4 f,16 es, d, c, <fis,, fis,>4 |  % 80
     <g,, g,>4 g,16 as, g, fis, <g,, g,>4 |  % 81
     <g,, g,>4 g,,16 b,, d, f, <g, g>4 |  % 82
     <c,, g,, c,>2 <es,, g,, es,>4 |  % 83
     <d,, d,>2 <g,, d, g,>4 |  % 84
     <as,, es, as,>2 <f,, c, f,>4 |  % 85
     <b,,, f,, b,,>2. |  % 86
     <c,, g,, c,>2 <es,, g,, es,>4 |  % 87
     <f,, c, f,>2. |  % 88
     <as,, es, as,>2.\fermata |  % 89
  \cadenzaOn    s1 s4. \cadenzaOff \bar "||" |  % 90
  \set Score.currentBarNumber = #91 \key des \major \time 4/4   <des, des>2 <es, es>4 <f, f> |  % 91
     <ges, ges>2 <f, f> |  % 92
     <ges, ges>2 <es, es>4 <bes,, bes,> |  % 93
     <as,, as,>1\fermata |  % 94
     <des, des>2 <es, es>4 <f, f> |  % 95
     <ges, ges>2 <g, g> |  % 96
     <as,, as,>1 |  % 97
     <des, des>1\fermata |  % 98
     \tuplet 3/2 4 { des,8 as, f des, as, f es, bes, ges f, des as } |  % 99
     \tuplet 3/2 4 { ges,8 c es ges, c es f, des as f, des as } |  % 100
     \tuplet 3/2 4 { ges,8 des bes ges, des bes es, bes, ges bes,, f, des } |  % 101
     \tuplet 3/2 4 { as,,8 es, c as, es ges as,, es, c as, es ges } |  % 102
     \tuplet 3/2 4 { des,8 as, f des, as, f es, bes, ges f, des as } |  % 103
     \tuplet 3/2 4 { ges,8 des bes ges, des bes g, des fes g, des fes } |  % 104
     \tuplet 3/2 4 { as,,8 es, c as,, es, c as,, ges, c as,, ges, c } |  % 105
     \tuplet 3/2 4 { des,8 as, f des, as, f des, as, f des, as, f } |  % 106
     <des, des>1 |  % 107
     <f, f>1 |  % 108
  \bar "||" \key c \minor   <g,, d, g,>1\fermata |  % 109
  \time 4/4 \clef bass  R1 |  % 110
     R1 |  % 111
     R1 |  % 112
     R1 |  % 113
     R1 |  % 114
     c4 es8 d g4 as8 f |  % 115
     b,8 c es16 f fis g as g f es d8 g, |  % 116
     c8 es d g, f as g c |  % 117
     bes,8 d c f, es g f bes, |  % 118
     es8 as, bes, d es g as f |  % 119
     bes,8 es c a, as,4 bes,8 g, |  % 120
     <es, es>4 q <e, e> q |  % 121
    \voiceOne f4 as8 g c'4 des'8 bes |  % 122
     e8 f as16 bes b c' des' c' bes as g8 c |  % 123
    \oneVoice <f, f>4 q <fis, fis> q |  % 124
     g,4 bes,8 a, d4 es8 c |  % 125
     fis,8 g, bes,16 c cis d es d c bes, a,8 d, |  % 126
     g,8 bes, es c f, as, g, g,, |  % 127
     <c, g, c>2-> <es, g, es>4-> <d, as, d>-> |  % 128
     <g, d g>2-> <as, c as>4-> <f, d f>-> |  % 129
     <b,, b,>4-> <c, c>-> <as,, as,>-> <g,, g,>-> |  % 130
     <g,, d, g,>1\arpeggio\fermata |  % 131
  \bar "||" \key c \major   \tuplet 6/4 4 { c,16 g, c e c g, } \tuplet 6/4 4 { c,16 g, c e c g, } \tuplet 6/4 4 { d,16 a, d f d a, } \tuplet 6/4 4 { e,16 g, c e c g, } |  % 132
     \tuplet 6/4 4 { f,16 g, b, d b, g, } \tuplet 6/4 4 { f,16 g, b, d b, g, } \tuplet 6/4 4 { e,16 g, c e c g, } \tuplet 6/4 4 { e,16 g, c e c g, } |  % 133
     \tuplet 6/4 4 { f,16 c f a f c } \tuplet 6/4 4 { f,16 c f a f c } \tuplet 6/4 4 { d,16 a, d f d a, } \tuplet 6/4 4 { a,,16 e, a, c a, e, } |  % 134
     \tuplet 6/4 4 { g,,16 d, g, b, g, d, } \tuplet 6/4 4 { g,,16 d, g, b, g, d, } \tuplet 6/4 4 { g,,16 f, b, d b, f, } \tuplet 6/4 4 { g,,16 f, b, d b, f, } |  % 135
     \tuplet 6/4 4 { c,16 g, c e c g, } \tuplet 6/4 4 { c,16 g, c e c g, } \tuplet 6/4 4 { d,16 a, d f d a, } \tuplet 6/4 4 { e,16 g, c e c g, } |  % 136
     \tuplet 6/4 4 { f,16 c f a f c } \tuplet 6/4 4 { f,16 c f a f c } \tuplet 6/4 4 { fis,16 c es a es c } \tuplet 6/4 4 { fis,16 c es a es c } |  % 137
     \tuplet 6/4 4 { g,,16 d, g, b, g, d, } \tuplet 6/4 4 { g,,16 d, g, b, g, d, } \tuplet 6/4 4 { g,,16 d, g, b, g, d, } \tuplet 6/4 4 { g,,16 f, b, d b, f, } |  % 138
     \tuplet 6/4 4 { c,16 g, c e c g, } \tuplet 6/4 4 { g,,16 d, g, b, g, d, } <c,, c,>2 |  % 139
  \time 3/4   <c, c>2 <e, e>4 |  % 140
     <d, d>2 <g,, g,>4 |  % 141
     <a,, a,>2 <f,, f,>4 |  % 142
     <b,,, b,,>2. |  % 143
     <c,, c,>2 <e,, e,>4 |  % 144
     <f,, f,>2 <fis,, fis,>4 |  % 145
     <g,, g,>2. |  % 146
     <g,, g,>2. |  % 147
     <c,, g,, c,>2-> <e,, g,, e,>4-> |  % 148
     <d,, d,>2-> <g,, d, g,>4-> |  % 149
     <a,, e, a,>2-> <f,, c, f,>4-> |  % 150
     <b,,, b,,>2.-> |  % 151
     <c,, g,, c,>2.\arpeggio\fermata |  % 152
}

lhB = {
  s1 |  % 1
  s1 |  % 2
  s1 |  % 3
  s1 |  % 4
  s1 |  % 5
  s1 |  % 6
  s1 |  % 7
  s1 |  % 8
  s2. |  % 9
  s1*5/4 |  % 10
  s2. |  % 11
  s2. |  % 12
  s2. |  % 13
  s2. |  % 14
  s2. |  % 15
  s2. |  % 16
  s2. |  % 17
  s2. |  % 18
  s2. |  % 19
  s2. |  % 20
  s2. |  % 21
  s2. |  % 22
  s2. |  % 23
  s2. |  % 24
  s2. |  % 25
  s2. |  % 26
  s2. |  % 27
  s2. |  % 28
  s2. |  % 29
  s2. |  % 30
  s2. |  % 31
  s2. |  % 32
  s2. |  % 33
  s2. |  % 34
  s2. |  % 35
  s2. |  % 36
  s2. |  % 37
  s2. |  % 38
  s2. |  % 39
  s2. |  % 40
  s2. |  % 41
  s2. |  % 42
  s2. |  % 43
  s2. |  % 44
  s2. |  % 45
  s2. |  % 46
  s2. |  % 47
  s2. |  % 48
  s2. |  % 49
  s2. |  % 50
  s2. |  % 51
  s2. |  % 52
  s2. |  % 53
  s2. |  % 54
  s2. |  % 55
  s2. |  % 56
  s2. |  % 57
  s2. |  % 58
  s2. |  % 59
  s2. |  % 60
  s2. |  % 61
  s2. |  % 62
  s2. |  % 63
  s2. |  % 64
  s2. |  % 65
  s2. |  % 66
  s2. |  % 67
  s2. |  % 68
  s2. |  % 69
  s2. |  % 70
  s2. |  % 71
  s2. |  % 72
  s2. |  % 73
  s2. |  % 74
  s2. |  % 75
  s2. |  % 76
  s2. |  % 77
  s2. |  % 78
  s2. |  % 79
  s2. |  % 80
  s2. |  % 81
  s2. |  % 82
  s2. |  % 83
  s2. |  % 84
  s2. |  % 85
  s2. |  % 86
  s2. |  % 87
  s2. |  % 88
  s2. |  % 89
  s1*11/8 |  % 90
  s1 |  % 91
  s1 |  % 92
  s1 |  % 93
  s1 |  % 94
  s1 |  % 95
  s1 |  % 96
  s1 |  % 97
  s1 |  % 98
  s1 |  % 99
  s1 |  % 100
  s1 |  % 101
  s1 |  % 102
  s1 |  % 103
  s1 |  % 104
  s1 |  % 105
  s1 |  % 106
  s1 |  % 107
  s1 |  % 108
  s1 |  % 109
  s1 |  % 110
  s1 |  % 111
  s1 |  % 112
  s1 |  % 113
  s1 |  % 114
  s1 |  % 115
  s1 |  % 116
  s1 |  % 117
  s1 |  % 118
  s1 |  % 119
  s1 |  % 120
  s1 |  % 121
  \voiceTwo f,8 des, f, e, f,4 bes,,8 g,, |  % 122
  \voiceTwo c,8 f,4 d,8 f, g,, c, as,, |  % 123
  s1 |  % 124
  s1 |  % 125
  s1 |  % 126
  s1 |  % 127
  s1 |  % 128
  s1 |  % 129
  s1 |  % 130
  s1 |  % 131
  s1 |  % 132
  s1 |  % 133
  s1 |  % 134
  s1 |  % 135
  s1 |  % 136
  s1 |  % 137
  s1 |  % 138
  s1 |  % 139
  s2. |  % 140
  s2. |  % 141
  s2. |  % 142
  s2. |  % 143
  s2. |  % 144
  s2. |  % 145
  s2. |  % 146
  s2. |  % 147
  s2. |  % 148
  s2. |  % 149
  s2. |  % 150
  s2. |  % 151
  s2. |  % 152
}

lhC = {
  s1 |  % 1
  s1 |  % 2
  s1 |  % 3
  s1 |  % 4
  s1 |  % 5
  s1 |  % 6
  s1 |  % 7
  s1 |  % 8
  s2. |  % 9
  s1*5/4 |  % 10
  s2. |  % 11
  s2. |  % 12
  s2. |  % 13
  s2. |  % 14
  s2. |  % 15
  s2. |  % 16
  s2. |  % 17
  s2. |  % 18
  s2. |  % 19
  s2. |  % 20
  s2. |  % 21
  s2. |  % 22
  s2. |  % 23
  s2. |  % 24
  s2. |  % 25
  s2. |  % 26
  s2. |  % 27
  s2. |  % 28
  s2. |  % 29
  s2. |  % 30
  s2. |  % 31
  s2. |  % 32
  s2. |  % 33
  s2. |  % 34
  s2. |  % 35
  s2. |  % 36
  s2. |  % 37
  s2. |  % 38
  s2. |  % 39
  s2. |  % 40
  s2. |  % 41
  s2. |  % 42
  s2. |  % 43
  s2. |  % 44
  s2. |  % 45
  s2. |  % 46
  s2. |  % 47
  s2. |  % 48
  s2. |  % 49
  s2. |  % 50
  s2. |  % 51
  s2. |  % 52
  s2. |  % 53
  s2. |  % 54
  s2. |  % 55
  s2. |  % 56
  s2. |  % 57
  s2. |  % 58
  s2. |  % 59
  s2. |  % 60
  s2. |  % 61
  s2. |  % 62
  s2. |  % 63
  s2. |  % 64
  s2. |  % 65
  s2. |  % 66
  s2. |  % 67
  s2. |  % 68
  s2. |  % 69
  s2. |  % 70
  s2. |  % 71
  s2. |  % 72
  s2. |  % 73
  s2. |  % 74
  s2. |  % 75
  s2. |  % 76
  s2. |  % 77
  s2. |  % 78
  s2. |  % 79
  s2. |  % 80
  s2. |  % 81
  s2. |  % 82
  s2. |  % 83
  s2. |  % 84
  s2. |  % 85
  s2. |  % 86
  s2. |  % 87
  s2. |  % 88
  s2. |  % 89
  s1*11/8 |  % 90
  s1 |  % 91
  s1 |  % 92
  s1 |  % 93
  s1 |  % 94
  s1 |  % 95
  s1 |  % 96
  s1 |  % 97
  s1 |  % 98
  s1 |  % 99
  s1 |  % 100
  s1 |  % 101
  s1 |  % 102
  s1 |  % 103
  s1 |  % 104
  s1 |  % 105
  s1 |  % 106
  s1 |  % 107
  s1 |  % 108
  s1 |  % 109
  s1 |  % 110
  s1 |  % 111
  s1 |  % 112
  s1 |  % 113
  s1 |  % 114
  s1 |  % 115
  s1 |  % 116
  s1 |  % 117
  s1 |  % 118
  s1 |  % 119
  s1 |  % 120
  s1 |  % 121
  s1 |  % 122
  s1 |  % 123
  s1 |  % 124
  s1 |  % 125
  s1 |  % 126
  s1 |  % 127
  s1 |  % 128
  s1 |  % 129
  s1 |  % 130
  s1 |  % 131
  s1 |  % 132
  s1 |  % 133
  s1 |  % 134
  s1 |  % 135
  s1 |  % 136
  s1 |  % 137
  s1 |  % 138
  s1 |  % 139
  s2. |  % 140
  s2. |  % 141
  s2. |  % 142
  s2. |  % 143
  s2. |  % 144
  s2. |  % 145
  s2. |  % 146
  s2. |  % 147
  s2. |  % 148
  s2. |  % 149
  s2. |  % 150
  s2. |  % 151
  s2. |  % 152
}

dyn = {
  s1\fff |  % 1
  s1 |  % 2
  s1 |  % 3
  s1\ff |  % 4
  s1\p\< |  % 5
  s1 |  % 6
  s2\f\< s2 |  % 7
  s1\fff |  % 8
  s8\sffz s8 s2 |  % 9
  s1\> s4\pp |  % 10
  s2.\pp-\markup { \italic "sotto voce, legatissimo" } |  % 11
  s2. |  % 12
  s4 s2\< |  % 13
  s2.\p\> |  % 14
  s2.\pp |  % 15
  s4 s2\< |  % 16
  s2.\p\> |  % 17
  s2.\pp |  % 18
  s2.\p-\markup { \italic "dolce" } |  % 19
  s2. |  % 20
  s4 s2\< |  % 21
  s2.\mp\> |  % 22
  s2.\p |  % 23
  s4 s2\< |  % 24
  s4\mp\> s2 |  % 25
  s2.\p |  % 26
  s2.\p-\markup { \italic "cantabile" } |  % 27
  s4 s2\< |  % 28
  s2.\mp\> |  % 29
  s2 s4\< |  % 30
  s2.\mf\> |  % 31
  s4\mp s2\< |  % 32
  s2.\mf\> |  % 33
  s2.\mp |  % 34
  s2.\mp-\markup { \italic "scorrevole" } |  % 35
  s2. |  % 36
  s4 s2\< |  % 37
  s2.\mf\> |  % 38
  s2.\mp |  % 39
  s4 s2\< |  % 40
  s2.\mf |  % 41
  s2.\> |  % 42
  s2.\mf-\markup { \italic "energico" } |  % 43
  s2. |  % 44
  s4 s2\< |  % 45
  s2.\f |  % 46
  s2.\mf |  % 47
  s4 s2\< |  % 48
  s2.\f |  % 49
  s2. |  % 50
  s2.\f-\markup { \italic "maestoso, il tema nel soprano" } |  % 51
  s2. |  % 52
  s4 s2\< |  % 53
  s2.\ff |  % 54
  s2.\f |  % 55
  s4 s2\< |  % 56
  s2.\ff |  % 57
  s2.\> |  % 58
  s2.\pp-\markup { \italic "dolcissimo, luminoso" } |  % 59
  s2. |  % 60
  s4 s2\< |  % 61
  s2.\p\> |  % 62
  s2.\pp |  % 63
  s4 s2\< |  % 64
  s2.\p\> |  % 65
  s2.\pp |  % 66
  s2.\f-\markup { \italic "con fuoco" } |  % 67
  s2. |  % 68
  s4 s2\< |  % 69
  s2.\ff |  % 70
  s2.\f |  % 71
  s4 s2\< |  % 72
  s2.\ff |  % 73
  s2. |  % 74
  s2.\ff-\markup { \italic "tempestoso" } |  % 75
  s2. |  % 76
  s4 s2\< |  % 77
  s2.\fff |  % 78
  s2.\ff |  % 79
  s4 s2\< |  % 80
  s2.\fff |  % 81
  s2.\ff |  % 82
  s2.\fff-\markup { \italic "grandioso" } |  % 83
  s2. |  % 84
  s2. |  % 85
  s2. |  % 86
  s2. |  % 87
  s2 s4\< |  % 88
  s2.\sffz |  % 89
  s1*5/8\ff\> s2 s4\pp |  % 90
  s1\p-\markup { \italic "dolce, religioso" } |  % 91
  s1 |  % 92
  s2\< s2 |  % 93
  s1\mp |  % 94
  s1\p |  % 95
  s2\< s2\mf |  % 96
  s2\> s2 |  % 97
  s1\p |  % 98
  s1\mf-\markup { \italic "con anima" } |  % 99
  s1\< |  % 100
  s1\f |  % 101
  s1\mf\< |  % 102
  s2 s2\f\< |  % 103
  s2\ff s2 |  % 104
  s2\f\> s2 |  % 105
  s2\mf\> s2\p |  % 106
  s1\pp-\markup { \italic "lontano" } |  % 107
  s1 |  % 108
  s1\ppp |  % 109
  s1\mp-\markup { \italic "marcato" } |  % 110
  s1 |  % 111
  s1 |  % 112
  s1 |  % 113
  s1\< |  % 114
  s1\mf |  % 115
  s1 |  % 116
  s1\< |  % 117
  s2\f s2\> |  % 118
  s1\mf |  % 119
  s2\< s2 |  % 120
  s1\f |  % 121
  s1\mf-\markup { \italic "il soggetto nel tenore" } |  % 122
  s2 s2\< |  % 123
  s1\f\< |  % 124
  s1\ff |  % 125
  s1 |  % 126
  s2 s2\< |  % 127
  s1\fff-\markup { \italic "grandioso: il soggetto e la sua aumentazione" } |  % 128
  s1 |  % 129
  s1 |  % 130
  s1\sffz |  % 131
  s1\fff-\markup { \italic "trionfale" } |  % 132
  s1 |  % 133
  s1 |  % 134
  s1\ff |  % 135
  s2\ff\< s2 |  % 136
  s2 s2\fff |  % 137
  s1\ff |  % 138
  s2 s2\fff |  % 139
  s2.\ff-\markup { \italic "campane" } |  % 140
  s2. |  % 141
  s4 s2\< |  % 142
  s2.\fff |  % 143
  s2.\ff |  % 144
  s4 s2\< |  % 145
  s2.\fff |  % 146
  s2. |  % 147
  s2.\fff-\markup { \italic "allargando" } |  % 148
  s2. |  % 149
  s2. |  % 150
  s2. |  % 151
  s2.\fff |  % 152
}

ped = {
  s2\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 1
  s1\sustainOff\sustainOn |  % 2
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 3
  s1\sustainOff\sustainOn |  % 4
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 5
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 6
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 7
  s1\sustainOff\sustainOn |  % 8
  s2.\sustainOff\sustainOn |  % 9
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 10
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 11
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 12
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 13
  s2.\sustainOff\sustainOn |  % 14
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 15
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 16
  s2.\sustainOff\sustainOn |  % 17
  s2.\sustainOff\sustainOn |  % 18
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 19
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 20
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 21
  s2.\sustainOff\sustainOn |  % 22
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 23
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 24
  s2.\sustainOff\sustainOn |  % 25
  s2.\sustainOff\sustainOn |  % 26
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 27
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 28
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 29
  s2.\sustainOff\sustainOn |  % 30
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 31
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 32
  s2.\sustainOff\sustainOn |  % 33
  s2.\sustainOff\sustainOn |  % 34
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 35
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 36
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 37
  s2.\sustainOff\sustainOn |  % 38
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 39
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 40
  s2.\sustainOff\sustainOn |  % 41
  s2.\sustainOff\sustainOn |  % 42
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 43
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 44
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 45
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 46
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 47
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 48
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 49
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 50
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 51
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 52
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 53
  s2.\sustainOff\sustainOn |  % 54
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 55
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 56
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 57
  s2.\sustainOff\sustainOn |  % 58
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 59
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 60
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 61
  s2.\sustainOff\sustainOn |  % 62
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 63
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 64
  s2.\sustainOff\sustainOn |  % 65
  s2.\sustainOff\sustainOn |  % 66
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 67
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 68
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 69
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 70
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 71
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 72
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 73
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 74
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 75
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 76
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 77
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 78
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 79
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 80
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 81
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 82
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 83
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 84
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 85
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 86
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 87
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 88
  s2.\sustainOff\sustainOn |  % 89
  s1*5/8\sustainOff\sustainOn s2 s4 |  % 90
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 91
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 92
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 93
  s1\sustainOff\sustainOn |  % 94
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 95
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 96
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 97
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 98
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 99
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 100
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 101
  s1\sustainOff\sustainOn |  % 102
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 103
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 104
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 105
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 106
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 107
  s1\sustainOff\sustainOn |  % 108
  s1\sustainOff\sustainOn |  % 109
  s1\sustainOff |  % 110
  s1 |  % 111
  s1 |  % 112
  s1 |  % 113
  s1 |  % 114
  s1 |  % 115
  s1 |  % 116
  s1 |  % 117
  s1 |  % 118
  s1 |  % 119
  s1 |  % 120
  s1 |  % 121
  s1 |  % 122
  s1 |  % 123
  s1 |  % 124
  s1 |  % 125
  s1 |  % 126
  s1 |  % 127
  s2\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 128
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 129
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 130
  s1\sustainOff\sustainOn |  % 131
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 132
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 133
  s4.\sustainOff\sustainOn s8 s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 134
  s1\sustainOff\sustainOn |  % 135
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 136
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 137
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 138
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 139
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 140
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 141
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 142
  s2.\sustainOff\sustainOn |  % 143
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 144
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 145
  s2.\sustainOff\sustainOn |  % 146
  s2.\sustainOff\sustainOn |  % 147
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 148
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 149
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 150
  s2.\sustainOff\sustainOn |  % 151
  s2.\sustainOff\sustainOn |  % 152
}

\score {
  \removeWithTag #'midi
  \new PianoStaff <<
    \new Staff = "rh" \with { \consists "Merge_rests_engraver" } <<
      \new Voice = "rhA" { \rhA }
      \new Voice = "rhB" { \rhB }
      \new Voice = "rhC" { \rhC }
    >>
    \new Dynamics \dyn
    \new Staff = "lh" \with { \consists "Merge_rests_engraver" } <<
      \new Voice = "lhA" { \clef bass \lhA }
      \new Voice = "lhB" { \lhB }
      \new Voice = "lhC" { \lhC }
    >>
    \new Dynamics \with { pedalSustainStyle = #'mixed } \ped
  >>
  \layout {
    \context { \PianoStaff \consists "Span_arpeggio_engraver" connectArpeggios = ##t }
    \context { \Score \override SpacingSpanner.common-shortest-duration = #(ly:make-moment 1/10) }
    \context { \Voice \override TupletBracket.bracket-visibility = #'if-no-beam }
    \context { \Voice \override Stem.details.beamed-extreme-minimum-free-lengths = #'(0.5 0.5) }
  }
}

\score {
  \removeWithTag #'layout
  \unfoldRepeats
  \new PianoStaff <<
    \new Staff = "rh" \with { \consists "Merge_rests_engraver" } <<
      \new Voice = "rhA" { \rhA }
      \new Voice = "rhB" { \rhB }
      \new Voice = "rhC" { \rhC }
    >>
    \new Dynamics \dyn
    \new Staff = "lh" \with { \consists "Merge_rests_engraver" } <<
      \new Voice = "lhA" { \clef bass \lhA }
      \new Voice = "lhB" { \lhB }
      \new Voice = "lhC" { \lhC }
    >>
    \new Dynamics \with { pedalSustainStyle = #'mixed } \ped
  >>
  \midi {
    \context { \Staff \remove "Staff_performer" }
    \context { \Voice \consists "Staff_performer" }
    \context { \Score midiMinimumVolume = #0.7 midiMaximumVolume = #0.7 }
  }
}
