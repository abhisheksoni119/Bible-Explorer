// Curated KJV data for the Tools section.
// All verse text is from the King James Bible (public domain).
// Keep this file pure data — no DB or network access — so it can be imported
// from server components, API routes, and the build phase alike.

// ─── 1. Topical verses (Bible Verse Finder) ──────────────────────────────────
// Each topic has searchable keywords/synonyms and 5–7 hand-picked verses.
// Keyword matching is substring-insensitive against the keywords array.

export const TOPICAL_VERSES = [
  {
    topic: 'love',
    keywords: ['love', 'loving', 'beloved', 'charity'],
    verses: [
      { ref: 'John 3:16',         text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
      { ref: '1 John 4:8',        text: 'He that loveth not knoweth not God; for God is love.' },
      { ref: '1 Corinthians 13:4', text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,' },
      { ref: 'Romans 5:8',        text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.' },
      { ref: 'John 13:34',        text: 'A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another.' },
      { ref: '1 John 4:19',       text: 'We love him, because he first loved us.' },
    ],
  },
  {
    topic: 'faith',
    keywords: ['faith', 'believe', 'belief', 'trust', 'trusting'],
    verses: [
      { ref: 'Hebrews 11:1',  text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
      { ref: 'Romans 10:17',  text: 'So then faith cometh by hearing, and hearing by the word of God.' },
      { ref: 'Hebrews 11:6',  text: 'But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.' },
      { ref: 'Mark 11:22',    text: 'And Jesus answering saith unto them, Have faith in God.' },
      { ref: 'Ephesians 2:8', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:' },
      { ref: '2 Corinthians 5:7', text: 'For we walk by faith, not by sight.' },
    ],
  },
  {
    topic: 'hope',
    keywords: ['hope', 'hopeful', 'hopeless', 'despair'],
    verses: [
      { ref: 'Romans 15:13',  text: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.' },
      { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
      { ref: 'Romans 8:24',   text: 'For we are saved by hope: but hope that is seen is not hope: for what a man seeth, why doth he yet hope for?' },
      { ref: 'Hebrews 6:19',  text: 'Which hope we have as an anchor of the soul, both sure and stedfast, and which entereth into that within the veil;' },
      { ref: '1 Peter 1:3',   text: 'Blessed be the God and Father of our Lord Jesus Christ, which according to his abundant mercy hath begotten us again unto a lively hope by the resurrection of Jesus Christ from the dead,' },
    ],
  },
  {
    topic: 'peace',
    keywords: ['peace', 'peaceful', 'calm', 'rest'],
    verses: [
      { ref: 'John 14:27',          text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.' },
      { ref: 'Philippians 4:7',     text: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.' },
      { ref: 'Isaiah 26:3',         text: 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.' },
      { ref: 'Romans 5:1',          text: 'Therefore being justified by faith, we have peace with God through our Lord Jesus Christ:' },
      { ref: 'Colossians 3:15',     text: 'And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful.' },
    ],
  },
  {
    topic: 'joy',
    keywords: ['joy', 'joyful', 'rejoice', 'gladness', 'happy'],
    verses: [
      { ref: 'Psalm 16:11',         text: 'Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore.' },
      { ref: 'Nehemiah 8:10',       text: '...for the joy of the LORD is your strength.' },
      { ref: 'Philippians 4:4',     text: 'Rejoice in the Lord alway: and again I say, Rejoice.' },
      { ref: 'James 1:2',           text: 'My brethren, count it all joy when ye fall into divers temptations;' },
      { ref: 'Psalm 30:5',          text: '...weeping may endure for a night, but joy cometh in the morning.' },
    ],
  },
  {
    topic: 'prayer',
    keywords: ['pray', 'prayer', 'praying', 'petition', 'intercession'],
    verses: [
      { ref: '1 Thessalonians 5:17', text: 'Pray without ceasing.' },
      { ref: 'Philippians 4:6',      text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
      { ref: 'Matthew 7:7',          text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:' },
      { ref: 'James 5:16',           text: '...The effectual fervent prayer of a righteous man availeth much.' },
      { ref: 'Matthew 6:6',          text: 'But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.' },
    ],
  },
  {
    topic: 'forgiveness',
    keywords: ['forgive', 'forgiveness', 'forgiving', 'pardon', 'mercy'],
    verses: [
      { ref: '1 John 1:9',     text: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.' },
      { ref: 'Ephesians 4:32', text: 'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ\u2019s sake hath forgiven you.' },
      { ref: 'Matthew 6:14',   text: 'For if ye forgive men their trespasses, your heavenly Father will also forgive you:' },
      { ref: 'Colossians 3:13', text: 'Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye.' },
      { ref: 'Psalm 103:12',   text: 'As far as the east is from the west, so far hath he removed our transgressions from us.' },
    ],
  },
  {
    topic: 'salvation',
    keywords: ['salvation', 'saved', 'born again', 'eternal life', 'redemption'],
    verses: [
      { ref: 'Romans 10:9',      text: 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.' },
      { ref: 'Acts 4:12',        text: 'Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved.' },
      { ref: 'Ephesians 2:8',    text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:' },
      { ref: 'John 3:3',         text: '...Verily, verily, I say unto thee, Except a man be born again, he cannot see the kingdom of God.' },
      { ref: 'Romans 6:23',      text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.' },
    ],
  },
  {
    topic: 'grace',
    keywords: ['grace', 'gracious', 'unmerited favor'],
    verses: [
      { ref: '2 Corinthians 12:9', text: '...My grace is sufficient for thee: for my strength is made perfect in weakness...' },
      { ref: 'Ephesians 2:8',      text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:' },
      { ref: 'Titus 2:11',         text: 'For the grace of God that bringeth salvation hath appeared to all men,' },
      { ref: 'Romans 5:20',        text: '...But where sin abounded, grace did much more abound:' },
      { ref: 'Hebrews 4:16',       text: 'Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need.' },
    ],
  },
  {
    topic: 'strength',
    keywords: ['strength', 'strong', 'power', 'might', 'courage'],
    verses: [
      { ref: 'Philippians 4:13',  text: 'I can do all things through Christ which strengtheneth me.' },
      { ref: 'Isaiah 40:31',      text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
      { ref: 'Psalm 46:1',        text: 'God is our refuge and strength, a very present help in trouble.' },
      { ref: 'Joshua 1:9',        text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
      { ref: '2 Timothy 1:7',     text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
    ],
  },
  {
    topic: 'comfort',
    keywords: ['comfort', 'comforted', 'consolation', 'mourning', 'sorrow'],
    verses: [
      { ref: '2 Corinthians 1:3', text: 'Blessed be God, even the Father of our Lord Jesus Christ, the Father of mercies, and the God of all comfort;' },
      { ref: 'Matthew 5:4',       text: 'Blessed are they that mourn: for they shall be comforted.' },
      { ref: 'Psalm 23:4',        text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.' },
      { ref: 'Isaiah 41:10',      text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
      { ref: 'Revelation 21:4',   text: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.' },
    ],
  },
  {
    topic: 'healing',
    keywords: ['heal', 'healing', 'sick', 'sickness', 'sickness', 'illness', 'restoration'],
    verses: [
      { ref: 'Jeremiah 17:14', text: 'Heal me, O LORD, and I shall be healed; save me, and I shall be saved: for thou art my praise.' },
      { ref: 'Psalm 147:3',    text: 'He healeth the broken in heart, and bindeth up their wounds.' },
      { ref: 'Isaiah 53:5',    text: '...with his stripes we are healed.' },
      { ref: 'James 5:14',     text: 'Is any sick among you? let him call for the elders of the church; and let them pray over him, anointing him with oil in the name of the Lord:' },
      { ref: '3 John 1:2',     text: 'Beloved, I wish above all things that thou mayest prosper and be in health, even as thy soul prospereth.' },
    ],
  },
  {
    topic: 'fear',
    keywords: ['fear', 'afraid', 'scared', 'terror', 'fearful'],
    verses: [
      { ref: 'Isaiah 41:10',      text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
      { ref: '2 Timothy 1:7',     text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
      { ref: 'Psalm 27:1',        text: 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?' },
      { ref: 'Joshua 1:9',        text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
      { ref: '1 John 4:18',       text: 'There is no fear in love; but perfect love casteth out fear...' },
    ],
  },
  {
    topic: 'anxiety',
    keywords: ['anxiety', 'anxious', 'worry', 'worried', 'stress', 'stressed', 'overwhelmed'],
    verses: [
      { ref: 'Philippians 4:6',  text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
      { ref: '1 Peter 5:7',      text: 'Casting all your care upon him; for he careth for you.' },
      { ref: 'Matthew 6:34',     text: 'Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.' },
      { ref: 'Psalm 55:22',      text: 'Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved.' },
      { ref: 'John 14:1',        text: 'Let not your heart be troubled: ye believe in God, believe also in me.' },
    ],
  },
  {
    topic: 'money',
    keywords: ['money', 'finance', 'financial', 'wealth', 'riches', 'poverty', 'provision'],
    verses: [
      { ref: 'Philippians 4:19', text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.' },
      { ref: 'Matthew 6:33',     text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
      { ref: '1 Timothy 6:10',   text: 'For the love of money is the root of all evil: which while some coveted after, they have erred from the faith, and pierced themselves through with many sorrows.' },
      { ref: 'Proverbs 3:9',     text: 'Honour the LORD with thy substance, and with the firstfruits of all thine increase:' },
      { ref: 'Hebrews 13:5',     text: 'Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.' },
    ],
  },
  {
    topic: 'marriage',
    keywords: ['marriage', 'married', 'husband', 'wife', 'spouse'],
    verses: [
      { ref: 'Genesis 2:24',     text: 'Therefore shall a man leave his father and his mother, and shall cleave unto his wife: and they shall be one flesh.' },
      { ref: 'Ephesians 5:25',   text: 'Husbands, love your wives, even as Christ also loved the church, and gave himself for it;' },
      { ref: 'Ephesians 5:33',   text: '...let every one of you in particular so love his wife even as himself; and the wife see that she reverence her husband.' },
      { ref: 'Proverbs 18:22',   text: 'Whoso findeth a wife findeth a good thing, and obtaineth favour of the LORD.' },
      { ref: 'Mark 10:9',        text: 'What therefore God hath joined together, let not man put asunder.' },
    ],
  },
  {
    topic: 'family',
    keywords: ['family', 'parents', 'father', 'mother', 'household'],
    verses: [
      { ref: 'Joshua 24:15',     text: '...as for me and my house, we will serve the LORD.' },
      { ref: 'Proverbs 22:6',    text: 'Train up a child in the way he should go: and when he is old, he will not depart from it.' },
      { ref: 'Ephesians 6:1',    text: 'Children, obey your parents in the Lord: for this is right.' },
      { ref: 'Psalm 127:3',      text: 'Lo, children are an heritage of the LORD: and the fruit of the womb is his reward.' },
      { ref: 'Deuteronomy 6:6',  text: 'And these words, which I command thee this day, shall be in thine heart:' },
    ],
  },
  {
    topic: 'children',
    keywords: ['children', 'child', 'kids', 'son', 'daughter'],
    verses: [
      { ref: 'Mark 10:14',       text: '...Suffer the little children to come unto me, and forbid them not: for of such is the kingdom of God.' },
      { ref: 'Matthew 18:3',     text: 'And said, Verily I say unto you, Except ye be converted, and become as little children, ye shall not enter into the kingdom of heaven.' },
      { ref: 'Proverbs 22:6',    text: 'Train up a child in the way he should go: and when he is old, he will not depart from it.' },
      { ref: 'Psalm 127:3',      text: 'Lo, children are an heritage of the LORD: and the fruit of the womb is his reward.' },
      { ref: '3 John 1:4',       text: 'I have no greater joy than to hear that my children walk in truth.' },
    ],
  },
  {
    topic: 'friendship',
    keywords: ['friend', 'friendship', 'friends', 'companion'],
    verses: [
      { ref: 'Proverbs 17:17',   text: 'A friend loveth at all times, and a brother is born for adversity.' },
      { ref: 'Proverbs 18:24',   text: 'A man that hath friends must shew himself friendly: and there is a friend that sticketh closer than a brother.' },
      { ref: 'John 15:13',       text: 'Greater love hath no man than this, that a man lay down his life for his friends.' },
      { ref: 'Ecclesiastes 4:9', text: 'Two are better than one; because they have a good reward for their labour.' },
      { ref: 'Proverbs 27:17',   text: 'Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.' },
    ],
  },
  {
    topic: 'wisdom',
    keywords: ['wisdom', 'wise', 'understanding', 'knowledge'],
    verses: [
      { ref: 'James 1:5',        text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.' },
      { ref: 'Proverbs 9:10',    text: 'The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding.' },
      { ref: 'Proverbs 3:5',     text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
      { ref: 'Proverbs 1:7',     text: 'The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction.' },
      { ref: 'Colossians 2:3',   text: 'In whom are hid all the treasures of wisdom and knowledge.' },
    ],
  },
  {
    topic: 'patience',
    keywords: ['patience', 'patient', 'longsuffering', 'waiting'],
    verses: [
      { ref: 'James 1:4',        text: 'But let patience have her perfect work, that ye may be perfect and entire, wanting nothing.' },
      { ref: 'Romans 12:12',     text: 'Rejoicing in hope; patient in tribulation; continuing instant in prayer;' },
      { ref: 'Galatians 6:9',    text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.' },
      { ref: 'Psalm 27:14',      text: 'Wait on the LORD: be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD.' },
      { ref: 'Ecclesiastes 7:8', text: 'Better is the end of a thing than the beginning thereof: and the patient in spirit is better than the proud in spirit.' },
    ],
  },
  {
    topic: 'kindness',
    keywords: ['kind', 'kindness', 'gentle', 'gentleness'],
    verses: [
      { ref: 'Ephesians 4:32',   text: 'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ\u2019s sake hath forgiven you.' },
      { ref: 'Proverbs 11:17',   text: 'The merciful man doeth good to his own soul: but he that is cruel troubleth his own flesh.' },
      { ref: 'Colossians 3:12',  text: 'Put on therefore, as the elect of God, holy and beloved, bowels of mercies, kindness, humbleness of mind, meekness, longsuffering;' },
      { ref: 'Galatians 5:22',   text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,' },
      { ref: 'Luke 6:35',        text: '...and ye shall be the children of the Highest: for he is kind unto the unthankful and to the evil.' },
    ],
  },
  {
    topic: 'anger',
    keywords: ['anger', 'angry', 'wrath', 'rage', 'temper'],
    verses: [
      { ref: 'Ephesians 4:26',   text: 'Be ye angry, and sin not: let not the sun go down upon your wrath:' },
      { ref: 'Proverbs 15:1',    text: 'A soft answer turneth away wrath: but grievous words stir up anger.' },
      { ref: 'James 1:19',       text: '...let every man be swift to hear, slow to speak, slow to wrath:' },
      { ref: 'Proverbs 14:29',   text: 'He that is slow to wrath is of great understanding: but he that is hasty of spirit exalteth folly.' },
      { ref: 'Colossians 3:8',   text: 'But now ye also put off all these; anger, wrath, malice, blasphemy, filthy communication out of your mouth.' },
    ],
  },
  {
    topic: 'suffering',
    keywords: ['suffering', 'trial', 'trials', 'tribulation', 'pain', 'hardship'],
    verses: [
      { ref: 'Romans 5:3',        text: '...we glory in tribulations also: knowing that tribulation worketh patience;' },
      { ref: 'James 1:2',         text: 'My brethren, count it all joy when ye fall into divers temptations;' },
      { ref: 'Romans 8:18',       text: 'For I reckon that the sufferings of this present time are not worthy to be compared with the glory which shall be revealed in us.' },
      { ref: '1 Peter 5:10',      text: 'But the God of all grace, who hath called us unto his eternal glory by Christ Jesus, after that ye have suffered a while, make you perfect, stablish, strengthen, settle you.' },
      { ref: '2 Corinthians 4:17', text: 'For our light affliction, which is but for a moment, worketh for us a far more exceeding and eternal weight of glory;' },
    ],
  },
  {
    topic: 'death',
    keywords: ['death', 'dying', 'died', 'mortality', 'mortal'],
    verses: [
      { ref: '1 Corinthians 15:55', text: 'O death, where is thy sting? O grave, where is thy victory?' },
      { ref: 'John 11:25',          text: '...I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live:' },
      { ref: 'Psalm 23:4',          text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.' },
      { ref: '2 Corinthians 5:8',   text: 'We are confident, I say, and willing rather to be absent from the body, and to be present with the Lord.' },
      { ref: 'Revelation 21:4',     text: 'And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain...' },
    ],
  },
  {
    topic: 'eternal life',
    keywords: ['eternal life', 'eternity', 'everlasting', 'heaven'],
    verses: [
      { ref: 'John 3:16',     text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
      { ref: 'John 10:28',    text: 'And I give unto them eternal life; and they shall never perish, neither shall any man pluck them out of my hand.' },
      { ref: '1 John 5:13',   text: 'These things have I written unto you that believe on the name of the Son of God; that ye may know that ye have eternal life...' },
      { ref: 'John 17:3',     text: 'And this is life eternal, that they might know thee the only true God, and Jesus Christ, whom thou hast sent.' },
      { ref: 'Romans 6:23',   text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.' },
    ],
  },
  {
    topic: 'gratitude',
    keywords: ['gratitude', 'thanks', 'thankful', 'thanksgiving', 'grateful'],
    verses: [
      { ref: '1 Thessalonians 5:18', text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.' },
      { ref: 'Psalm 107:1',          text: 'O give thanks unto the LORD, for he is good: for his mercy endureth for ever.' },
      { ref: 'Colossians 3:17',      text: 'And whatsoever ye do in word or deed, do all in the name of the Lord Jesus, giving thanks to God and the Father by him.' },
      { ref: 'Psalm 100:4',          text: 'Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.' },
      { ref: 'Philippians 4:6',      text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
    ],
  },
  {
    topic: 'work',
    keywords: ['work', 'labor', 'job', 'career', 'employment'],
    verses: [
      { ref: 'Colossians 3:23',  text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;' },
      { ref: 'Proverbs 16:3',    text: 'Commit thy works unto the LORD, and thy thoughts shall be established.' },
      { ref: 'Ecclesiastes 9:10', text: 'Whatsoever thy hand findeth to do, do it with thy might...' },
      { ref: '2 Thessalonians 3:10', text: '...if any would not work, neither should he eat.' },
      { ref: 'Proverbs 14:23',   text: 'In all labour there is profit: but the talk of the lips tendeth only to penury.' },
    ],
  },
  {
    topic: 'guidance',
    keywords: ['guidance', 'guide', 'direction', 'lead', 'leading', 'decision'],
    verses: [
      { ref: 'Proverbs 3:5',      text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
      { ref: 'Proverbs 3:6',      text: 'In all thy ways acknowledge him, and he shall direct thy paths.' },
      { ref: 'Psalm 32:8',        text: 'I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye.' },
      { ref: 'Psalm 119:105',     text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
      { ref: 'Isaiah 30:21',      text: 'And thine ears shall hear a word behind thee, saying, This is the way, walk ye in it...' },
    ],
  },
  {
    topic: 'humility',
    keywords: ['humility', 'humble', 'meek', 'meekness', 'pride'],
    verses: [
      { ref: 'James 4:10',       text: 'Humble yourselves in the sight of the Lord, and he shall lift you up.' },
      { ref: 'Philippians 2:3',  text: 'Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves.' },
      { ref: 'Proverbs 11:2',    text: 'When pride cometh, then cometh shame: but with the lowly is wisdom.' },
      { ref: '1 Peter 5:6',      text: 'Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time:' },
      { ref: 'Matthew 5:5',      text: 'Blessed are the meek: for they shall inherit the earth.' },
    ],
  },
];

// ─── 2. Emotion → verse mapping (Bible Emotion Finder) ───────────────────────

export const EMOTIONS = [
  { id: 'anxious',     label: 'Anxious / Worried',  topicKey: 'anxiety' },
  { id: 'afraid',      label: 'Afraid / Fearful',   topicKey: 'fear' },
  { id: 'sad',         label: 'Sad / Grieving',     topicKey: 'comfort' },
  { id: 'lonely',      label: 'Lonely',             topicKey: 'comfort' },
  { id: 'angry',       label: 'Angry',              topicKey: 'anger' },
  { id: 'guilty',      label: 'Guilty / Ashamed',   topicKey: 'forgiveness' },
  { id: 'hopeless',    label: 'Hopeless / Despair', topicKey: 'hope' },
  { id: 'weak',        label: 'Weak / Tired',       topicKey: 'strength' },
  { id: 'confused',    label: 'Confused / Lost',    topicKey: 'guidance' },
  { id: 'unloved',     label: 'Unloved / Rejected', topicKey: 'love' },
  { id: 'thankful',    label: 'Thankful / Grateful', topicKey: 'gratitude' },
  { id: 'joyful',      label: 'Joyful / Happy',     topicKey: 'joy' },
  { id: 'doubting',    label: 'Doubting',           topicKey: 'faith' },
  { id: 'restless',    label: 'Restless / No Peace', topicKey: 'peace' },
  { id: 'tempted',     label: 'Tempted',            topicKey: 'strength' },
];

// ─── 3. Daily verse rotation (Daily Bible Verse) ─────────────────────────────
// 80 popular KJV verses; rotated deterministically by day-of-year so the same
// date always yields the same verse, but it changes every day.

export const DAILY_VERSES = [
  { ref: 'John 3:16',           text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { ref: 'Philippians 4:13',    text: 'I can do all things through Christ which strengtheneth me.' },
  { ref: 'Jeremiah 29:11',      text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
  { ref: 'Proverbs 3:5',        text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { ref: 'Romans 8:28',         text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { ref: 'Psalm 23:1',          text: 'The LORD is my shepherd; I shall not want.' },
  { ref: 'Isaiah 41:10',        text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
  { ref: 'Joshua 1:9',          text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
  { ref: 'Matthew 11:28',       text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { ref: 'Philippians 4:6',     text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
  { ref: 'Philippians 4:7',     text: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.' },
  { ref: '2 Corinthians 5:17',  text: 'Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.' },
  { ref: 'Galatians 2:20',      text: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me...' },
  { ref: 'Ephesians 2:8',       text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:' },
  { ref: 'Romans 12:2',         text: 'And be not conformed to this world: but be ye transformed by the renewing of your mind...' },
  { ref: 'Romans 10:9',         text: 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.' },
  { ref: '1 Corinthians 13:4',  text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,' },
  { ref: 'John 14:6',           text: '...I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
  { ref: 'Matthew 6:33',        text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
  { ref: 'Psalm 46:1',          text: 'God is our refuge and strength, a very present help in trouble.' },
  { ref: 'Psalm 119:105',       text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { ref: 'Isaiah 40:31',        text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { ref: 'Romans 5:8',          text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.' },
  { ref: '1 John 4:8',          text: 'He that loveth not knoweth not God; for God is love.' },
  { ref: '1 John 1:9',          text: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.' },
  { ref: 'Hebrews 11:1',        text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
  { ref: 'James 1:5',           text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.' },
  { ref: '1 Peter 5:7',         text: 'Casting all your care upon him; for he careth for you.' },
  { ref: 'Matthew 5:16',        text: 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.' },
  { ref: 'Romans 8:31',         text: '...If God be for us, who can be against us?' },
  { ref: 'Romans 8:38',         text: 'For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come,' },
  { ref: 'Romans 8:39',         text: 'Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.' },
  { ref: 'John 1:1',            text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
  { ref: 'Genesis 1:1',         text: 'In the beginning God created the heaven and the earth.' },
  { ref: 'Psalm 27:1',          text: 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?' },
  { ref: 'Psalm 34:18',         text: 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.' },
  { ref: 'Psalm 37:4',          text: 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.' },
  { ref: 'Psalm 91:1',          text: 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.' },
  { ref: 'Psalm 91:11',         text: 'For he shall give his angels charge over thee, to keep thee in all thy ways.' },
  { ref: 'Psalm 100:1',         text: 'Make a joyful noise unto the LORD, all ye lands.' },
  { ref: 'Psalm 121:1',         text: 'I will lift up mine eyes unto the hills, from whence cometh my help.' },
  { ref: 'Psalm 139:14',        text: 'I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.' },
  { ref: 'Psalm 145:18',        text: 'The LORD is nigh unto all them that call upon him, to all that call upon him in truth.' },
  { ref: 'Proverbs 3:6',        text: 'In all thy ways acknowledge him, and he shall direct thy paths.' },
  { ref: 'Proverbs 16:3',       text: 'Commit thy works unto the LORD, and thy thoughts shall be established.' },
  { ref: 'Proverbs 18:10',      text: 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.' },
  { ref: 'Proverbs 22:6',       text: 'Train up a child in the way he should go: and when he is old, he will not depart from it.' },
  { ref: 'Ecclesiastes 3:1',    text: 'To every thing there is a season, and a time to every purpose under the heaven:' },
  { ref: 'Isaiah 26:3',         text: 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.' },
  { ref: 'Isaiah 53:5',         text: 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.' },
  { ref: 'Isaiah 55:8',         text: 'For my thoughts are not your thoughts, neither are your ways my ways, saith the LORD.' },
  { ref: 'Jeremiah 17:7',       text: 'Blessed is the man that trusteth in the LORD, and whose hope the LORD is.' },
  { ref: 'Lamentations 3:22',   text: 'It is of the LORD\u2019s mercies that we are not consumed, because his compassions fail not.' },
  { ref: 'Lamentations 3:23',   text: 'They are new every morning: great is thy faithfulness.' },
  { ref: 'Matthew 5:3',         text: 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.' },
  { ref: 'Matthew 5:6',         text: 'Blessed are they which do hunger and thirst after righteousness: for they shall be filled.' },
  { ref: 'Matthew 6:34',        text: 'Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.' },
  { ref: 'Matthew 7:7',         text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:' },
  { ref: 'Matthew 28:20',       text: '...lo, I am with you alway, even unto the end of the world. Amen.' },
  { ref: 'Mark 11:24',          text: 'Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them.' },
  { ref: 'Luke 1:37',           text: 'For with God nothing shall be impossible.' },
  { ref: 'Luke 6:31',           text: 'And as ye would that men should do to you, do ye also to them likewise.' },
  { ref: 'John 8:32',           text: 'And ye shall know the truth, and the truth shall make you free.' },
  { ref: 'John 14:27',          text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.' },
  { ref: 'John 15:13',          text: 'Greater love hath no man than this, that a man lay down his life for his friends.' },
  { ref: 'John 16:33',          text: '...In the world ye shall have tribulation: but be of good cheer; I have overcome the world.' },
  { ref: 'Acts 1:8',            text: 'But ye shall receive power, after that the Holy Ghost is come upon you...' },
  { ref: 'Romans 12:12',        text: 'Rejoicing in hope; patient in tribulation; continuing instant in prayer;' },
  { ref: 'Romans 15:13',        text: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.' },
  { ref: '1 Corinthians 10:13', text: 'There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able...' },
  { ref: '2 Corinthians 4:18',  text: '...for the things which are seen are temporal; but the things which are not seen are eternal.' },
  { ref: '2 Corinthians 12:9',  text: '...My grace is sufficient for thee: for my strength is made perfect in weakness...' },
  { ref: 'Galatians 5:22',      text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,' },
  { ref: 'Ephesians 4:32',      text: 'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ\u2019s sake hath forgiven you.' },
  { ref: 'Ephesians 6:10',      text: 'Finally, my brethren, be strong in the Lord, and in the power of his might.' },
  { ref: 'Philippians 4:19',    text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.' },
  { ref: 'Colossians 3:23',     text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;' },
  { ref: '1 Thessalonians 5:17', text: 'Pray without ceasing.' },
  { ref: '1 Thessalonians 5:18', text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.' },
  { ref: '2 Timothy 1:7',       text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
  { ref: 'Hebrews 13:5',        text: '...he hath said, I will never leave thee, nor forsake thee.' },
  { ref: 'James 1:2',           text: 'My brethren, count it all joy when ye fall into divers temptations;' },
  { ref: '1 Peter 5:10',        text: 'But the God of all grace, who hath called us unto his eternal glory by Christ Jesus, after that ye have suffered a while, make you perfect, stablish, strengthen, settle you.' },
];

// ─── 4. Suggested situations (Prayer Generator placeholder hints) ────────────
export const PRAYER_SITUATIONS = [
  'anxiety or worry',
  'a sick loved one',
  'guidance for a big decision',
  'gratitude and thanksgiving',
  'forgiveness for a sin',
  'strength in temptation',
  'peace in conflict',
  'a new job or career',
  'marriage and family',
  'grief and loss',
  'financial provision',
  'starting the day',
  'before a meal',
  'before sleep',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function findTopicByKeyword(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  if (!q) return null;
  // Exact keyword match first.
  for (const t of TOPICAL_VERSES) {
    if (t.keywords.some(k => k === q)) return t;
  }
  // Then substring match.
  for (const t of TOPICAL_VERSES) {
    if (t.keywords.some(k => k.includes(q) || q.includes(k))) return t;
  }
  return null;
}

export function getEmotion(id) {
  return EMOTIONS.find(e => e.id === id) || null;
}

export function getTopicByKey(topicKey) {
  return TOPICAL_VERSES.find(t => t.topic === topicKey) || null;
}

export function dailyVerseFor(date = new Date()) {
  // Day-of-year (0-365), then mod by length so the same date always picks the same verse.
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff  = date.getTime() - start.getTime();
  const day   = Math.floor(diff / 86400000);
  const idx   = ((day % DAILY_VERSES.length) + DAILY_VERSES.length) % DAILY_VERSES.length;
  return { ...DAILY_VERSES[idx], dayOfYear: day, index: idx };
}

export function listAllTopicSlugs() {
  return TOPICAL_VERSES.map(t => t.topic);
}
// step0-rebuild-marker
