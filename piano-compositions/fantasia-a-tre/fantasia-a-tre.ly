\version "2.24.0"
#(set-global-staff-size 18)
sffz = #(make-dynamic-script "sffz")

\header {
  title = "Fantasia a tre"
  subtitle = "in F minor"
  subsubtitle = "for piano, after Mozart, Chopin and Liszt"
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
  \key f \minor \time 4/4 \tempo "Lento misterioso" 4 = 46  c'2 f'4. as'8 |  % 1
     des''2 c''2\fermata |  % 2
     <e' g' bes'>2 <f' as'>2\fermata |  % 3
   \break  \voiceOne gis'2 cis''4. e''8 |  % 4
     a''2 gis''4 fis'' |  % 5
     e''1 |  % 6
   \break  \oneVoice \repeat tremolo 8 { <gis' e''>32 b'32 } \repeat tremolo 8 { <a' e''>32 c''32 } |  % 7
     \repeat tremolo 8 { <a' dis''>32 c''32 } \repeat tremolo 4 { <a' e''>32 c''32 } \repeat tremolo 4 { <gis' d''>32 b'32 } |  % 8
     \repeat tremolo 8 { a'32 c''32 } \repeat tremolo 8 { as'32 c''32 } |  % 9
   \break   <bes' des'' f''>16-> q q q q16 q q q <b' des'' f'' as''>16-> q q q q16 q q q |  % 10
     <c'' f'' as''>16-> q q q q16 q q q <bes' c'' e'' g''>16-> q q q q16 q q q |  % 11
  \cadenzaOn  \break   <e' g' bes' des''>4->\fermata des'''32[ bes'' g'' e''] des''[ bes' g' e'] des'[ \change Staff = "lh" bes g e] des[ bes, g, e,\fermata] \change Staff = "rh" \cadenzaOff \bar "" |  % 12
  \cadenzaOn \set Score.currentBarNumber = #13    c''8([ des'' c'' bes'] as'[ g' f' e']) g'4\fermata \cadenzaOff \bar "||" |  % 13
  \set Score.currentBarNumber = #14 \time 6/8 \partial 8 \break \sectionLabel \markup { \concat { \bold "Ballata" \hspace #12 } } \tempo "Andante con moto" 4. = 46  c'8 |  % 14
     f'4( as'8 des''4 c''8) |  % 15
     c''8( bes' as' g'4 f'8) |  % 16
     e'4( f'8 g' as' bes') |  % 17
     as'4( g'8 e'4) c'8 |  % 18
   \break   f'4( as'8 des''4 c''8) |  % 19
     f''4( es''8 des''4 c''8 |  % 20
     des''8 c'' bes' as'4 g'8) |  % 21
     f'4. r4 es'8 |  % 22
   \break   as'4( c''8 f''4 es''8) |  % 23
     es''8( des'' c'' des''4 bes'8) |  % 24
     c''4( es''8 as''4 f''8) |  % 25
     es''8( des'' c'' bes'4 as'8) |  % 26
   \break   as'4( f'8 des''4 c''8) |  % 27
     b'4.( c''4) r8 |  % 28
     g'16( as' g' f' e' f' g' bes' c'' des'' c'' bes' |  % 29
     as'16 g' f' e' des' c' e'4) c'8 |  % 30
   \break   <f' f''>4( <as' as''>8 <des'' des'''>4 <c'' c'''>8) |  % 31
     <c'' c'''>8( <bes' bes''> <as' as''> <g' g''>4 <f' f''>8) |  % 32
     <e' e''>4( <f' f''>8 <g' g''> <as' as''> <bes' bes''>) |  % 33
     <as' as''>4( <g' g''>8 <e' e''>4) <c' c''>8 |  % 34
   \break   <f' f''>4( <as' as''>8 <des'' des'''>4 <c'' c'''>8) |  % 35
     <f'' f'''>4( <es'' es'''>8 <des'' des'''>4 <c'' c'''>8 |  % 36
     <des'' des'''>8 <c'' c'''> <bes' bes''> <as' as''>4 <g' g''>8) |  % 37
     <f' f''>4.~ q4. |  % 38
   \break \tempo "Più mosso" 4. = 60  f'16 as' des'' f'' des'' as' as'16 des'' f'' as'' f'' des'' |  % 39
     f'16 bes' des'' f'' des'' bes' bes'16 des'' f'' bes'' f'' des'' |  % 40
     ges'16 bes' des'' ges'' des'' bes' ges'16 beses' des'' ges'' des'' beses' |  % 41
     es'16 ges' bes' des'' bes' ges' g'16 bes' des'' e'' des'' bes' |  % 42
   \break   f'16 as' des'' f'' des'' as' as'16 des'' f'' as'' f'' des'' |  % 43
     ges'16 c'' es'' ges'' es'' c'' c''16 es'' ges'' c''' ges'' es'' |  % 44
     ges''16 es'' c'' as' c'' es'' es''16 c'' as' ges' as' c'' |  % 45
     c''16( as' ges' es' c' es' ges'4.)\fermata |  % 46
  \bar "||" \key des \major \time 3/4 \partial 4 \break \sectionLabel \markup { \concat { \bold "Minuetto" \hspace #12 } } \tempo "Tempo di Minuetto, grazioso" 4 = 100  as'4 |  % 47
     des''4.( es''8 f''4) |  % 48
     bes''2( as''4) |  % 49
     ges''8( f'' es'' f'' es'' des'') |  % 50
     des''2 as'4 |  % 51
   \break   f''4.( ges''8 as''4) |  % 52
     ges''4.( as''8 bes''4) |  % 53
     g''8( as'' bes'' as'' g'' as'') |  % 54
     as''2 r4 |  % 55
   \break   des''16( es'' f'' es'' des'' c'' des'' es'' f''4) |  % 56
     bes''16( c''' bes'' as'' ges''8 f'' as''4) |  % 57
     ges''16( f'' es'' f'' ges'' f'' es'' des'' c''8 es'') |  % 58
     des''2 as'4 |  % 59
   \break   f''16( ges'' as'' ges'' f'' es'' f'' ges'' as''4) |  % 60
     ges''16( as'' bes'' as'' ges'' f'' ges'' as'' bes''4) |  % 61
     f''4 \tag #'layout { es''2\trill } \tag #'midi { f''32 es'' f'' es'' f'' es'' f'' es'' f'' es'' f'' es'' f'' es'' des'' es'' } |  % 62
     des''2 r4 |  % 63
   \break   <des'' f''>4.( <c'' es''>8 <bes' des''>4) |  % 64
     <ges'' bes''>4.( <f'' as''>8 <es'' ges''>4) |  % 65
     <c'' es''>4.( <bes' des''>8 <as' c''>4) |  % 66
     <f'' as''>4.( <es'' ges''>8 <des'' f''>4) |  % 67
   \break   <bes' des''>4.( <as' c''>8 <ges' bes'>4) |  % 68
     <des'' fes''>4.( <bes' des''>8 <g' bes'>4) |  % 69
     <as' f''>2( <ges' es''>4) |  % 70
     <ges' c'' es''>2\fermata as4 |  % 71
   \break \tempo "Un poco più lento" 4 = 92 \voiceOne \tuplet 6/4 4 { as'16 des'' f'' as' des'' f'' } \tuplet 6/4 4 { as'16 des'' f'' as' des'' f'' } \tuplet 6/4 4 { as'16 des'' f'' as' des'' f'' } |  % 72
     \tuplet 6/4 4 { ges''16 bes'' des''' ges'' bes'' des''' } \tuplet 6/4 4 { ges''16 bes'' des''' ges'' bes'' des''' } \tuplet 6/4 4 { des''16 f'' as'' des'' f'' as'' } |  % 73
     \tuplet 6/4 4 { as'16 c'' es'' as' c'' es'' } \tuplet 6/4 4 { as'16 c'' es'' as' c'' es'' } \tuplet 6/4 4 { as'16 c'' es'' as' c'' es'' } |  % 74
   \break   \tuplet 6/4 4 { f'16 as' des'' f' as' des'' } \tuplet 6/4 4 { f'16 as' des'' f' as' des'' } \tuplet 6/4 4 { f'16 as' des'' f' as' des'' } |  % 75
     \tuplet 6/4 4 { as'16 des'' f'' as' des'' f'' } \tuplet 6/4 4 { as'16 des'' f'' as' des'' f'' } \tuplet 6/4 4 { des''16 f'' as'' des'' f'' as'' } |  % 76
     \tuplet 6/4 4 { bes'16 des'' ges'' bes' des'' ges'' } \tuplet 6/4 4 { bes'16 des'' ges'' bes' des'' ges'' } \tuplet 6/4 4 { des''16 ges'' bes'' des'' ges'' bes'' } |  % 77
   \break   \tuplet 6/4 4 { des''16 f'' as'' des'' f'' as'' } \tuplet 6/4 4 { as'16 c'' es'' as' c'' es'' } \tuplet 6/4 4 { as'16 c'' es'' as' c'' es'' } |  % 78
     \tuplet 6/4 4 { f'16 as' des'' f'' as'' des''' } \tuplet 6/4 4 { des'''16 as'' f'' des'' as' f' } r4 |  % 79
   \break   \tuplet 6/4 4 { bes'16 des'' ges'' bes' des'' ges'' } \tuplet 6/4 4 { bes'16 des'' ges'' bes' des'' ges'' } \tuplet 6/4 4 { as'16 des'' f'' as' des'' f'' } |  % 80
    \oneVoice <as' des'' f''>2.\fermata |  % 81
  \bar "||" \key f \minor \time 4/4 \break \sectionLabel \markup { \concat { \bold "Tempesta" \hspace #12 } } \tempo "Allegro con fuoco" 4 = 126  r8 <c' c''>-> <f' f''>4-> <as' as''>8-> <des'' des'''>4.-> |  % 82
     <c'' c'''>8-> <bes' bes''> <as' as''> <g' g''> <f' f''> <e' e''> <des' des''> <c' c''> |  % 83
   \break   r8 <gis gis'>-> <cis' cis''>4-> <e' e''>8-> <a' a''>4.-> |  % 84
     <gis' gis''>8-> <fis' fis''> <e' e''> <dis' dis''> <cis' cis''> <bis bis'> <a a'> <gis gis'> |  % 85
   \break   r8 <e' e''>-> <a' a''>4-> <c'' c'''>8-> <f'' f'''>4.-> |  % 86
     <gis' gis''>8-> <f' f''> <e' e''> <d' d''> <c' c''> <b b'> <a a'> <gis gis'> |  % 87
   \break   <a c' f' a'>4-> <f f'>16 <g g'> <as as'> <bes bes'> <c' c''> <des' des''> <e' e''> <f' f''> <g' g''> <as' as''> <b' b''> <c'' c'''> |  % 88
     <des'' f'' as'' b''>2-> <c'' f'' as'' c'''>4-> <c'' e'' g''>4-> |  % 89
   \break   <f' as' c'' f''>4.-> <g' g''>8 <as' c'' f'' as''>2-> |  % 90
     <des'' f'' bes'' des'''>2.-> <c'' f'' as'' c'''>4 |  % 91
   \break   <bes' bes''>8 <as' as''> <g' g''> <as' as''> <g' g''> <f' f''> <e' e''>4 |  % 92
     <f' as' c'' f''>2-> <g' bes' c'' e''>2-> |  % 93
   \break   <c'' f'' as''>8-> <b' d'' f'' as''> <c'' f'' as''>8 <b' d'' f'' as''> <c'' f'' as''>8 <b' d'' f'' as''> <c'' f'' as''>8 <b' d'' f'' as''> |  % 94
     <f'' as'' c'''>8-> <f'' as'' b'' d'''> <f'' as'' c'''>8 <f'' as'' b'' d'''> <f'' as'' c'''>8 <f'' as'' b'' d'''> <f'' as'' c'''>8 <f'' as'' b'' d'''> |  % 95
   \break   <f' as' c'' f''>4-> <as' c'' f'' as''>8 <des'' f'' bes'' des'''>4.-> <c'' f'' as'' c'''>4 |  % 96
     <as' c'' f'' as''>4-> <c'' f'' as'' c'''>8 <f'' bes'' des''' f'''>4.-> <e'' g'' c''' e'''>4 |  % 97
   \break   \tuplet 3/2 { <e'' g'' bes'' des'''>8-> q q } \tuplet 3/2 { q q q } \tuplet 3/2 { q q q } \tuplet 3/2 { q q q } |  % 98
     des'''16[ bes'' g'' e''] des''[ bes' g' e'] des'[ \change Staff = "lh" bes g e] \change Staff = "rh" r4 |  % 99
   \break   \repeat tremolo 16 { <e' bes'>32 g'32 } |  % 100
     \repeat tremolo 8 { <e' bes'>32 g'32 } <e' g' bes'>2\fermata |  % 101
  \time 6/8 \partial 8 \break \sectionLabel \markup { \concat { \bold "Ripresa" \hspace #12 } } \tempo "Tempo I" 4. = 44  c'8 |  % 102
     f'4( as'8 \acciaccatura es''8 des''4 c''8) |  % 103
     c''16( des'' c'' bes' as'8 g'4 f'8) |  % 104
     e'4( f'8 g' as' bes') |  % 105
     as'4( g'8 e'4) c'8 |  % 106
   \break   f'4( as'8 des''4 c''8) |  % 107
     f''4( es''8 des''16 es'' des'' c'' bes' c'' |  % 108
     des''8 c'' bes' as'4 g'8~) |  % 109
     g'4.( e'4.)\fermata |  % 110
  \bar "||" \key f \major \time 3/4 \partial 4 \break \sectionLabel \markup { \concat { \bold "Apoteosi" \hspace #12 } } \tempo "Grandioso" 4 = 60  <e' g' bes' c''>4-> |  % 111
     <f' a' c'' f''>4.-> <g' g''>8 <a' c'' f'' a''>4 |  % 112
     <d'' f'' bes'' d'''>2-> <c'' f'' a'' c'''>4 |  % 113
     <bes' bes''>8 <a' a''> <g' g''> <a' a''> <g' g''> <f' f''> |  % 114
     <f' a' c'' f''>2-> <c' c''>4 |  % 115
   \break   <a' c'' f'' a''>4.-> <bes' bes''>8 <c'' f'' a'' c'''>4 |  % 116
     <bes' d'' f'' bes''>4.-> <c'' c'''>8 <d'' f'' bes'' d'''>4 |  % 117
     <a' c'' f'' a''>4 <g' bes' c'' e'' g''>2-> |  % 118
     <f' a' c'' f''>2 <e' g' bes' c''>4 |  % 119
   \break   <f' a' c'' f''>4.-> <g' g''>8 <a' c'' f'' a''>4 |  % 120
     <d'' f'' bes'' d'''>2-> <c'' f'' a'' c'''>4 |  % 121
     <bes' bes''>8 <a' a''> <g' g''> <a' a''> <g' g''> <f' f''> |  % 122
     <f' a' c'' f''>2-> <c' c''>4 |  % 123
   \break   <a' c'' f'' a''>4.-> <bes' bes''>8 <c'' f'' a'' c'''>4 |  % 124
     <bes' d'' f'' bes''>4.-> <c'' c'''>8 <d'' f'' bes'' d'''>4 |  % 125
   \break   <f'' as'' des''' f'''>2.-> |  % 126
     <f'' a'' c''' f'''>4 <e'' g'' bes'' e'''>2-> |  % 127
     <f'' a'' f'''>2.-> |  % 128
  \time 6/8 \break \sectionLabel \markup { \concat { \bold "Coda" \hspace #12 } } \tempo "Presto con fuoco" 4. = 100  c''16 f'' a'' c''' a'' f'' f''16 a'' c''' f''' c''' a'' |  % 129
     d''16 f'' bes'' d''' bes'' f'' e''16 g'' bes'' c''' bes'' g'' |  % 130
   \ottava #1  a''16 c''' f''' a''' f''' c''' f''16 a'' c''' f''' c''' a'' |  % 131
     bes''16 d''' f''' bes''' f''' d''' e''16 g'' bes'' c''' bes'' g'' |  % 132
   \break \ottava #0  <a' c'' f''>4-> <c'' f'' a''>8 <d'' f'' bes'' d'''>4-> <c'' f'' a'' c'''>8 |  % 133
   \ottava #1  <d'' f'' bes''>4-> <f'' bes'' d'''>8 <g'' bes'' d''' g'''>4-> <f'' bes'' d''' f'''>8 |  % 134
     <e'' g'' c'''>4-> <g'' c''' e'''>8 <a'' c''' f''' a'''>4-> <g'' c''' e''' g'''>8 |  % 135
   \break   <f'' a'' c''' f'''>4.-> <e'' g'' bes'' e'''>4.-> |  % 136
     <f'' a'' f'''>4.-> r4.\fermata |  % 137
  \time 4/4 \break \ottava #0 \tempo "Adagio" 4 = 44  c'2( f'4. as'8 |  % 138
     des''2 c''2) |  % 139
     <bes' des'' f''>2( <a' c'' f''>2)\fermata |  % 140
   \tempo "Allegro assai"  \change Staff = "lh" f,,32 c, f, a, c f a \change Staff = "rh" c' f' a' c'' f'' a'' c''' f''' a''' <f'' a'' c''' f'''>4-> q4\fermata |  % 141
}

rhB = {
  s1 |  % 1
  s1 |  % 2
  s1 |  % 3
  \voiceTwo <cis' e'~>2 <e' a'>2 |  % 4
  \voiceTwo <cis''~ fis''>2 <cis'' e''>4 <bis' dis''> |  % 5
  \voiceTwo cis''2 <a' c''>2\fermata |  % 6
  s1 |  % 7
  s1 |  % 8
  s1 |  % 9
  s1 |  % 10
  s1 |  % 11
  s2. |  % 12
  s1*5/4 |  % 13
  s8 |  % 14
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
  s4 |  % 47
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
  \voiceTwo des'4.( es'8 f'4) |  % 72
  \voiceTwo bes'2( as'4) |  % 73
  \voiceTwo ges'8( f' es' f' es' des') |  % 74
  \voiceTwo des'2 as4 |  % 75
  \voiceTwo f'4.( ges'8 as'4) |  % 76
  \voiceTwo ges'4.( as'8 bes'4) |  % 77
  \voiceTwo f'4( es'2) |  % 78
  \voiceTwo des'2 r4 |  % 79
  \voiceTwo <des' ges'>2 <des' f'>4 |  % 80
  s2. |  % 81
  s1 |  % 82
  s1 |  % 83
  s1 |  % 84
  s1 |  % 85
  s1 |  % 86
  s1 |  % 87
  s1 |  % 88
  s1 |  % 89
  s1 |  % 90
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
  s8 |  % 102
  s2. |  % 103
  s2. |  % 104
  s2. |  % 105
  s2. |  % 106
  s2. |  % 107
  s2. |  % 108
  s2. |  % 109
  s2. |  % 110
  s4 |  % 111
  s2. |  % 112
  s2. |  % 113
  s2. |  % 114
  s2. |  % 115
  s2. |  % 116
  s2. |  % 117
  s2. |  % 118
  s2. |  % 119
  s2. |  % 120
  s2. |  % 121
  s2. |  % 122
  s2. |  % 123
  s2. |  % 124
  s2. |  % 125
  s2. |  % 126
  s2. |  % 127
  s2. |  % 128
  s2. |  % 129
  s2. |  % 130
  s2. |  % 131
  s2. |  % 132
  s2. |  % 133
  s2. |  % 134
  s2. |  % 135
  s2. |  % 136
  s2. |  % 137
  s1 |  % 138
  s1 |  % 139
  s1 |  % 140
  s1 |  % 141
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
  s1 |  % 9
  s1 |  % 10
  s1 |  % 11
  s2. |  % 12
  s1*5/4 |  % 13
  s8 |  % 14
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
  s4 |  % 47
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
  s1 |  % 82
  s1 |  % 83
  s1 |  % 84
  s1 |  % 85
  s1 |  % 86
  s1 |  % 87
  s1 |  % 88
  s1 |  % 89
  s1 |  % 90
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
  s8 |  % 102
  s2. |  % 103
  s2. |  % 104
  s2. |  % 105
  s2. |  % 106
  s2. |  % 107
  s2. |  % 108
  s2. |  % 109
  s2. |  % 110
  s4 |  % 111
  s2. |  % 112
  s2. |  % 113
  s2. |  % 114
  s2. |  % 115
  s2. |  % 116
  s2. |  % 117
  s2. |  % 118
  s2. |  % 119
  s2. |  % 120
  s2. |  % 121
  s2. |  % 122
  s2. |  % 123
  s2. |  % 124
  s2. |  % 125
  s2. |  % 126
  s2. |  % 127
  s2. |  % 128
  s2. |  % 129
  s2. |  % 130
  s2. |  % 131
  s2. |  % 132
  s2. |  % 133
  s2. |  % 134
  s2. |  % 135
  s2. |  % 136
  s2. |  % 137
  s1 |  % 138
  s1 |  % 139
  s1 |  % 140
  s1 |  % 141
}

lhA = {
  \key f \minor \time 4/4   <c, c>2 <f, f>4. <as, as>8 |  % 1
     <des des'>2 <c c'>2\fermata |  % 2
     <c, c>2 <des, des>2\fermata |  % 3
     <cis, cis>2 <a,, a,>2 |  % 4
     <fis,, fis,>2 <gis,, gis,>2 |  % 5
     <a,, a,>1 |  % 6
     <e,, e,>2 <a,, a,>4. <c, c>8 |  % 7
     <f, f>2 <e, e>2 |  % 8
     <f, f>1 |  % 9
     <des, des>2 <des, des>2 |  % 10
     <c, c>2 <c, c>2 |  % 11
  \cadenzaOn    <c,, c,>4->\fermata s2 \cadenzaOff \bar "" |  % 12
  \cadenzaOn \set Score.currentBarNumber = #13    s1 <c, bes, e>4\fermata \cadenzaOff \bar "||" |  % 13
  \set Score.currentBarNumber = #14 \time 6/8 \partial 8   r8 |  % 14
     f,8 <c as> q f, <c as> q |  % 15
     bes,8 <f des'> <f bes> c <e bes> q |  % 16
     f,8 <c as> q bes, <des g> q |  % 17
     c,8 <g, e> q g, <c e> q |  % 18
     f,8 <c as> q f, <c as> q |  % 19
     des8 <f as> q bes, <f des'> q |  % 20
     bes,8 <des g> q c <e bes> q |  % 21
     f,8 <c as> q bes, <g des'> q |  % 22
     as,8 <es c'> q as, <es c'> q |  % 23
     des8 <f as> q es <g des'> q |  % 24
     as,8 <es c'> q f, <as des'> q |  % 25
     c8 <es as> q es, <g des'> q |  % 26
     f,8 <as c'> q bes, <f des'> q |  % 27
     des8 <f as> q c <f as> q |  % 28
     c8 <e bes> q c <e bes> q |  % 29
     c8 <e bes> q c4 r8 |  % 30
     f,8 c as c' as c |  % 31
     bes,8 des' f c e bes |  % 32
     f,8 c as bes, des g |  % 33
     c,8 g, e g, c e |  % 34
     f,8 c as c' as c |  % 35
     des,8 as, f bes,, f, des |  % 36
     bes,8 des g c e bes |  % 37
     des,8 as, f des' f as, |  % 38
     <des, des>4. as,16 des f as f des |  % 39
     <bes,, bes,>4. f,16 bes, des f des bes, |  % 40
     <ges,, ges,>4. des,16 ges, beses, des beses, ges, |  % 41
     <es, es>4. <e, e>4. |  % 42
     <as,, as,>4. as,16 des f as f des |  % 43
     <as,, as,>4. es,16 as, c es c as, |  % 44
     <as,, as,>4. es,16 as, c es c as, |  % 45
     <as,, as,>2.\fermata |  % 46
  \bar "||" \key des \major \time 3/4 \partial 4   r4 |  % 47
     des4 <f as>-. q-. |  % 48
     ges,4 <des bes>-. <des f>-. |  % 49
     as,4 <c es>-. q-. |  % 50
     des4 <f as>-. r4 |  % 51
     f,4 <des as>-. q-. |  % 52
     bes,4 <des ges>-. q-. |  % 53
     es,4 <g des'>-. q-. |  % 54
     as,4 <as c'>-. r4 |  % 55
     des8 as f as des as |  % 56
     ges,8 des bes, des f, des |  % 57
     as,8 es c es c es |  % 58
     des8 as f as des4 |  % 59
     f,8 des as, des f, des |  % 60
     bes,8 ges des ges bes, ges |  % 61
     as,8 f c es ges es |  % 62
     des8 as f as des4 |  % 63
     bes,4 <f des'>-. q-. |  % 64
     es,4 <ges bes>-. q-. |  % 65
     as,4 <es ges>-. q-. |  % 66
     des,4 <f as>-. q-. |  % 67
     ges,4 <des bes>-. q-. |  % 68
     g,4 <bes des'>-. q-. |  % 69
     as,4 <des f>-. <c ges>-. |  % 70
     as,,2 r4 |  % 71
     des,4 <as, f>-. q-. |  % 72
     ges,4 <des bes>-. <f, des>-. |  % 73
     as,,4 <es, c>-. q-. |  % 74
     des,4 <as, f>-. r4 |  % 75
     f,4 <as, des>-. q-. |  % 76
     bes,4 <des ges>-. q-. |  % 77
     as,,4 <as, es>-. <c ges>-. |  % 78
     des,4 <as, f>-. r4 |  % 79
     ges,2 des4 |  % 80
     <des, as, f>2.\fermata |  % 81
  \bar "||" \key f \minor \time 4/4 \ottava #-1  \repeat tremolo 8 { f,,16 f,16 } |  % 82
     \repeat tremolo 8 { c,16 c16 } |  % 83
     \repeat tremolo 8 { cis,,16 cis,16 } |  % 84
     \repeat tremolo 8 { gis,,16 gis,16 } |  % 85
     \repeat tremolo 8 { a,,16 a,16 } |  % 86
     \repeat tremolo 8 { e,,16 e,16 } |  % 87
   \ottava #0  <f,, f,>4-> f,16 g, as, bes, c des e f g as b c' |  % 88
     <des, des>2-> <c, c>4-> <c, c>4-> |  % 89
   \ottava #-1  \repeat tremolo 8 { f,,16 f,16 } |  % 90
     \repeat tremolo 6 { bes,,16 bes,16 } \repeat tremolo 2 { f,,16 f,16 } |  % 91
     \repeat tremolo 8 { c,16 c16 } |  % 92
     \repeat tremolo 4 { f,,16 f,16 } \repeat tremolo 4 { c,,16 c,16 } |  % 93
     \repeat tremolo 8 { c,,16 c,16 } |  % 94
     \repeat tremolo 8 { c,,16 c,16 } |  % 95
     \repeat tremolo 8 { c,,16 c,16 } |  % 96
     \repeat tremolo 8 { c,,16 c,16 } |  % 97
     \tuplet 3/2 { <c,, c,>8-> q q } \tuplet 3/2 { <c,, c,>8-> q q } \tuplet 3/2 { <c,, c,>8-> q q } \tuplet 3/2 { <c,, c,>8-> q q } |  % 98
     <c,, c,>1 |  % 99
   \ottava #0  <c, c>1 |  % 100
     <c, c>1\fermata |  % 101
  \time 6/8 \partial 8   r8 |  % 102
     f,8 c as c' as c |  % 103
     bes,8 des' f c e bes |  % 104
     f,8 c as bes, des g |  % 105
     c,8 g, e g, c e |  % 106
     f,8 c as c' as c |  % 107
     des,8 as, f bes,, f, des |  % 108
     bes,8 des g c e bes |  % 109
     c8 <e bes> q c4.\fermata |  % 110
  \bar "||" \key f \major \time 3/4 \partial 4   <c, c>4-> |  % 111
     <f,, f,>4 <c f a> q |  % 112
     <bes,, bes,>4 <d f bes> <f, c f> |  % 113
     <c, c>4 <e g bes> q |  % 114
     <f, f>4 <c f a> q |  % 115
     <a,, a,>4 <c f a> q |  % 116
     <d, d>4 <f bes> q |  % 117
     <c,, c,>4 <c, g, e>2 |  % 118
     <f,, f,>4 <c f a> <c, c> |  % 119
     \tuplet 6/4 4 { f,,16 c, a, c a, c, } \tuplet 6/4 4 { f,,16 c, a, c a, c, } \tuplet 6/4 4 { f,,16 c, a, c a, c, } |  % 120
     \tuplet 6/4 4 { bes,,16 f, d f d f, } \tuplet 6/4 4 { bes,,16 f, d f d f, } \tuplet 6/4 4 { f,,16 c, a, c a, c, } |  % 121
     \tuplet 6/4 4 { c,16 g, bes, e bes, g, } \tuplet 6/4 4 { c,16 g, bes, e bes, g, } \tuplet 6/4 4 { c,16 g, bes, e bes, g, } |  % 122
     \tuplet 6/4 4 { f,16 c a c' a c } \tuplet 6/4 4 { f,16 c a c' a c } \tuplet 6/4 4 { e,16 g, bes, c bes, g, } |  % 123
     \tuplet 6/4 4 { a,,16 f, c f c f, } \tuplet 6/4 4 { a,,16 f, c f c f, } \tuplet 6/4 4 { a,,16 f, c f c f, } |  % 124
     \tuplet 6/4 4 { d,16 bes, f bes f bes, } \tuplet 6/4 4 { d,16 bes, f bes f bes, } \tuplet 6/4 4 { d,16 bes, f bes f bes, } |  % 125
     <des, des>2.-> |  % 126
     \tuplet 6/4 4 { c,16 f, a, c a, f, } \tuplet 6/4 4 { c,16 g, bes, e bes, g, } \tuplet 6/4 4 { c,16 g, bes, e bes, g, } |  % 127
     <f,, c, f,>2.-> |  % 128
  \time 6/8   <f,, f,>8 <a c'>-. q-. <c, c>8 <a c'>-. q-. |  % 129
     <bes,, bes,>8 <bes d'>-. q-. <c, c>8 <bes e'>-. q-. |  % 130
     <f,, f,>8 <a c'>-. q-. <c, c>8 <a c'>-. q-. |  % 131
     <bes,, bes,>8 <d' f'>-. q-. <c, c>8 <bes e'>-. q-. |  % 132
     <f, f>4-> q8 q4 q8 |  % 133
     <bes,, bes,>4-> q8 q4 q8 |  % 134
     <c, c>4-> q8 q4 q8 |  % 135
     <c, c>4.-> q4.-> |  % 136
     <f,, c, f,>4.-> r4.\fermata |  % 137
  \time 4/4   <c, c>2 <f, f>4. <as, as>8 |  % 138
     <des des'>2 <c c'>2 |  % 139
     <f,, f,>2 <f,, c, f,>2\fermata |  % 140
     s2 <f,, c, f,>4-> q4\fermata |  % 141
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
  s1 |  % 9
  s1 |  % 10
  s1 |  % 11
  s2. |  % 12
  s1*5/4 |  % 13
  s8 |  % 14
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
  s4 |  % 47
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
  s1 |  % 82
  s1 |  % 83
  s1 |  % 84
  s1 |  % 85
  s1 |  % 86
  s1 |  % 87
  s1 |  % 88
  s1 |  % 89
  s1 |  % 90
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
  s8 |  % 102
  s2. |  % 103
  s2. |  % 104
  s2. |  % 105
  s2. |  % 106
  s2. |  % 107
  s2. |  % 108
  s2. |  % 109
  s2. |  % 110
  s4 |  % 111
  s2. |  % 112
  s2. |  % 113
  s2. |  % 114
  s2. |  % 115
  s2. |  % 116
  s2. |  % 117
  s2. |  % 118
  s2. |  % 119
  s2. |  % 120
  s2. |  % 121
  s2. |  % 122
  s2. |  % 123
  s2. |  % 124
  s2. |  % 125
  s2. |  % 126
  s2. |  % 127
  s2. |  % 128
  s2. |  % 129
  s2. |  % 130
  s2. |  % 131
  s2. |  % 132
  s2. |  % 133
  s2. |  % 134
  s2. |  % 135
  s2. |  % 136
  s2. |  % 137
  s1 |  % 138
  s1 |  % 139
  s1 |  % 140
  s1 |  % 141
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
  s1 |  % 9
  s1 |  % 10
  s1 |  % 11
  s2. |  % 12
  s1*5/4 |  % 13
  s8 |  % 14
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
  s4 |  % 47
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
  s1 |  % 82
  s1 |  % 83
  s1 |  % 84
  s1 |  % 85
  s1 |  % 86
  s1 |  % 87
  s1 |  % 88
  s1 |  % 89
  s1 |  % 90
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
  s8 |  % 102
  s2. |  % 103
  s2. |  % 104
  s2. |  % 105
  s2. |  % 106
  s2. |  % 107
  s2. |  % 108
  s2. |  % 109
  s2. |  % 110
  s4 |  % 111
  s2. |  % 112
  s2. |  % 113
  s2. |  % 114
  s2. |  % 115
  s2. |  % 116
  s2. |  % 117
  s2. |  % 118
  s2. |  % 119
  s2. |  % 120
  s2. |  % 121
  s2. |  % 122
  s2. |  % 123
  s2. |  % 124
  s2. |  % 125
  s2. |  % 126
  s2. |  % 127
  s2. |  % 128
  s2. |  % 129
  s2. |  % 130
  s2. |  % 131
  s2. |  % 132
  s2. |  % 133
  s2. |  % 134
  s2. |  % 135
  s2. |  % 136
  s2. |  % 137
  s1 |  % 138
  s1 |  % 139
  s1 |  % 140
  s1 |  % 141
}

dyn = {
  s2\pp-\markup { \italic "misterioso" } s4.\< s8 |  % 1
  s2\> s2\! |  % 2
  s2\pp s2 |  % 3
  s2\p-\markup { \italic "dolente" } s4. s8\< |  % 4
  s2\mp\> s2 |  % 5
  s2\p s2\pp |  % 6
  s2\p\< s2 |  % 7
  s2\mf s2\< |  % 8
  s2\f s2\< |  % 9
  s2\ff s2\< |  % 10
  s2\fff s2 |  % 11
  s4\sffz s2\> |  % 12
  s1\pp-\markup { \italic "recitativo" } s4 |  % 13
  s8 |  % 14
  s4.\p-\markup { \italic "mezza voce" } s4. |  % 15
  s4. s4.\< |  % 16
  s4.\> s4. |  % 17
  s4. s4.\! |  % 18
  s4.\p s4.\< |  % 19
  s4.\mp s4.\> |  % 20
  s4. s4. |  % 21
  s4.\p s4. |  % 22
  s4.\p-\markup { \italic "dolce" } s4. |  % 23
  s4. s4. |  % 24
  s4.\< s4. |  % 25
  s4.\mf\> s4. |  % 26
  s4.\p s4. |  % 27
  s4.\< s4.\mp |  % 28
  s4.\pp-\markup { \italic "leggiero" } s4.\< |  % 29
  s4.\> s4.\! |  % 30
  s4.\mf-\markup { \italic "con passione" } s4.\< |  % 31
  s4.\f s4. |  % 32
  s4. s4.\< |  % 33
  s4.\f s4. |  % 34
  s4.\f\< s4. |  % 35
  s4.\ff s4. |  % 36
  s4. s4.\> |  % 37
  s4.\fp s4. |  % 38
  s4.\p-\markup { \italic "agitato" } s4.\< |  % 39
  s4.\mf s4.\< |  % 40
  s4.\f s4.\< |  % 41
  s4.\ff s4. |  % 42
  s4.\f s4.\> |  % 43
  s4.\mf s4.\> |  % 44
  s4.\p s4.\> |  % 45
  s4.\pp s4. |  % 46
  s4 |  % 47
  s2.\p-\markup { \italic "dolce" } |  % 48
  s2. |  % 49
  s2\< s4\> |  % 50
  s2.\! |  % 51
  s2.\< |  % 52
  s2.\mf |  % 53
  s2.\> |  % 54
  s2.\p |  % 55
  s2.\p |  % 56
  s2. |  % 57
  s2\< s4\> |  % 58
  s2.\! |  % 59
  s2.\< |  % 60
  s2.\mf |  % 61
  s4 s2\> |  % 62
  s2.\p |  % 63
  s2.\p-\markup { \italic "a due voci" } |  % 64
  s2. |  % 65
  s2. |  % 66
  s2.\< |  % 67
  s2.\mf |  % 68
  s2.\> |  % 69
  s2.\p |  % 70
  s2 s4\pp |  % 71
  s2.\pp-\markup { \italic "leggierissimo, il canto marcato" } |  % 72
  s2. |  % 73
  s2\< s4\> |  % 74
  s2.\! |  % 75
  s2.\< |  % 76
  s2.\p |  % 77
  s2.\> |  % 78
  s2.\pp |  % 79
  s2.\ppp |  % 80
  s2. |  % 81
  s1\ff |  % 82
  s1 |  % 83
  s1\ff |  % 84
  s2 s2\< |  % 85
  s1\fff |  % 86
  s1 |  % 87
  s4\fff s2.\< |  % 88
  s1\fff |  % 89
  s1\ff-\markup { \italic "il Minuetto, in tempesta" } |  % 90
  s1 |  % 91
  s2 s2\< |  % 92
  s1\fff |  % 93
  s1\ff\< |  % 94
  s1 |  % 95
  s1\fff |  % 96
  s1 |  % 97
  s1\fff |  % 98
  s2.\ff\> s4 |  % 99
  s1\p\> |  % 100
  s1\pp |  % 101
  s8 |  % 102
  s4.\pp-\markup { \italic "come una memoria" } s4. |  % 103
  s4. s4.\< |  % 104
  s4.\> s4. |  % 105
  s4.\! s4. |  % 106
  s4.\p s4.\< |  % 107
  s4.\mp s4.\> |  % 108
  s4. s4.\p |  % 109
  s4.\pp s4. |  % 110
  s4\ff |  % 111
  s2.\fff-\markup { \italic "trionfale" } |  % 112
  s2. |  % 113
  s2. |  % 114
  s2. |  % 115
  s2.\< |  % 116
  s2.\fff |  % 117
  s2. |  % 118
  s2 s4\ff |  % 119
  s2.\ff |  % 120
  s2. |  % 121
  s2. |  % 122
  s2.\< |  % 123
  s2.\fff |  % 124
  s2. |  % 125
  s2.\sffz |  % 126
  s2. |  % 127
  s2.\fff |  % 128
  s4.\f s4.\< |  % 129
  s4. s4. |  % 130
  s4.\ff s4. |  % 131
  s4. s4.\< |  % 132
  s4.\fff s4. |  % 133
  s4. s4. |  % 134
  s4. s4. |  % 135
  s4. s4. |  % 136
  s4. s4. |  % 137
  s1\pp-\markup { \italic "come prima, lontano" } |  % 138
  s1 |  % 139
  s2\pp s2\ppp |  % 140
  s2\ff\< s4\fff s4 |  % 141
}

ped = {
  s1\sustainOn |  % 1
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 2
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 3
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 4
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 5
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 6
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 7
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 8
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 9
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 10
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 11
  s2.\sustainOff\sustainOn |  % 12
  s1\sustainOff s4\sustainOn |  % 13
  s8 |  % 14
  s4.\sustainOff\sustainOn s4\sustainOff\sustainOn s8\sustainOff\sustainOn |  % 15
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 16
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 17
  s2.\sustainOff\sustainOn |  % 18
  s4.\sustainOff\sustainOn s4\sustainOff\sustainOn s8\sustainOff\sustainOn |  % 19
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 20
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 21
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 22
  s4.\sustainOff\sustainOn s4\sustainOff\sustainOn s8\sustainOff\sustainOn |  % 23
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 24
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 25
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 26
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 27
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 28
  s2.\sustainOff\sustainOn |  % 29
  s2.\sustainOff\sustainOn |  % 30
  s4.\sustainOff\sustainOn s4\sustainOff\sustainOn s8\sustainOff\sustainOn |  % 31
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 32
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 33
  s2.\sustainOff\sustainOn |  % 34
  s4.\sustainOff\sustainOn s4\sustainOff\sustainOn s8\sustainOff\sustainOn |  % 35
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 36
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 37
  s2.\sustainOff\sustainOn |  % 38
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 39
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 40
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 41
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 42
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 43
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 44
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 45
  s2.\sustainOff\sustainOn |  % 46
  s4 |  % 47
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
  s2.\sustainOff\sustainOn |  % 72
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 73
  s2.\sustainOff\sustainOn |  % 74
  s2.\sustainOff\sustainOn |  % 75
  s2.\sustainOff\sustainOn |  % 76
  s2.\sustainOff\sustainOn |  % 77
  s4\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 78
  s2.\sustainOff\sustainOn |  % 79
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 80
  s2.\sustainOff\sustainOn |  % 81
  s2\sustainOff\sustainOn s8 s4.\sustainOff\sustainOn |  % 82
  s1\sustainOff\sustainOn |  % 83
  s2\sustainOff\sustainOn s8 s4.\sustainOff\sustainOn |  % 84
  s1\sustainOff\sustainOn |  % 85
  s2\sustainOff\sustainOn s8 s4.\sustainOff\sustainOn |  % 86
  s1\sustainOff\sustainOn |  % 87
  s4\sustainOff\sustainOn s2.\sustainOff |  % 88
  s2\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 89
  s1\sustainOff\sustainOn |  % 90
  s2.\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 91
  s1\sustainOff\sustainOn |  % 92
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 93
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 94
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 95
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 96
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 97
  s1\sustainOff\sustainOn |  % 98
  s1\sustainOff\sustainOn |  % 99
  s1\sustainOff\sustainOn |  % 100
  s1\sustainOff\sustainOn |  % 101
  s8 |  % 102
  s4.\sustainOff\sustainOn s4\sustainOff\sustainOn s8\sustainOff\sustainOn |  % 103
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 104
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 105
  s2.\sustainOff\sustainOn |  % 106
  s4.\sustainOff\sustainOn s4\sustainOff\sustainOn s8\sustainOff\sustainOn |  % 107
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 108
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 109
  s2.\sustainOff\sustainOn |  % 110
  s4\sustainOff\sustainOn |  % 111
  s2.\sustainOff\sustainOn |  % 112
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 113
  s2.\sustainOff\sustainOn |  % 114
  s2.\sustainOff\sustainOn |  % 115
  s2.\sustainOff\sustainOn |  % 116
  s2.\sustainOff\sustainOn |  % 117
  s4\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 118
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 119
  s2.\sustainOff\sustainOn |  % 120
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 121
  s2.\sustainOff\sustainOn |  % 122
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 123
  s2.\sustainOff\sustainOn |  % 124
  s2.\sustainOff\sustainOn |  % 125
  s2.\sustainOff\sustainOn |  % 126
  s4\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 127
  s2.\sustainOff\sustainOn |  % 128
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 129
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 130
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 131
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 132
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 133
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 134
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 135
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |  % 136
  s4.\sustainOff\sustainOn s4.\sustainOff |  % 137
  s1\sustainOn |  % 138
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 139
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |  % 140
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn s4\sustainOff\sustainOn |  % 141
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
