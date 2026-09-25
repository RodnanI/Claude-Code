\version "2.24.0"
\header {
  dedication = \markup \italic "à la mémoire de W. A. Mozart, F. Chopin et F. Liszt"
  title = "Fantaisie-Ballade"
  subtitle = "in D minor"
  subsubtitle = "for piano"
  composer = "Claude"
  tagline = ##f
}
\paper {
  #(set-paper-size "a4")
  top-margin = 12\mm
  bottom-margin = 12\mm
  left-margin = 14\mm
  right-margin = 14\mm
  system-system-spacing.basic-distance = #14
  ragged-last-bottom = ##t
  print-page-number = ##t
}
#(set-global-staff-size 18)
rhMusic = {
  \key d \minor \time 4/4 \partial 4 \tempo "Grave" 4 = 44 <a a'>4-> | % 0
    <f' f''>2.-> <e' e''>4 | % 1
    <d' d''>4-> <e' g' cis''>2\fermata <bes bes'>4-> | % 2
    <ges' ges''>2.-> <f' f''>4 | % 3
    <es' es''>4-> <e' g' bes' cis''>2\fermata r4 | % 4
   \tempo "Andante misterioso" 4 = 58 s1 | % 5
    s1 | % 6
    s1 | % 7
    s1 | % 8
    s1 | % 9
    s1 | % 10
    \cadenzaOn \magnifyMusic 0.7 { e''4^\markup { \italic "a piacere, leggierissimo" } f''16[ e'' dis'' e''] g''16[ bes'' \ottava #1 cis''' e'''] g'''8\fermata f'''32[ e''' d''' cis''' \ottava #0 bes'' a'' g'' f''] e''32[ d'' cis'' bes' a' g' f' e'] f'16[ g' a' bes'] } a'4\fermata \cadenzaOff \bar "||" | % 11
  \time 6/8 \tempo "Andante con moto" 4. = 50 r4. r4 a'8^\markup { \italic "cantabile, con dolore" }( | % 12
    f''4. e''8 d'') a'8( | % 13
    g''4. f''8 e'') a'8( | % 14
    a''4. g''8 f'' e'' | % 15
    d''4 cis''8 e''4) a'8( | % 16
    f''4. e''8 d'') a'8( | % 17
    g''4. f''8 e'') a'8( | % 18
    bes''4.-- a''8 g'' e'' | % 19
    d''4.) r4 a'8( | % 20
   \tempo \markup \italic { meno mosso } f''4.^\markup { \italic "sotto voce" } d''8 es'' f'' | % 21
    g''4. f''8 es'' d'') | % 22
    c''4.( d''8 es'' c'' | % 23
    d''4.) r4 f'8( | % 24
    es''4. g''8 f'' es'' | % 25
    e''4. f''8 e'' cis'' | % 26
    d''4. f''8 e'' d'' | % 27
    cis''4.) r4 a'8( | % 28
   \tempo \markup \italic { poco più mosso } f''4. e''16 f'' e'' d'') a'8( | % 29
    g''4. f''16 g'' f'' e'') a'8( | % 30
    a''4. bes''16 a'' g'' f'' e''8 | % 31
    d''4 cis''8) e''16( f'' e'' d'' cis'' <a a'> | % 32
    <f' f''>4. <e' e''>8 <d' d''>) <a a'>( | % 33
    <g' g''>4. <f' f''>8 <e' e''>) <a a'>( | % 34
    <bes' bes''>4.-> <a' a''>8 <g' g''> <e' e''> | % 35
    <d' d''>4. <c' c''>8 <bes bes'> <a a'>) | % 36
   \tempo \markup \italic { calando } g'4.( f'8 e' d') | % 37
    r4. <e' g' bes'>4\fermata \tempo "Allegretto grazioso" 4 = 92 c''8^\markup { \italic "dolce" } | % 38
  \time 2/4 \key f \major  a''4( g''8 f'') | % 39
    e''8.( f''16 g''8 bes'') | % 40
    a''8( c''' f'' a'') | % 41
    g''4 r8 c''8 | % 42
    a''4( g''8 f'') | % 43
    d'''4( c'''8 bes'') | % 44
    \tag #'layout { c'''8( a'' g''8.\trill f''32 g'') } \tag #'midi { c'''8( a'' a''32 g'' a'' g'' a'' g'' f'' g'') } | % 45
    f''4 r8 c''8 | % 46
    e''16( f'' g'' a'' bes''8) g'' | % 47
    a''16( g'' f'' e'' f''8) c'' | % 48
    d''16( e'' f'' g'' a''8) bes'' | % 49
    c'''16( bes'' a'' g'' f'' e'' d'' c'') | % 50
    a''16( g'' f'' g'' a'' bes'' c''' a'') | % 51
    g''16( f'' e'' f'' g'' a'' bes'' g'') | % 52
    a''16( c''' f''' c''' a'' f'' c'' f'') | % 53
    g''16( a'' g'' fis'' g''8) r16 c'' | % 54
    a''16( bes'' a'' gis'' a''8) g''16( f'') | % 55
    e'''8( d''' c''' bes'') | % 56
    \tag #'layout { c'''8( a'' g''8.\trill f''32 g'') } \tag #'midi { c'''8( a'' a''32 g'' a'' g'' a'' g'' f'' g'') } | % 57
    f''4 r8 a'8 | % 58
  \key d \minor \tempo "Minore. Poco agitato" f''4( e''8 d'') | % 59
    cis''8.( d''16 e''8 g'') | % 60
    f''8( a'' d'' f'') | % 61
    e''4 r8 <a a'>8 | % 62
    <f' f''>4( <e' e''>8 <d' d''>) | % 63
    <g' g''>8.( <f' f''>16 <e' e''>8 <cis' cis''>) | % 64
    <cis'' e'' g'' a''>4-> r4 | % 65
  \time 6/8 \tempo "Allegro agitato e tempestoso" 4. = 84 a'16 d'' f'' a'' f'' d'' a'16 d'' f'' a'' f'' d'' | % 66
    a'16 d'' f'' a'' f'' d'' a'16 d'' f'' a'' f'' d'' | % 67
    bes'16 d'' e'' g'' e'' d'' bes'16 d'' e'' g'' e'' d'' | % 68
    a'16 d'' f'' a'' f'' d'' a'16 cis'' e'' g'' e'' cis'' | % 69
    a'16 cis'' e'' g'' e'' cis'' g'16 cis'' e'' a'' e'' cis'' | % 70
    a'16 <d'' f''> a' <d'' f''> a' <d'' f''> a'16 <d'' f''> a' <d'' f''> a' <d'' f''> | % 71
    bes'16 <d'' g''> bes' <d'' g''> bes' <d'' g''> g'16 <bes' e''> g' <bes' e''> g' <bes' e''> | % 72
    g'16 <cis'' e''> g' <cis'' e''> g' <cis'' e''> a'16 <cis'' g''> a' <cis'' g''> a' <cis'' g''> | % 73
    a'16 <d'' f''> a' <d'' f''> a' <d'' f''> bes'16 <c'' e''> bes' <c'' e''> bes' <c'' e''> | % 74
    as'16 c'' f'' as'' f'' c'' g'16 bes' des'' es'' des'' bes' | % 75
    gis'16 b' dis'' gis'' dis'' b' ais'16 cis'' e'' fis'' e'' cis'' | % 76
    b'16 d'' fis'' b'' fis'' d'' a'16 cis'' e'' g'' e'' cis'' | % 77
    <f' f''>4.-> <e' e''>8 <d' d''> <c' c''> | % 78
    <as' as''>4.-> <g' g''>8 <f' f''> <es' es''> | % 79
    <b' b''>4.-> <ais' ais''>8 <gis' gis''> <fis' fis''> | % 80
    <d'' d'''>4.-> <cis'' cis'''>8 <b' b''> <a' a''> | % 81
    <g' a' cis'' e''>8-> q q <f' a' d'' f''>8-> q q | % 82
    <a' cis'' e'' g''>8-> q q <a' d'' f'' a''>8-> q q | % 83
    <cis'' e'' g'' bes''>8-> q q <d'' f'' gis'' b''>8-> q q | % 84
    <dis'' fis'' a'' c'''>8-> q q <e'' g'' a'' cis'''>8-> q q | % 85
    <d'' f'' a'' d'''>4.-> <cis'' e'' g'' bes'' cis'''>4.-> | % 86
    \ottava #1 bes'''16 g''' e''' cis''' \ottava #0 bes'' g'' e'' cis'' bes' g' e' cis' | % 87
    r2 <cis' e' g' bes' cis''>4\fermata | % 88
  \key d \major \partial 8 \tempo "Grandioso" 4. = 44 <a a'>8-> | % 89
    <fis' a' d'' fis''>4. <g' cis'' e''>8 <fis' a' d''> <d' fis' a'> | % 90
    <g' b' e'' g''>4. <a' d'' fis''>8 <g' b' e''> <e' a'> | % 91
    <a' d'' fis'' a''>4. <a' cis'' e'' g''>8 <a' d'' fis''> <g' cis'' e''> | % 92
    <g' a' d''>4 <g' a' cis''>8 <g' cis'' e''>4 <cis' e' a'>8 | % 93
    <fis' a' d'' fis''>4. <fis' c'' e''>8 <fis' a' c'' d''> <c' fis' a'> | % 94
    <g' b' d'' g''>4. <b' d'' fis''>8 <g' b' e''> <a a'> | % 95
    <bes' d'' f'' bes''>4.-> <cis'' e'' g'' a''>8 <cis'' e'' g''> <g' cis'' e''> | % 96
    <d' fis' a' d''>4. <e' e''>8 <fis' fis''> <g' g''> | % 97
   \tempo \markup \italic { largamente } <b' d'' g'' b''>4. <b' d'' g'' a''>4. | % 98
    <bes' d'' g'' bes''>4. <bes' d'' g'' a''>4. | % 99
    <a' d'' fis'' a''>4. <a' cis'' e'' g''>8 <a' d'' fis''> <g' cis'' e''> | % 100
    <d' fis' a' d''>2.\arpeggio\fermata | % 101
  \time 2/4 \partial 8 \tempo "Andantino, come un ricordo" 4 = 72 a'8^\markup { \italic "dolcissimo" } | % 102
    fis''4( e''8 d'') | % 103
    cis''8.( d''16 e''8 g'') | % 104
    fis''8( a'' d'' fis'') | % 105
    e''4 r8 a'8 | % 106
    fis''4( e''8 d'') | % 107
    b''4( a''8 g'') | % 108
    \tag #'layout { a''8( fis'' e''8.\trill d''32 e'') } \tag #'midi { a''8( fis'' fis''32 e'' fis'' e'' fis'' e'' d'' e'') } | % 109
    d''4 r4\fermata | % 110
  \time 6/8 \tempo "Presto con fuoco" 4. = 108 a'16 d'' fis'' a'' fis'' d'' a'16 d'' fis'' a'' fis'' d'' | % 111
    a'16 d'' fis'' a'' fis'' d'' a'16 d'' fis'' a'' fis'' d'' | % 112
    b'16 d'' e'' g'' e'' d'' b'16 d'' e'' g'' e'' d'' | % 113
    a'16 d'' fis'' a'' fis'' d'' a'16 cis'' e'' g'' e'' cis'' | % 114
    a'16 cis'' e'' g'' e'' cis'' g'16 cis'' e'' a'' e'' cis'' | % 115
    a'16 d'' fis'' a'' fis'' d'' a'16 d'' fis'' a'' fis'' d'' | % 116
    b'16 d'' g'' b'' g'' d'' b'16 d'' e'' g'' e'' d'' | % 117
    bes'16 d'' g'' bes'' g'' d'' a'16 cis'' e'' g'' e'' cis'' | % 118
    \ottava #1 fis''16 a'' d''' fis''' d''' a'' fis''16 a'' d''' fis''' d''' a'' | % 119
    g''16 b'' d''' g''' d''' b'' g''16 b'' d''' g''' d''' b'' | % 120
    g''16 bes'' d''' g''' d''' bes'' g''16 bes'' d''' g''' d''' bes'' | % 121
    gis''16 bes'' d''' f''' d''' bes'' gis''16 bes'' d''' f''' d''' bes'' | % 122
    a''16 d''' fis''' a''' fis''' d''' \ottava #0 cis'''16 a'' g'' e'' <a a'>8-> | % 123
  \time 4/4 \break \tempo "Grave" 4 = 40 <fis' a' d'' fis''>2.-> <e' g' cis'' e''>4 | % 124
    <d' fis' a' d''>1\arpeggio\fermata \bar "|." | % 125
}
lhMusic = {
  \key d \minor \time 4/4 \partial 4  <a,, a,>4-> | % 0
    <f, f>2.-> <e, e>4 | % 1
    <d, d>4-> <cis, bes,>2\fermata <bes,, bes,>4-> | % 2
    <ges, ges>2.-> <f, f>4 | % 3
    <es, es>4-> <a,,, a,,>2\fermata r4 | % 4
   \stemNeutral d,16 a,16 d16 f16 a16 \change Staff = "RH" d'16 f'16 a'16 d''16 a'16 f'16 d'16 \change Staff = "LH" a16 f16 d16 a,16 | % 5
    cis,16 a,16 e16 g16 \change Staff = "RH" cis'16 e'16 g'16 a'16 e''16 cis''16 a'16 g'16 e'16 cis'16 \change Staff = "LH" g16 e16 | % 6
    c,16 a,16 d16 f16 a16 \change Staff = "RH" c'16 d'16 a'16 f''16 d''16 a'16 f'16 d'16 c'16 \change Staff = "LH" a16 f16 | % 7
    b,,16 g,16 d16 g16 b16 \change Staff = "RH" d'16 g'16 b'16 g''16 d''16 b'16 g'16 d'16 \change Staff = "LH" b16 g16 d16 | % 8
    bes,,16 f,16 d16 gis16 \change Staff = "RH" d'16 f'16 gis'16 d''16 gis''16 f''16 d''16 gis'16 f'16 d'16 \change Staff = "LH" gis16 d16 | % 9
    a,,16 a,16 d16 f16 a16 \change Staff = "RH" d'16 f'16 a'16 cis''16 e''16 g''16 a''16 g''16 e''16 cis''16 a'16 \change Staff = "LH" | % 10
    <a,, e, a,>1*15/8\fermata | % 11
  \time 6/8  d,8 a, f a f a, | % 12
    d,8 a, f a f a, | % 13
    g,8 d bes e' bes d | % 14
    a,8 f d' a, e cis' | % 15
    a,8 e g cis' g e | % 16
    d,8 a, f c, a, fis | % 17
    bes,,8 g, d g d g, | % 18
    g,8 bes es' a, g cis' | % 19
    d,8 a, f a d' a | % 20
    bes,,8 f, d f d f, | % 21
    g,,8 d, f c, g, es | % 22
    f,,8 c, es a es c, | % 23
    bes,,8 f, d as d f, | % 24
    es,8 bes, g bes g bes, | % 25
    a,,8 e, g cis' bes g | % 26
    a,,8 d f a f d | % 27
    a,,8 e, g cis' g e, | % 28
    d,16 a, f a d' a f d a, d f a | % 29
    g,16 d bes e' bes d g, d bes e' bes d | % 30
    a,16 d f a d' a a, e g cis' e' cis' | % 31
    a,16 e g cis' e' cis' a,, e, a, cis e g | % 32
    d,16 a, d f a d' c, a, d fis d a, | % 33
    bes,,16 g, d g bes d' bes,, g, d g d g, | % 34
    g,16 es bes es' g' es' a,16 e g cis' g e | % 35
    bes,,16 f, d f bes f bes,, f, d f d f, | % 36
    c,16 g, bes, d f bes c, g, bes, e g bes | % 37
    c,16 g, bes, e g bes c'4\fermata r8 | % 38
  \time 2/4 \key f \major  f16 c' a c' f c' a c' | % 39
    e16 c' bes c' e c' bes c' | % 40
    f16 c' a c' f c' a c' | % 41
    c16 g e g c g e g | % 42
    f16 c' a c' f c' a c' | % 43
    d16 bes f bes d bes f bes | % 44
    c16 a f a c bes g bes | % 45
    f16 c' a c' f8 r8 | % 46
    c16 g bes g c g bes g | % 47
    c16 a f a c a f a | % 48
    c16 g bes g c g bes g | % 49
    c16 g bes g c g bes g | % 50
    f16 c' a c' f c' a c' | % 51
    e16 c' bes c' e c' bes c' | % 52
    f16 c' a c' f c' a c' | % 53
    c16 g e g c g e g | % 54
    f16 c' a c' f c' a c' | % 55
    d16 bes f bes d bes f bes | % 56
    c16 a f a c bes g bes | % 57
    f16 c' a c' f8 r8 | % 58
  \key d \minor  d,16 d d, d d, d d, d | % 59
    cis,16 cis cis, cis cis, cis cis, cis | % 60
    d,16 d d, d d, d d, d | % 61
    a,,16 a, a,, a, a,, a, a,, a, | % 62
    bes,,16 bes, bes,, bes, bes,, bes, bes,, bes, | % 63
    g,,16 g, g,, g, g,, g, g,, g, | % 64
    <a,, a,>4-> r4 | % 65
  \time 6/8  r4. r4 <a,, a,>8 | % 66
    <f, f>4.-> <e, e>8 <d, d> <a,, a,> | % 67
    <g, g>4.-> <f, f>8 <e, e> <a,, a,> | % 68
    <a, a>4.-> <g, g>8 <f, f> <e, e> | % 69
    <d, d>4 <cis, cis>8 <e, e>4 <a,, a,>8 | % 70
    <f, f>4.-> <e, e>8 <d, d> <a,, a,> | % 71
    <g, g>4.-> <f, f>8 <e, e> <a,, a,> | % 72
    <bes, bes>4.-> <a, a>8 <g, g> <e, e> | % 73
    <d, d>4.-> r8 r8 <c, c>8 | % 74
    <as, as>4.-> <g, g>8 <f, f> <es, es> | % 75
    <b,, b,>4.-> <ais,, ais,>8 <gis,, gis,> <fis,, fis,> | % 76
    <d, d>4.-> <cis, cis>8 <b,, b,> <a,, a,> | % 77
    d,16 a, d f d a, c, g, bes, e bes, g, | % 78
    f,16 c f as f c es, bes, des g des bes, | % 79
    gis,16 dis gis b gis dis fis,16 cis e ais e cis | % 80
    b,,16 fis, b, d b, fis, a,,16 e, g, cis g, e, | % 81
    a,,16 a, a,, a, a,, a, a,, a, a,, a, a,, a, | % 82
    a,,16 a, a,, a, a,, a, a,, a, a,, a, a,, a, | % 83
    a,,16 a, a,, a, a,, a, a,, a, a,, a, a,, a, | % 84
    a,,16 a, a,, a, a,, a, a,, a, a,, a, a,, a, | % 85
    a,,16 a, a,, a, a,, a, a,, a, a,, a, a,, a, | % 86
    \clef treble bes''16 g'' e'' cis'' bes' g' e' cis' \clef bass bes g e cis | % 87
    bes,16 g, e, cis, bes,, g,, e,, cis,, <a,,, a,,>4\fermata | % 88
  \key d \major \partial 8  <a,, a,>8-> | % 89
    d,,16 a,, d, a, d fis d,,16 a,, d, a, d fis | % 90
    g,,16 d, g, b, e g g,,16 d, g, b, e g | % 91
    a,,16 e, a, d fis a a,,16 e, a, cis e g | % 92
    a,,16 e, a, cis e g a,,16 e, g, cis e a | % 93
    d,,16 a,, d, a, d fis c,16 a, d fis a fis | % 94
    b,,16 g, d g b d' b,, g, d g d g, | % 95
    bes,,16 f, bes, d f bes a,,16 e, a, cis e g | % 96
    d,,16 a,, d, a, d fis d,,16 a,, d, a, d fis | % 97
    g,,16 d, g, b, d g g,,16 d, g, b, d g | % 98
    bes,,16 g, d g bes d' bes,, g, d g bes d' | % 99
    a,,16 e, a, d fis a a,,16 e, a, cis e g | % 100
    <d,, a,, d,>2.\arpeggio\fermata | % 101
  \time 2/4 \partial 8  r8 | % 102
    d16 a fis a d a fis a | % 103
    cis16 a g a cis a g a | % 104
    d16 a fis a d a fis a | % 105
    a,16 e cis e a, e cis e | % 106
    d16 a fis a d a fis a | % 107
    b,16 g d g b, g d g | % 108
    a,16 fis d fis a, g e g | % 109
    d16 a fis a d8 r8 | % 110
  \time 6/8  r4. r4 <a,, a,>8 | % 111
    <fis, fis>4.-> <e, e>8 <d, d> <a,, a,> | % 112
    <g, g>4.-> <fis, fis>8 <e, e> <a,, a,> | % 113
    <a, a>4.-> <g, g>8 <fis, fis> <e, e> | % 114
    <d, d>4 <cis, cis>8 <e, e>4 <a,, a,>8 | % 115
    <fis, fis>4.-> <e, e>8 <d, d> <a,, a,> | % 116
    <g, g>4.-> <fis, fis>8 <e, e> <a,, a,> | % 117
    <bes, bes>4.-> <a, a>8 <g, g> <e, e> | % 118
    <d,, d,>8 <a d' fis'> <a d' fis'> <fis,, fis,>8 <a d' fis'> <a d' fis'> | % 119
    <g,, g,>8 <b d' g'> <b d' g'> <g,, g,>8 <b d' g'> <b d' g'> | % 120
    <bes,, bes,>8 <bes d' g'> <bes d' g'> <bes,, bes,>8 <bes d' g'> <bes d' g'> | % 121
    <bes,, bes,>8 <d' f' gis'> <d' f' gis'> <bes,, bes,>8 <d' f' gis'> <d' f' gis'> | % 122
    <a,, a,>8 <a d' fis'> <a d' fis'> <a,, a,>4. | % 123
  \time 4/4  <d,, d,>2.-> <a,,, a,,>4 | % 124
    <d,, a,, d,>1\arpeggio\fermata | % 125
}
dynMusic = {
  s4\ff |
  s1 |
  s4 s2\p s4\ff |
  s1 |
  s4 s2\sfz s4 |
  s1\pp |
  s1 |
  s1\< |
  s1\mp |
  s2\< s2\mf |
  s2\> s2\p |
  s4\p s4*13/2 |
  s4.\pp s4 s8\p |
  s2. |
  s4. s4.\< |
  s4.\! s4.\> |
  s4. s4 s8\! |
  s2. |
  s4.\< s4. |
  s4.\mf s4.\> |
  s4. s4 s8\p |
  s2.\pp |
  s2. |
  s2. |
  s2. |
  s4.\< s4. |
  s4.\mp s4.\> |
  s2. |
  s4. s4 s8\p |
  s2. |
  s4.\< s4. |
  s2. |
  s2. |
  s4.\f s4. |
  s4.\< s4. |
  s4.\ff s4. |
  s4.\> s4. |
  s4.\p s4.\> |
  s4. s4\! s8\p |
  s2 |
  s4\< s4\> |
  s4\! s4 |
  s2 |
  s2 |
  s4\< s4 |
  s4\mf s4\> |
  s4\p s4 |
  s2\< |
  s2 |
  s2 |
  s4\mf s4\> |
  s2\p |
  s2 |
  s4\< s4\> |
  s4\! s4 |
  s2 |
  s2\< |
  s4\f s4\> |
  s4\p s4 |
  s2\f |
  s2 |
  s2\< |
  s2 |
  s2\ff |
  s2 |
  s4\sfz s4 |
  s4.\pp\< s4 s8\f |
  s2. |
  s2. |
  s2. |
  s2. |
  s2.\ff |
  s2. |
  s2. |
  s4. s4.\< |
  s2. |
  s2. |
  s4. s4 s8\fff |
  s2. |
  s2. |
  s2. |
  s2. |
  s2.\ff\< |
  s2. |
  s2. |
  s2. |
  s2.\fff |
  s2. |
  s2 s4\sfz |
  s8\ff |
  s2. |
  s2. |
  s2. |
  s2. |
  s4. s4.\< |
  s2. |
  s4.\fff s4. |
  s4.\ff s4.\< |
  s2. |
  s2. |
  s4.\fff s4. |
  s2. |
  s8\pp |
  s2 |
  s2 |
  s2 |
  s2 |
  s2\< |
  s4\> s4 |
  s2 |
  s4\ppp s4 |
  s4.\f\< s4 s8\ff |
  s2. |
  s2. |
  s2. |
  s2. |
  s2. |
  s2. |
  s4. s4.\< |
  s2. |
  s2. |
  s2. |
  s2. |
  s2.\fff |
  s1 |
  s1 |
}
pedMusic = {
  s4\sustainOn |
  s2.\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s2\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s2\sustainOff\sustainOn s4\sustainOff |
  s1\sustainOn |
  s1\sustainOff\sustainOn |
  s1\sustainOff\sustainOn |
  s1\sustainOff\sustainOn |
  s1\sustainOff\sustainOn |
  s2\sustainOff\sustainOn s2\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4 s4 s8 s4\sustainOff\sustainOn s4 s4 s4 |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4 s8\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff |
  s2\sustainOn |
  s2\sustainOff\sustainOn |
  s2\sustainOff\sustainOn |
  s2\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff |
  s4\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff |
  s4.\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s8\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn |
  s8\sustainOff |
  s4\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s4\sustainOff\sustainOn s4\sustainOff |
  s4.\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s4.\sustainOff\sustainOn s4.\sustainOff\sustainOn |
  s2.\sustainOff\sustainOn s4\sustainOff\sustainOn |
  s1\sustainOff\sustainOn |
}

\score {
  \new PianoStaff \with { connectArpeggios = ##t } <<
    \new Staff = "RH" \new Voice = "rh" { \clef treble \removeWithTag #'midi \rhMusic }
    \new Dynamics \dynMusic
    \new Staff = "LH" \new Voice = "lh" { \clef bass \removeWithTag #'midi \lhMusic }
    \new Dynamics \with { pedalSustainStyle = #'mixed } \pedMusic
  >>
  \layout {
    \context { \Score \override SpacingSpanner.common-shortest-duration = #(ly:make-moment 1/12) }
  }
}
\score {
  \new PianoStaff <<
    \new Staff = "RH" \new Voice = "rh" { \removeWithTag #'layout \rhMusic }
    \new Staff = "LH" \new Voice = "lh" { \removeWithTag #'layout \lhMusic }
  >>
  \midi {
    \context { \Staff \remove "Staff_performer" }
    \context { \Voice \consists "Staff_performer" }
  }
}
