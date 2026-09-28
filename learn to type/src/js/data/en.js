/* English practice material. Words are roughly ordered by frequency. */

const DATA_EN = {
  words: `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or
an will my one all would there their what so up out if about who get which go me when make can like time no just him know take
people into year your good some could them see other than then now look only come its over think also back after use two how
our work first well way even new want because any these give day most us is was are were been has had did said made went got
came took may should need feel find tell ask seem try leave call keep let begin help talk turn start show hear play run move
live believe hold bring happen write sit stand lose pay meet include set learn lead understand watch follow stop create speak
read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut
reach remain suggest raise pass sell decide pull break thank here thing many where through long little very before great still
own old right big high such different small large next early young important few public bad same able last man woman child world
life hand part place case week company system question number night point home water room mother area money story fact month lot
study book eye job word issue side kind head house service friend father power hour game line end member law car city name team
minute idea kid body school face level office door health person art war history party result change morning reason girl boy
moment air teacher age music market sense plan interest death experience class field heart light voice mind price son view town
road value action season paper space ground form event matter center couple table court cost street image phone picture piece
land doctor wall news test movie north south east west love step baby computer type film tree source hair window truth song
never always often again already almost enough quite perhaps together soon later today tonight tomorrow yesterday once ever yet
away around down off above below between under while since until though both each every either several much more less least
too really sure free full special easy clear certain personal short single wrong past fine common poor natural similar hot dead
central happy serious ready simple left general dark close legal cold final main green nice huge popular wide deep strong soft
warm quiet quick slow fast heavy fresh clean dirty empty busy safe rich sweet bright calm brave wise funny lazy loud proud real
sharp smooth thick thin tiny wild dry red blue black white yellow brown gray orange pink purple gold silver
eat drink sleep dream fly swim sing dance laugh cry smile jump climb throw catch push carry wear wash cook draw paint fill hide
hit hope miss pick plant pour print rain rest ride ring roll save shake share shine shout shut sign smell solve taste touch
travel trust visit wake wish wonder worry cover drop enjoy explain fix guess join kiss knock land lift mark mix order pack park
plan point press reply report rush search smoke sound supply switch talk thank train wave wrap yell zip
garden kitchen bread coffee tea milk apple river mountain sea island forest lake sky sun moon snow wind weather summer winter
spring autumn animal dog cat bird fish horse cow flower grass stone fire color shirt shoe hat coat bag box bed chair desk floor
glass cup plate knife bottle key letter pen pencil map clock train bus plane boat ship bike ticket station hotel bank shop park
church hospital library museum village farm beach bridge corner middle top bottom front edge circle square shape size weight
speed dollar sport ball goal player match race prize gift dinner lunch breakfast meal food meat egg rice soup cake sugar salt
fruit lemon potato tomato cheese butter juice cookie honey salad pepper onion bean corn nut pie
job boss worker office meeting email message letter note list plan project task habit skill lesson practice finger keyboard
screen mouse button page text line word letter sentence story book paper chapter
family parent brother sister uncle aunt cousin wife husband daughter baby friend neighbor guest stranger king queen prince
doctor nurse farmer driver pilot artist writer singer dancer teacher student judge police soldier
able above accept across act actually add admit adult affect afraid against agent agree ahead allow alone along also although
among amount animal answer anyone anything appear apply approach argue arm arrive article artist aside attack attempt attend
avoid award aware bag ball bar base bear beat beautiful become bed behavior behind benefit best better beyond bill bit blood
board born box brain branch brief brother budget business camera campaign capital card care career carry catch cause cell
central century chair challenge chance character charge check choice choose citizen civil claim clearly coach cold collection
college color come common community compare concern condition conference contain continue control cost could country couple
course cover create crime cultural culture cup current customer dark data daughter deal debate decade decide decision deep
defense degree describe design despite detail determine develop difference difficult dinner direction discover discuss disease
dog dream drive drop during duty early economy edge effect effort eight either election else energy enjoy enter entire
environment especially establish evening event everybody everyone everything exactly example exist expert explain face fail
fall family far fast fear feeling few fight figure final finally financial find fine finish fire firm fish five floor focus
follow foot force foreign forget form forward four free friend front fund future garden gas general generation glass goal
green ground group grow growth guess gun guy hair half hang happy hard head health hear heart heat heavy hit hold hope hospital
hot hotel huge human hundred hurt husband idea identify image imagine impact improve include increase indeed indicate industry
inside instead institution interest interview involve item itself join just keep key kid kill kitchen knowledge land language
large late laugh lawyer lay lead leader learn least leave left leg less let letter level lie light likely line list listen
little live local long lose loss low machine magazine main maintain major manage manager many material matter maybe mean
measure media medical meet member memory mention message method middle might military million mind minute miss mission model
modern moment money month more morning most mother mouth move movement much music must myself name nation natural nature near
nearly necessary need network never news newspaper nice night nine none nor note nothing notice number occur off offer officer
official oil ok once one only onto open operation opportunity option order organization others outside owner page pain painting
paper parent particular partner party pass past patient pattern peace perform perhaps period person phone physical pick picture
piece place plan plant play player point police policy political poor popular population position positive possible power
practice prepare present president pressure pretty prevent price private probably problem process produce product production
professional program project property protect prove provide public pull purpose push quality question quickly quite race radio
raise range rate rather reach read ready real reality realize really reason receive recent recognize record red reduce reflect
region relate remain remove repeat represent require research resource respond response rest return reveal rich right rise risk
road rock role room rule safe same save scene school science score sea season seat second section security seek sell send
senior sense series serious serve service seven several shake share shoot short shot shoulder show side sign significant
similar simple simply since sing single sister site situation six size skill skin small smile social society soldier some
somebody someone something sometimes son song soon sort sound source space speak special specific speech spend sport spring
staff stage stand standard star start state statement station stay step still stock stop store story strategy street strong
structure student study stuff style subject success successful suddenly suffer summer support sure surface system table take
talk task teach team technology tell ten tend term test than thank that themselves theory thing think third those though thought
thousand threat three through throughout throw thus time today together tonight total tough toward town trade traditional
training travel treat treatment tree trial trip trouble true truth try turn twice type under understand unit until upon use
usually value various very victim view visit voice vote wait walk wall want watch water way weapon wear week weight well west
whatever wheel whether which while white whole whom whose why wide wife win wind window wish within without woman wonder word
work worker world worry would write writer wrong yard yeah year yes yet young yourself zone zero quiz quiet quote quarter queen
jazz joke judge juice jump jungle junior jury justice jacket jeans jewel jelly joy
ask add all fall glad gas had has hall lad sad salad dash flash shall hash half lag lash slash gag fad dad ash flask alas
sea see fee lie die side idea like hike desk seek feel heel ideal field fields hide skies dish fish kid lid said aid laid
fresh ride fire hire dirt tired stair rush hurry sure user rule dust just fruit fear gear dear hair fair`.split(/\s+/),

  names: `Anna Ben Clara David Emma Frank Grace Henry Ivy Jack Kate Leo Mia Noah Olivia Paul Quinn Rose Sam Tom Uma Victor
Will Yara Zoe Hannah Julia Kevin Laura Lucy Mike Nora Oscar Peter Iris Hugo Nina Owen Mary John James Lily Mark Ella Adam
Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October
November December London Paris Berlin Tokyo Rome Madrid Vienna Oslo Dublin Kansas Texas Ohio Utah Italy Japan Kenya Norway Peru
India Mexico Canada Brazil Egypt Greece Spain France Iceland Boston Chicago Denver Houston Miami Seattle Sydney Lima Kyoto
Nile Alps Moon Mars Venus Jupiter English French German Spanish Italian`.split(/\s+/),

  contractions: `don't can't won't it's I'm you're they're we're isn't aren't didn't doesn't let's that's there's what's I'll
you'll we'll I've you've wouldn't couldn't shouldn't haven't hasn't wasn't weren't he's she's who's here's I'd you'd`.split(/\s+/),

  qwords: ['what', 'why', 'how', 'where', 'when', 'who', 'which', 'can you', 'do you', 'is it', 'are we', 'did he', 'will she'],

  bigrams: 'th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce'.split(' '),
  trigrams: 'the and ing ion tio ent ati for her ter hat tha ere ate his con res ver all ons nce men ith ted ers pro thi wit are ess not ive was ect rea com eve per int est sta'.split(' '),

  sentences: String.raw`The quick brown fox jumps over the lazy dog.
Pack my box with five dozen liquor jugs.
How vexingly quick daft zebras jump!
Sphinx of black quartz, judge my vow.
The five boxing wizards jump quickly.
Jackdaws love my big sphinx of quartz.
The sun rose slowly over the quiet hills.
She keeps her keys in a small blue box by the door.
We walked along the river until it grew dark.
A good cup of tea can fix almost anything.
The train was late, so we missed the first part of the film.
My brother plays the guitar every evening after dinner.
It rained all night, and the garden looks fresh this morning.
Practice does not make perfect; it makes permanent.
Could you close the window? It is getting cold in here.
The old library smells of dust, paper and wood.
Every small step counts when you learn something new.
They painted the kitchen a warm shade of yellow.
I left my umbrella on the bus again.
The children built a castle out of sand and shells.
Our neighbor grows tomatoes, beans and sweet peppers.
He read the letter twice before he understood it.
The market opens at seven and closes at noon.
Fresh bread is best eaten while it is still warm.
She asked, "Where did you learn to cook like that?"
Nobody knew why the clock on the tower had stopped.
We need milk, eggs, flour and a little sugar.
The cat slept in a patch of sunlight all afternoon.
Keep your wrists relaxed and let your fingers do the work.
A long walk is a simple way to clear your head.
The museum is free on the first Sunday of every month.
Please send me the report by Friday afternoon.
The storm knocked down two trees on our street.
He spent the whole summer fixing up an old boat.
Learning to type well takes patience, not talent.
Don't worry about speed; focus on hitting the right keys.
The bakery on the corner sells the best rolls in town.
It's never too late to pick up a new skill.
We watched the stars from the roof until midnight.
Her garden is full of roses, tulips and wild herbs.
The meeting was moved from Tuesday to Thursday.
Turn left at the bridge and follow the road to the lake.
They're planning a trip to the mountains next spring.
What time does the last bus leave tonight?
My grandmother still writes letters by hand.
The soup needs a pinch of salt and some pepper.
A quiet room makes it easier to concentrate.
The team trained hard and won the final match.
Can you hear the birds singing outside?
The price of coffee has gone up again this year.
He forgot his keys, his phone and his wallet.
The road winds through fields of wheat and corn.
She speaks three languages and is learning a fourth.
We arrived early, so we had time for breakfast.
The river froze over during the long, cold winter.
Honesty is the best policy, even when it is hard.
The lights went out just as the movie began.
I'd rather walk than wait an hour for a taxi.
The workers finished the new bridge ahead of schedule.
Time flies when you are having fun.
A friend in need is a friend indeed.
Mistakes are proof that you are trying.
The sky turned orange, then pink, then deep purple.
We shared a pizza and talked until late at night.
The new park has a playground, a pond and a small kiosk.
His handwriting is so small that nobody can read it.
Good habits are built one day at a time.
The bus driver waved as we crossed the street.
They found an old map hidden inside a book.
The wind carried the smell of the sea far inland.
Clear your desk before you start working.
The kettle whistled, and the house filled with steam.
Please keep your voice down in the reading room.
My sister collects stamps from all over the world.
The waiter brought us water, bread and olives.
You can't learn to swim by reading about it.
We'll meet at the station at half past ten.
The painting shows a small ship on a stormy sea.
The coach told us to breathe slowly and stay calm.
Snow covered the fields like a thick white blanket.
The lamp on my desk is older than I am.
Everyone laughed when the parrot said hello.
The path was steep, but the view was worth it.
The students listened quietly while the teacher spoke.
There's a spare key under the flower pot.
The engine made a strange noise, then stopped.
Our town holds a music festival every July.
She wrapped the gift in brown paper and string.
The ferry crosses the bay every twenty minutes.
Why do cats always sit on the one thing you need?
Hard work beats talent when talent does not work hard.
The leaves crunched under our boots in the park.
He likes his coffee black and his toast well done.
The office is quiet on Friday afternoons.
Few things feel better than a good night's sleep.
The children counted the days until the holidays.
Keep calm, breathe, and let your fingers find the keys.
Is it really Monday again already?
What a beautiful morning!
Watch out for the ice on the steps!
The well-known author signed copies of her new book.
Our long-term goal is to type without thinking about it.
Some people type with two fingers; others use all ten.
The dog barked; the baby woke up; the day had begun.
Remember: slow is smooth, and smooth is fast.
There are three rules: be kind, be curious, be patient.
"Well," he said, "that went better than expected."
The word "typewriter" can be typed using only the top row.
"Ready?" she asked. "Ready!" they shouted back.
The farmer checked the fence after the strong winds.
A single candle lit up the entire room.
The fox hid quietly behind the old wooden gate.
Jazz music drifted out of the open window.
The judge asked the jury to return a verdict.
Our flight leaves at 6:45 in the morning.
The recipe calls for 3 eggs and 250 grams of flour.
In 1969, two people walked on the moon for the first time.
The hotel has 120 rooms and a small pool on the roof.
He ran 5 kilometers in just under 24 minutes.
Page 42 explains the whole idea in one short paragraph.
The shop is open from 9 to 5, Monday to Saturday.
Only 7 of the 30 students had read the book.
The package weighed 2.5 kilograms and arrived on May 3.
Call me at 555-0147 if anything changes.
She was born on 12 March 1994 in a small coastal town.
Room 404 is at the end of the hall, next to the stairs.
At 3:15 the bell rang and the hallway filled with noise.
The survey asked 1,200 people about their daily habits.
Temperatures dropped to minus 12 degrees overnight.
The lighthouse has guided ships home since 1887.
Our score went from 45 to 78 in just two weeks!
The e-mail arrived at 11:30, just before the deadline.
The concert starts at 8 p.m. sharp; please be on time.
The recipe (my mother's) has been in the family for years.
The tickets cost $15 each, or $40 for a family of four.
About 70% of the Earth's surface is covered by water.
The code was simple: x = 4 * (y + 2).
Send your questions to info@example.com before June.
The file is stored in C:\Users\anna\notes.txt on her laptop.
Use #practice to share your progress with friends.
The discount is 25% on all books & magazines.
She typed [draft] at the top of every unfinished page.
Set the value to {x: 10, y: 20} and try again.
The path ~/docs/notes holds all of my drafts.
If a < b and b < c, then a < c.
The pipe | character is used a lot on the command line.
Tag every file_name with the date, like report_2024_05.
2^10 equals 1024, a number every programmer knows.
The total came to $1,234.56 including tax.
A journey of a thousand miles begins with one step.`.split('\n'),

  /* Context templates for punctuation and symbols. T provides random material from learned keys. */
  tpl: {
    ',': [T => `${T.w()}, ${T.w()} ${T.w()}`, T => `${T.w()}, ${T.w()}, ${T.w()} and ${T.w()}`, T => `yes, ${T.w()}`],
    '.': [T => `${T.W()} ${T.w()} ${T.w()}.`, T => `${T.W()} ${T.w()}.`],
    "'": [T => T.c(), T => `${T.w()}'s ${T.w()}`, T => `${T.c()} ${T.w()}`],
    '"': [T => `"${T.w()}"`, T => `"${T.W()} ${T.w()}," ${T.w()} said.`, T => `the "${T.w()}" ${T.w()}`],
    '?': [T => `${cap(T.q())} ${T.w()} ${T.w()}?`, T => `${T.W()} ${T.w()}?`, T => `${T.q()}?`],
    ':': [T => `${T.w()}: ${T.w()}, ${T.w()}`, T => `${T.W()}: ${T.w()} ${T.w()}.`, T => `note: ${T.w()}`],
    ';': [T => `${T.w()} ${T.w()}; ${T.w()} ${T.w()}`],
    '-': [T => `${T.w()}-${T.w()}`, T => `well-${T.w()}`, T => `${T.n()}-${T.n()}`],
    '/': [T => `${T.w()}/${T.w()}`, () => 'and/or', T => `${T.n()}/${T.n()}`, () => 'km/h', () => 'yes/no'],
    '!': [T => `${T.W()}!`, T => `${T.W()} ${T.w()}!`, () => 'Stop!', () => 'Wow!'],
    '@': [T => `${T.w()}@${T.w()}.com`, T => `@${T.w()}`, T => `${T.w()}.${T.w()}@mail.org`],
    '#': [T => `#${T.w()}`, T => `#${T.n()}`, T => `room #${T.n()}`],
    '$': [T => `$${T.n()}`, T => `$${T.n()}.${T.d()}${T.d()}`, T => `${T.n()} $`],
    '%': [T => `${T.n()}%`, T => `${T.n()}.${T.d()}%`, () => '100%'],
    '^': [T => `${T.d()}^${T.d()}`, T => `x^${T.d()}`, () => '^_^'],
    '&': [T => `${T.W()} & ${T.W()}`, T => `${T.w()} & ${T.w()}`, () => 'R&D', () => 'Q&A'],
    '*': [T => `*${T.w()}*`, T => `${T.n()} * ${T.n()}`, T => `${T.w()}*`],
    '(': [T => `(${T.w()})`, T => `(${T.w()} ${T.w()})`, T => `f(${T.w()})`, T => `(${T.n()})`],
    ')': [T => `(${T.w()})`, T => `(see page ${T.n()})`, T => `(${T.n()})`],
    '_': [T => `${T.w()}_${T.w()}`, T => `_${T.w()}_`, T => `__${T.w()}__`],
    '+': [T => `${T.n()} + ${T.n()}`, T => `${T.w()}+${T.w()}`, () => 'C++'],
    '=': [T => `${T.w()} = ${T.n()}`, T => `${T.n()} + ${T.n()} = ${T.n()}`, T => `${T.w()} == ${T.w()}`],
    '[': [T => `[${T.w()}]`, T => `${T.w()}[${T.d()}]`, T => `[${T.n()}, ${T.n()}]`],
    ']': [T => `[${T.w()}]`, T => `${T.w()}[${T.d()}]`],
    '{': [T => `{ ${T.w()} }`, T => `{${T.w()}: ${T.n()}}`],
    '}': [T => `{ ${T.w()} }`, T => `{${T.w()}: ${T.n()}}`],
    '\\': [T => `${T.w()}\\${T.w()}`, T => `C:\\${T.w()}\\${T.w()}`],
    '|': [T => `${T.w()} | ${T.w()}`, T => `${T.w()}|${T.w()}`, () => 'a || b'],
    '`': [T => `\`${T.w()}\``, T => `\`${T.w()} ${T.w()}\``],
    '~': [T => `~/${T.w()}`, T => `~${T.n()} km`, T => `~${T.w()}`],
    '<': [T => `${T.n()} < ${T.n()}`, T => `<${T.w()}>`, () => 'a <= b'],
    '>': [T => `${T.n()} > ${T.n()}`, T => `<${T.w()}>`, () => 'x -> y']
  }
};
