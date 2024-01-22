/* eslint-disable unicorn/numeric-separators-style */
import { type Kysely, sql } from "kysely"

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("quotes")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("quote", "text", (col) => col.notNull())
    .addColumn("author", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("quoted_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db
    // @ts-expect-error: we don't have types for this database since it doesn't
    // exist yet, but we can see the schema right above, so this is very
    // low-risk
    .insertInto("quotes")
    .values([
      {
        quote: "Master hacker",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527134380),
      },
      {
        quote: "I can break code in real time",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "Ohhhhhh.... woops :)",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "[Adam tries activate-power-mode in Atom for the first time, sees that it lags] These particles were written in the Crysis engine.",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "What does HA stand for [in HAProxy]? Oh, it stands for High Aperformance",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "vim is pretty much all you need (except for everything else you also need)",
        author: "ShpirtMan",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "Ncurses. Nurses with a C, GOT IT!",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "You'll know this worked when you see a bunch of hex garbage on the screen.",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: '"sudo not found"? Well, this computer is useless 4Head',
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "I'm an artistic genius, guys. *shows prototype graphics where the lasers were just green squares* Look at those lasers... HYPER REALISTIC. The problem is that *real life* rendered them wrong.",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: '"My computer can\'t take rejection"',
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "(the quote is too long to paste here, please visit https://share.bot.land/quotes/sir_crashed_quote.txt )",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "I don't know how to use my own game",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "(the quote is too long to paste here, please visit https://share.bot.land/quotes/shpirtman_quote.txt )",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "Is there no one brave enough to face Echo9Hotel and his zapper bots?",
        author: "ECHO9HOTEL",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "Yeah you can ignore that red text, it means everything passed.",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: " https://share.bot.land/quotes/panda_quote.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "oh no… oh no… oh nodejs",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: " https://share.bot.land/quotes/panda_quote2.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "I think i'll recode this whole project in Haskell now",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: " https://share.bot.land/quotes/dibs_quote.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          '(Adam was upgrading Node) "C:\\Program Files\\ nodejs will be overwritten and all contents will be lost. Do you want to proceed?" "Uh oh, this doesn\'t sound good. *groans* Alright, I\'ll just click okay."',
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: 'I\'m doing what I call "Comedy Programming" right now',
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "(I was testing out EMP and there was a bug where EMPing the same target multiple times would crash the server) linco95: if(canEMP('server')){ emp('server');}",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "Guys, I found a cheat in the wiki. You don't need to use hardware to win! Ctrl + K Kill all bots [ctrl+K killed all of your OWN bots]",
        author: "iamarkay",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: " https://share.bot.land/quotes/thepeckingbird.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "it's rude to type off screen Kappa",
        author: "MCSMike",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "`debian.cmd` sounds like a cruel joke",
        author: "ShpirtMan",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: " https://share.bot.land/quotes/fade2222.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: " https://share.bot.land/quotes/weedly_shpirtman.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "Nothing is on fire, so we're good to go.",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "Twitch has been having a lot of issues recently, I wonder if they have someone like me working there?",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          '"I started barking at her and things got weird" (context deleted due to Oddshot going offline FeelsBadMan )',
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote:
          "It's not super broken, it's just broken... there's a difference",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460527135747),
      },
      {
        quote: "I have never played chess with a Parakeet in my life",
        author: "AdamLearnsLive",
        quoted_at: new Date(1460564017399),
      },
      {
        quote:
          "Don't worry, when you are making millions on this and you hire some 20 yr old fresh out of CS101, i'm sure they will maintain the code quality Kappa",
        author: "EveryJuan",
        quoted_at: new Date(1460766512777),
      },
      {
        quote:
          "I've already donated to Adam. I stalked him, found out where he lived and followed him to the store. When he got into the store I dropped a $5 bill on the ground and tossed a small rock towards making him look down and pick up the $5 bill",
        author: "WeeDLY93",
        quoted_at: new Date(1464386867512),
      },
      {
        quote:
          '"3000 dependencies and now your button is big and purple Keepo " -resure_, as Adam was researching how to style components in React',
        author: "resure_",
        quoted_at: new Date(1464817977854),
      },
      {
        quote:
          "I have all the negative properties of a chicken and all the negative properties of nodejs",
        author: "kukurikuu",
        quoted_at: new Date(1465942391688),
      },
      {
        quote: " http://i.imgur.com/AqVp8xp.jpg ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1466539371775),
      },
      {
        quote:
          "DevOps is like eating a pizza. Except the pizza is on fire and you are on fire and you die",
        author: "WeeDLY93",
        quoted_at: new Date(1467737289518),
      },
      {
        quote:
          "How many commands do you have setup? It's amazing - you're the only streamer I know of who has a command which compares him to a hipster peacock.",
        author: "Thelzy",
        quoted_at: new Date(1468021000760),
      },
      {
        quote:
          "Wieldingclaw: I figured out about you because your mom told me about you at the dentists",
        author: "Wieldingclaw",
        quoted_at: new Date(1469555240118),
      },
      {
        quote:
          '"just throw botland in the trash and start working on a new game" - kukurikuu, when Adam couldn\'t figure out the best design for Bot Land on day 171.',
        author: "kukurikuu",
        quoted_at: new Date(1469575621016),
      },
      {
        quote:
          "BIueberryKing: @Thadddeus, Do you program yourself? AdamLearnsLive: You program yourself? Most people aren't robots so they can't do that.",
        author: "AdamLearnsLive",
        quoted_at: new Date(1470680318861),
      },
      {
        quote: "I have one idea and one idea only",
        author: "AdamLearnsLive",
        quoted_at: new Date(1472067036804),
      },
      {
        quote: "Chat can't be trusted with !hair",
        author: "AdamLearnsLive",
        quoted_at: new Date(1472490867416),
      },
      {
        quote:
          "When I got my hair cut, I just sat in silence, and answered It's okay anytime she asked if I liked it. - UnknownEviI",
        author: "UnknownEviI",
        quoted_at: new Date(1472512465373),
      },
      {
        quote:
          "I'm always making my homework, being a productive member of society, then the sweating starts and i wake up realising it's only a dream, and i go back to watching adam's stream Kappa - Remy_rm",
        author: "Remy_rm",
        quoted_at: new Date(1473267415004),
      },
      {
        quote: " https://share.bot.land/quotes/shpirtman_quote2.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1474388101790),
      },
      {
        quote:
          "whenever someone says my name I like to imagine that they're just making a statement",
        author: "I_Like_Bunnies",
        quoted_at: new Date(1474645877658),
      },
      {
        quote: " https://share.bot.land/quotes/japanesespidercrab.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1475195630135),
      },
      {
        quote: "My cat also likes watching Adam Kappa",
        author: "ShpirtMan",
        quoted_at: new Date(1475509847071),
      },
      {
        quote: " https://share.bot.land/quotes/everyjuan_quote.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1476718280467),
      },
      {
        quote: "I had to clean my room for this sub lol",
        author: "rekttt123",
        quoted_at: new Date(1476741087877),
      },
      {
        quote:
          "and here i thought all americans resolve their problems with a gun duel adam: we used to but we kept halving our population",
        author: "AdamLearnsLive",
        quoted_at: new Date(1477339071387),
      },
      {
        quote:
          "After EJ mentioned spearing was related to archery, the following edit was mysteriously added to wikipedia http://imgur.com/r9Qjj0B",
        author: "AdamLearnsLive",
        quoted_at: new Date(1477423606092),
      },
      {
        quote:
          "Wimbles: I was a cloud admin for a small firm and this guy said he was gonna do all these tests to break in.. so I made the secret passcode so insane that I forgot it",
        author: "Wimbles",
        quoted_at: new Date(1477515961457),
      },
      {
        quote:
          "We don't need to do anything, we can just test this in production 4Head",
        author: "AdamLearnsLive",
        quoted_at: new Date(1478036970812),
      },
      {
        quote:
          "Liquidor: Removing 10-15 lines of code and replacing it with 1 line of code should be an illegal drug",
        author: "Liquidor",
        quoted_at: new Date(1480448191423),
      },
      {
        quote:
          "[Adam was asking Thezarz whether his account name was zarz while I was looking into a bug] Thezarz: I'm on my smurf account AdamHasABigHead",
        author: "Thezarz",
        quoted_at: new Date(1484153590519),
      },
      {
        quote:
          "cgCasperX: adam you are my biggest inspiration to be less distracted when i code, but you are also my biggest distraction... lol",
        author: "cgCasperX",
        quoted_at: new Date(1484153594154),
      },
      {
        quote: " https://share.bot.land/quotes/jupeteer_ej.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153596810),
      },
      {
        quote: " https://share.bot.land/quotes/kukuriku.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153603720),
      },
      {
        quote: " https://share.bot.land/quotes/mike_shpirtman.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153606900),
      },
      {
        quote: " https://share.bot.land/quotes/ovexator.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153609934),
      },
      {
        quote: " https://share.bot.land/quotes/tjuranek.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153612492),
      },
      {
        quote: " https://share.bot.land/quotes/weedly_shpirtman2.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153614923),
      },
      {
        quote: " https://share.bot.land/quotes/xilly.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153617282),
      },
      {
        quote: " https://share.bot.land/quotes/zeth_ej.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1484153619925),
      },
      {
        quote: "I agree MCSMike is the best",
        author: "EveryJuan",
        quoted_at: new Date(1484157675844),
      },
      {
        quote:
          "Going to advertise the stream to my friends - He has been working on this for over a year http://i.imgur.com/Fs3GNWW.png ",
        author: "EveryJuan",
        quoted_at: new Date(1484243065778),
      },
      {
        quote:
          "My girlfriend wanted me to buy new shoes, so I went to town and ended up buying truffle for 120€ from an Italian gourmet store instead of shoes admBro",
        author: "jupeteer",
        quoted_at: new Date(1486667096117),
      },
      {
        quote:
          "I just want to Save as... your UI and move the saved files to my trash bin…",
        author: "Liquidor",
        quoted_at: new Date(1486667273636),
      },
      {
        quote:
          "*adam hears someone in line behind him grumbling about having a bad job etc, Adam spins around beaming his radiance upon the man, look on the bright side friend, I have L.E.D many to the bright side, come forth and rejoice says Adam. The man walks away and Adam is asked to leave subway",
        author: "XillyGames",
        quoted_at: new Date(1486667299434),
      },
      {
        quote:
          "Where do you put Java when you've killed it? In Java's Crypt. Kappa",
        author: "AdamLearnsLive",
        quoted_at: new Date(1486667305136),
      },
      {
        quote: " https://share.bot.land/quotes/antimattertape.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1486667358369),
      },
      {
        quote: " https://share.bot.land/quotes/daniel_nperry.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1486667362094),
      },
      {
        quote: " https://share.bot.land/quotes/ej_hideo.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1486667365390),
      },
      {
        quote: " https://share.bot.land/quotes/jbugzy.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1486667367741),
      },
      {
        quote: " https://share.bot.land/quotes/pawn.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1486667370173),
      },
      {
        quote: " https://share.bot.land/quotes/shpirtman_quote3.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1486667374230),
      },
      {
        quote:
          "wow, the irony of picking the steamroller skin because you're about to steamroll him Kappa",
        author: "Chaoscom",
        quoted_at: new Date(1487695363489),
      },
      {
        quote: "you know i dont use puntation or correct spelling",
        author: "OrinDrey",
        quoted_at: new Date(1496175291293),
      },
      {
        quote:
          "Hi Son...I mean Adam. How many Functions are there in the Object Class ?",
        author: "NotAdamsDad",
        quoted_at: new Date(1501861453567),
      },
      {
        quote:
          "Barisartt: The most fun part of this stream is figuring out what hotkeys he is using to fly across those screens. God i want that so bad Monadic_bind: lol @Barisartt it's what we all want Monadic_bind: coding with sonic the hedgehog",
        author: "Monadic_bind",
        quoted_at: new Date(1501861464099),
      },
      {
        quote:
          "Remy_rm: !time Remy_rm: damn you whispering me everythinng botlandbot SwiftRage i want to show off my awesome 404 hours Kappa Remy_rm: i have waited long.. (404 hours Kappa ) for that",
        author: "Remy_rm",
        quoted_at: new Date(1501861479670),
      },
      {
        quote:
          "I have made a grave refactoring mistake. You know when you pull on a thread of a sweater, and then you keep pulling, and the next thing you know the entire sweater is falling apart? The sweater is my code :|",
        author: "syntonic8",
        quoted_at: new Date(1501861522497),
      },
      {
        quote:
          "i actually dont even really like burgers, i dont know why i made this my username",
        author: "burgerlove_",
        quoted_at: new Date(1501861526204),
      },
      {
        quote:
          "WTS BotLand Scripts for v. Alpha. Guaranteed 1500+ rating. Fast delivery. Undetectable. One script for $10, two for $15. Pm me for info",
        author: "Liquidor",
        quoted_at: new Date(1501861529525),
      },
      {
        quote:
          "ok guys I'm sick and tired of you guys beating my defense. Botland is supposed to be a strategy game and not about using cheap dirty tricks like just walking up to my CPU and only targeting it with artillery instead of my numerous bots surrounding it and destroying it in the first phase without fighting my bots in an honest 1 on 1 battle, I worked hard to get to the #1 spot and you guys are not making it easy on me.",
        author: "AntiMatterTape",
        quoted_at: new Date(1501861532323),
      },
      {
        quote: "Make the forfeit button glow if you are facing adam Kappa",
        author: "Wraithyzz",
        quoted_at: new Date(1501861535615),
      },
      {
        quote:
          "your tax dollars are hard at work paying for me to sit in the library and watch botland",
        author: "Horforia",
        quoted_at: new Date(1501861538413),
      },
      {
        quote:
          "I still use carrier pigeons, your frame drops are equivalent to a shotgun to my pigeons BibleThump",
        author: "IAMABananaAMAA",
        quoted_at: new Date(1501861541997),
      },
      {
        quote:
          "[Adam said he fixed the computed-properties problem in Gulp with the help of like 4-5 people in chat] EveryJuan: RE: I fixed it -- http://i.imgur.com/mfC2yoV.jpg ",
        author: "EveryJuan",
        quoted_at: new Date(1501861599494),
      },
      {
        quote:
          "Neurd: Are you aiming for full code coverage or when do you write tests? Pawn_: aiming for 5% coverage. 4% more to go.",
        author: "Pawn_",
        quoted_at: new Date(1501861602480),
      },
      {
        quote:
          "Senshis: @Pawn_, Hey, how's it pawnin'? :P Pawn_: its always pawnin well Kappa",
        author: "Pawn_",
        quoted_at: new Date(1501861605292),
      },
      {
        quote:
          "[Adam just started his lunch break] JBugzy: My pizza is ready, my soda is cold, my position in the chair is perfect, and then he leaves. Perfect.",
        author: "JBugzy",
        quoted_at: new Date(1501861610567),
      },
      {
        quote:
          "MrDestructoid BabyRage HELLO ADAM MrDestructoid BabyRage I WANT TO REPORT A BUG MrDestructoid BabyRage MY OPPONENT MrDestructoid BabyRage IS USING BOTS MrDestructoid BabyRage",
        author: "Horforia",
        quoted_at: new Date(1501861613702),
      },
      {
        quote:
          "Haziallattwitch: do i get points from watching or being active in chat? IAMABananaAMAA: watching IAMABananaAMAA: he hacks your webcam to make sure your eyes are on him the whole time",
        author: "IAMABananaAMAA",
        quoted_at: new Date(1501861617516),
      },
      {
        quote:
          "Good news everyone! I am going to be an uncle! http://i.imgur.com/J7lKBLK.jpg ",
        author: "Wauteurz",
        quoted_at: new Date(1501861620779),
      },
      {
        quote:
          "3DExtended: @hideoo is there a way to convert a string to actual JavaScript code (I don't care about security right now) Adam13531: @3DExtended, eval? HiDeoo: Yeah eval HiDeoo: But be careful ^^ 3DExtended: Right ^^ thanks guys! HiDeoo: Remember if you're using eval, don't use eval Kappa",
        author: "HiDeoo",
        quoted_at: new Date(1501861626209),
      },
      {
        quote:
          "OH god adam, I was watchign a video and left your stream on then you came back when the video was still playing, I'm not ggonna get into what the video was on but lets just say I was trying to speak latin backwards to summon a dragon but then some of you words got mixed in and it's just this weird MrDestructoid with reckClap for arms and legs",
        author: "AntiMatterTape",
        quoted_at: new Date(1501861631738),
      },
      {
        quote:
          "@adam13531 - I wouldn't buy the camelbak - I hear they break when you add the straw",
        author: "SoulSorcerers",
        quoted_at: new Date(1501861636260),
      },
      {
        quote: "cache rules everything around me",
        author: "Pawn_",
        quoted_at: new Date(1501861642314),
      },
      {
        quote:
          "MrGreen0815: what happend? [Adam gave a long explanation about the work he was doing, why he was doing it, and what it meant] MrGreen0815: i didnt understand a word but thx aniway :D",
        author: "MrGreen0815",
        quoted_at: new Date(1501861647013),
      },
      {
        quote:
          "what if anonymous decides to ddos you with a botnet of 10 million computers because your game is racist against kitchen robots adam",
        author: "Voignarcs",
        quoted_at: new Date(1501861655560),
      },
      {
        quote:
          "hm, there's a bar between the chat and the stream I can move up and down without a noticeable effect https://gfycat.com/LiquidDemandingBeagle Kappa",
        author: "ShpirtMan",
        quoted_at: new Date(1501861658212),
      },
      {
        quote:
          "devops, the dark times of adams stream when no one had any clue what adam was doing, not even adam Kappa",
        author: "Wraithyzz",
        quoted_at: new Date(1501861671403),
      },
      {
        quote:
          "[There was a bug where no one's defense was working because Adam uploaded a new version of Bot Land with a different format] BIueberryKing: http://imgur.com/a/k0ilW",
        author: "BIueberryKing",
        quoted_at: new Date(1501861676374),
      },
      {
        quote:
          "[with respect to Adam's !bottle command] Basementbrb: Is that a giant sippycup WutFace",
        author: "Basementbrb",
        quoted_at: new Date(1501861680441),
      },
      {
        quote:
          "EveryJuan: I have to say, I am disappointed in Chipotle, they put way too much cheese on my bowl today EveryJuan: I might skip going there one day for retribution Kappa syntonic8: Too much cheese? syntonic8: You might as well say.... I'm having too much fun",
        author: "syntonic8",
        quoted_at: new Date(1501861683804),
      },
      {
        quote:
          "lol. wife was talking to me, and you kept talking, so she came over and hit the mute button on my keyboard and said Adam hush.",
        author: "Horforia",
        quoted_at: new Date(1501861687485),
      },
      {
        quote:
          "God I hope nobody discovers some genetic mutation coffee causes. With my consumption rate my kids are going to look like golum.",
        author: "YLivay",
        quoted_at: new Date(1501861692804),
      },
      {
        quote:
          "mitchell486 unsubs now that we're talking about language and it's rights and wrongs again. mitchell486: I think that it's is going to bother me a lot today.... I think my fingers betrayed me and now I look like a FOOL on the internet in front of at least 74 people...... FeelsBadMan mitchell486: Today. Mitch was wrong and got very embarrassed. This pleases me. - Adam 2017",
        author: "mitchell486",
        quoted_at: new Date(1501861713641),
      },
      {
        quote:
          "bad_hombres: mysql DansGame not using postgres you lose hipster cred bad_hombres: hipster cred > results/progress Tvirusfirefly: the hipster credd is just around the corner if the game goes viral bad_hombres: that's what I'm banking on, if this game gets big I want to be able to say I've tried it before it got popular",
        author: "bad_hombres",
        quoted_at: new Date(1501861717802),
      },
      {
        quote:
          "Pukateiubeste: what does an egg say when he's sorry? nD00rn: egg cuse me? Pukateiubeste: no Pukateiubeste: i'm sorry Pukateiubeste: OSsloth",
        author: "Pukateiubeste",
        quoted_at: new Date(1501861721199),
      },
      {
        quote:
          "LUL phone just turned on the screen to tell me its running out of battery and by doing that it drained itself from the last of it and shut down.",
        author: "YLivay",
        quoted_at: new Date(1501861724842),
      },
      {
        quote:
          "EveryJuan: Well, just bought faster than light on steam, named my crew after mods here... nD00rn died my first mission LUL nD00rn: BibleThump nD00rn: EJ how did I die? EveryJuan: nD00rn they shot my engine room and you burned to death EveryJuan: I restarted the game and you are alive again EveryJuan: I have Adam as pilot, so only a matter of time until we crash Kappa",
        author: "EveryJuan",
        quoted_at: new Date(1501861728023),
      },
      {
        quote:
          "Remy_rm: !discord BotLandBot: To join the Bot Land discord, click here: https://discord.gg/botland You can ask programming questions here, talk about how great Bot Land will hopefully be, etc. Remy_rm: well, that about covered this month's mod duties.",
        author: "Remy_rm",
        quoted_at: new Date(1501861733055),
      },
      {
        quote: "@adamswife13531 Fancy seeing you here too.",
        author: "notadam13531swife",
        quoted_at: new Date(1501861737637),
      },
      {
        quote:
          "[after Adam had to npm unpublish --force] Pawn_: *runs random destructive commands repeatedly in succession* admTroll",
        author: "Pawn_",
        quoted_at: new Date(1501861741352),
      },
      {
        quote:
          "[I had to remove the AC from the windowsill] EveryJuan: Next time can you do that a little bit closer to the microphone so my adrenal gland is completely emptied? Kappa",
        author: "EveryJuan",
        quoted_at: new Date(1501861745768),
      },
      {
        quote:
          "i swear. twitch is doing everything it can to make me not use it anymore",
        author: "Remy_rm",
        quoted_at: new Date(1501861749170),
      },
      {
        quote:
          "I have been waiting 356 days for adam to finally add padding to the login input fields",
        author: "syntonic8",
        quoted_at: new Date(1501861764687),
      },
      {
        quote:
          "[Adam said he had to talk to Jason about something] themushmouth: json and atom sitting in the tree Kappa",
        author: "themushmouth",
        quoted_at: new Date(1501861781272),
      },
      {
        quote:
          "[about the !??? command] LoChiamavanoBadur: Hey thats my creation where is copyright Keepo LoChiamavanoBadur: Ill sue you all LoChiamavanoBadur: I'm an artist I painted adam multiple times in multiple ways LoChiamavanoBadur: Im a padamainter",
        author: "LoChiamavanoBadur",
        quoted_at: new Date(1501861784278),
      },
      {
        quote:
          "dang I should have waited until he went to lunch to do real work, now I have finished my work and have nothing to watch FeelsPawnMan",
        author: "Pawn_",
        quoted_at: new Date(1501861787868),
      },
      {
        quote:
          "tests are for people who aren't confident in their product. and if you're not confident in your product then why are you even selling it in the first place!",
        author: "bad_hombres",
        quoted_at: new Date(1501861790967),
      },
      {
        quote:
          "Pawn_: hi im looking for advice on supercomputers, i want to build an aws competitor. my budget is $4 Pawn_: ya those shows are ridiculous. im a professional butterfly catcher and my husband is a part time snorkeler. our budget is $4.5 million",
        author: "Pawn_",
        quoted_at: new Date(1501861793509),
      },
      {
        quote:
          "That's why I'm sceptical about watching Adam13531 . It's obviously scripted since it's always the same. Adam13531 has a problem. HiDeoo finds a solution at the last moment and woo everyone is happy Kappa",
        author: "BIueberryKing",
        quoted_at: new Date(1501861797300),
      },
      {
        quote:
          "[Kapulara and EJ were both streaming] BIueberryKing: http://multitwitch.tv/kapulara/everyjuan BIueberryKing: Adam has raised children PogChamp",
        author: "BIueberryKing",
        quoted_at: new Date(1501861803318),
      },
      {
        quote: " https://share.bot.land/quotes/adam13531.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861807409),
      },
      {
        quote: " https://share.bot.land/quotes/adam13531_2.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861811279),
      },
      {
        quote: " https://share.bot.land/quotes/antimattertape2.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861846278),
      },
      {
        quote: " https://share.bot.land/quotes/digot.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861849674),
      },
      {
        quote: " https://share.bot.land/quotes/ej_hideo2.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861852525),
      },
      {
        quote: " https://share.bot.land/quotes/glowingsole_ej.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861855511),
      },
      {
        quote: " https://share.bot.land/quotes/lepko_ej.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861858452),
      },
      {
        quote: " https://share.bot.land/quotes/liquidor.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861861633),
      },
      {
        quote: " https://share.bot.land/quotes/mitchell.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861864777),
      },
      {
        quote: " https://share.bot.land/quotes/multiple.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861867584),
      },
      {
        quote: " https://share.bot.land/quotes/multiple2.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861870670),
      },
      {
        quote: " https://share.bot.land/quotes/ndoorn_ej.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861874586),
      },
      {
        quote: " https://share.bot.land/quotes/nperry.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861878404),
      },
      {
        quote: " https://share.bot.land/quotes/nperry_adam13531.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861883754),
      },
      {
        quote: " https://share.bot.land/quotes/prosam.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861887842),
      },
      {
        quote: " https://share.bot.land/quotes/remy_ej.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861891170),
      },
      {
        quote: " https://share.bot.land/quotes/shawntc_pawn.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861893988),
      },
      {
        quote: " https://share.bot.land/quotes/shpirtman4.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861897793),
      },
      {
        quote: " https://share.bot.land/quotes/syntonic_pawn.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861901352),
      },
      {
        quote: " https://share.bot.land/quotes/zankhrow_liquidor.txt ",
        author: "AdamLearnsLive",
        quoted_at: new Date(1501861903919),
      },
      {
        quote:
          "Kapulara: Its 22:43 PM here, So only 1 hour and 15 minutes left Kappa nD00rn: Kapulara Same here Kapulara: We live in the same country @nD00rn ffs nD00rn: Sshh nD00rn: I forgot admArt",
        author: "nD00rn",
        quoted_at: new Date(1502811749721),
      },
      {
        quote:
          "[we were talking about Roman numerals] BIueberryKing: AdamXMMMDXXXI nD00rn: (It is X with a bar on top of it, which means 10000)",
        author: "BIueberryKing",
        quoted_at: new Date(1502811814161),
      },
      {
        quote:
          "[it was the Day 365 celebration stream] Pawn_: TIL 1 man sitting in a room alone talking to a computer = party. Apparently I party every day",
        author: "Pawn_",
        quoted_at: new Date(1502811835348),
      },
      {
        quote:
          "Chklol: What's so secret about your height? Kappa TurboDave: He's so short, his stand-up desk is just a regular desk.",
        author: "TurboDave",
        quoted_at: new Date(1503093930426),
      },
      {
        quote:
          "@Adam13531 The cats we're talking about are stubborn. Give them a scratching post and they'll start worshipping it, destroying all else that could work as a scratching post. Give them a place to sleep and they work themselves behind the shelves or stuck between the rafters.",
        author: "Wauteurz",
        quoted_at: new Date(1503935368136),
      },
      {
        quote:
          "themushmouth: @Adam13531 did you know if you make your case led red. it goes faster? Kappa TurboDave: I prefer green LEDs. I'm environmentally-conscious.",
        author: "TurboDave",
        quoted_at: new Date(1510677644165),
      },
      {
        quote: "EJs chat is basically just a PM between EJ and HiDeoo Kappa",
        author: "Pawn_",
        quoted_at: new Date(1510677657170),
      },
      {
        quote:
          "[Adam said something waffly and then realized he was being dumb] IAMABananaAMAA: this is test code *pushes to production* it's still test",
        author: "IAMABananaAMAA",
        quoted_at: new Date(1510677671729),
      },
      {
        quote:
          "TwitchVotes (Sponsored Viewer): I love this streamer! Keep up the great work, Adam13531. I can't wait to play Bot Land™.",
        author: "11kazoos",
        quoted_at: new Date(1510677684422),
      },
      {
        quote:
          "Whatup everyone (360noscope's into a triple kickflip and lands it)",
        author: "KuDoKu",
        quoted_at: new Date(1510677691080),
      },
      {
        quote:
          "Speaking of Let's Play, I saw Skedog playing last night. Even got a sweet pic to show what he looks like: https://media.giphy.com/media/SC0VDXns3gvS0/giphy-facebook_s.jpg ",
        author: "TurboDave",
        quoted_at: new Date(1514912442988),
      },
      {
        quote: "Wishful Thinking Driven Development",
        author: "hebelebettin",
        quoted_at: new Date(1514912451784),
      },
      {
        quote:
          "So adam. I got a question. Who created this ( admArt ) emote? My client (Mr. Snek) is thinking of suing for copyright infringement. https://i.imgur.com/GeG1VfC.jpg ",
        author: "BlubQ",
        quoted_at: new Date(1514997853189),
      },
      {
        quote:
          "how does a date with adam go? so what do you do with a living? *adam pulls out a binder well on page 25 I talk about my job, it gets really interesting around page 114 where I talk about my backstory!",
        author: "Renegade_Pige",
        quoted_at: new Date(1515454011471),
      },
      {
        quote:
          "The first time I rinsed (after eating seed cookies) it was like I was a sunflower",
        author: "AdamLearnsLive",
        quoted_at: new Date(1515607111245),
      },
      {
        quote:
          "Conspiracy theory -> The stream duration is how long it takes Adam to drink that huge bottle of water. The stream is not about BotLand or coding, it's subliminally a way for Adam to become fully re-hydrated after a wild house party circa 2016... admParty admTroll",
        author: "ImRhysPYAH",
        quoted_at: new Date(1515796415818),
      },
      {
        quote:
          "[while Adam was on a lunch break] Man, this guy eats more lunches than anyone else i know",
        author: "OrinDrey",
        quoted_at: new Date(1516221738367),
      },
      {
        quote:
          "ma_we: can we give the chair a name ? nD00rn: Any suggestions? Karnakul: Mr. Swivels?",
        author: "Karnakul",
        quoted_at: new Date(1516380260949),
      },
      {
        quote:
          "[During a brb lunch screen] i like to watch the brb screen more than adam anyways Kappa",
        author: "Fulk33",
        quoted_at: new Date(1519676376453),
      },
      {
        quote: "I might not have counted to 5 correctly",
        author: "AdamLearnsLive",
        quoted_at: new Date(1522444445504),
      },
      {
        quote:
          "watching you use all those Sublime shortcuts is like watching one of those CSI scenes where two people are typing on the same keyboard and things are flying all over the screen. I have no idea what's going on but it looks impressive LUL",
        author: "vegeboi",
        quoted_at: new Date(1524671547465),
      },
      {
        quote:
          "[Adam was debating on whether he should do a very old TODO item] 15:33 nJoyMe: just do it, past adam is smart, just listen to him 15:34 FrozenZerker: Listen here future Adam, don't you dare cancel thi- Let's cancel that.",
        author: "FrozenZerker",
        quoted_at: new Date(1526053526114),
      },
      {
        quote:
          "I dont need a debugger. My code executes so slowly I can just watch it step-by-step Kappa",
        author: "BlubQ",
        quoted_at: new Date(1526942265439),
      },
      {
        quote: "Can I hack you? Can you dodge a ball?",
        author: "AdamLearnsLive",
        quoted_at: new Date(1528309739724),
      },
      {
        quote: "Hey, it's me, your brother",
        author: "AdamLearnsLive",
        quoted_at: new Date(1532368002200),
      },
      {
        quote: "Adam has been recreated. He has risen from the ashes",
        author: "AdamLearnsLive",
        quoted_at: new Date(1532456167203),
      },
      {
        quote: "Can't blame that one on magic",
        author: "AdamLearnsLive",
        quoted_at: new Date(1533144647068),
      },
      {
        quote: "So you have a free CI for $5/mo",
        author: "EveryJuan",
        quoted_at: new Date(1540593121626),
      },
      {
        quote:
          "what if adam actually sees the whole world as 1s and 0s and his glasses help him actually see it how we do.",
        author: "Lefteous",
        quoted_at: new Date(1541522638573),
      },
      {
        quote: "Hey @Anjouli - @tollus can you roleplay playing BotLand?",
        author: "thels",
        quoted_at: new Date(1575313170216),
      },
      {
        quote: " https://i.imgur.com/RZVZWOv.png LUL",
        author: "jooo_",
        quoted_at: new Date(1575313195062),
      },
      {
        quote:
          "[After Adam had complained about all the frame drops due to the Coronavirus quarantines] Smooth_Dog: I don't like all these extroverts stealing our bandwidth LUL",
        author: "Smooth_Dog",
        quoted_at: new Date(1585755817098),
      },
      {
        quote:
          'for every system design interview question, sit there in deep thought for a minute and then say "well, it depends", and then nothing else.',
        author: "c17r",
        quoted_at: new Date(1595951252535),
      },
      {
        quote:
          "Plus if you watch all the vods in reverse its about a guy who finds a website called bot.land and slowly removes code, much better story",
        author: "Homida",
        quoted_at: new Date(1599234453518),
      },
    ])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("quotes").execute()
}
