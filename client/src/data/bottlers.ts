export interface Bottler {
  name: string;
  country: string;
  region: string;
  founded: number;
  description: string;
  specialty: string;
  website?: string;
  notableReleases?: string[];
}

export const bottlers: Bottler[] = [
  {
    name: "Gordon & MacPhail",
    country: "Scotland",
    region: "Speyside",
    founded: 1895,
    description: "The world's oldest and most respected independent bottler, founded as a grocery and wine merchant in Elgin. Gordon & MacPhail holds one of the largest privately-held collections of maturing Scotch whisky, with casks dating back to the 1940s. They have long-standing relationships with distilleries across Scotland.",
    specialty: "Famed for exceptionally long-aged single malts, often releasing 50-, 60-, and even 70-year-old expressions. Their Connoisseurs Choice range has been a benchmark for independent bottlings since 1968. They also own Benromach distillery.",
    notableReleases: ["Generations series", "Connoisseurs Choice", "Private Collection", "Mr George Legacy"]
  },
  {
    name: "Signatory Vintage",
    country: "Scotland",
    region: "Highland",
    founded: 1988,
    description: "Founded by Andrew Symington in Edinburgh, Signatory has grown into one of the most prolific independent bottlers in Scotland. They own Edradour distillery — Scotland's smallest traditional distillery — and bottle a vast range of single cask whiskies at cask strength.",
    specialty: "Known for affordable, cask strength single cask bottlings with detailed cask information on every label. Their Un-Chillfiltered Collection offers natural color, non-chill-filtered whisky at an accessible price point.",
    notableReleases: ["Cask Strength Collection", "Un-Chillfiltered Collection", "Vintage series", "Edradour 10"]
  },
  {
    name: "Brühler Whiskyhaus",
    country: "Germany",
    region: "Nordrhein-Westfalen",
    founded: 2009,
    description: "A passionate independent bottler based in Brühl near Cologne, Germany. Brühler Whiskyhaus selects exceptional single casks from Scottish and international distilleries, bottling them with great care for the German and European market. Run by true whisky enthusiasts who personally visit distilleries to hand-pick their casks.",
    specialty: "Specializes in carefully curated single cask bottlings at natural cask strength, always without chill-filtration or artificial coloring. Known for discovering hidden gems from lesser-known distilleries and offering them at fair prices. Their selections reflect a deep understanding of cask maturation and a preference for quality over quantity.",
    notableReleases: ["Single Cask Selections", "Brühler Whiskyhaus Exclusives"]
  },
  {
    name: "Douglas Laing",
    country: "Scotland",
    region: "Glasgow",
    founded: 1948,
    description: "A family-run Glasgow bottler now in its third generation under Fred and Cara Laing. Douglas Laing is known for creative branding and exceptional cask selection, with a portfolio ranging from affordable blended malts to ultra-premium single cask releases.",
    specialty: "Pioneers of regional blended malts with their Big Peat (Islay) and Scallywag (Speyside) ranges. Their Old Particular and Provenance lines offer single cask bottlings at various ages and strengths, always natural color and non-chill-filtered.",
    notableReleases: ["Old Particular", "Big Peat", "Scallywag", "Rock Island", "Timorous Beastie", "The Epicurean"]
  },
  {
    name: "Hunter Laing",
    country: "Scotland",
    region: "Glasgow",
    founded: 2013,
    description: "Founded by Stewart Laing after the split of the original Laing family business, Hunter Laing has quickly established itself with an impressive inventory of rare casks. The company also built the Ardnahoe distillery on Islay, opened in 2019.",
    specialty: "Focuses on rare, old, and unusual single cask bottlings under the Old Malt Cask and First Editions ranges. Their Kinship series celebrates Islay distilleries with premium aged releases. Also owns Ardnahoe, Islay's newest distillery.",
    notableReleases: ["Old Malt Cask", "First Editions", "Kinship series", "Scarabus"]
  },
  {
    name: "Berry Bros. & Rudd",
    country: "England",
    region: "London",
    founded: 1698,
    description: "Britain's oldest wine and spirits merchant, operating from the same shop at 3 St James's Street in London since 1698. Berry Bros. has been bottling whisky under their own label since the early 20th century and created the famous Cutty Sark blend.",
    specialty: "Their Berry's Own Selection range offers carefully chosen single cask bottlings from top distilleries. Known for classic, understated presentation and impeccable cask selection reflecting centuries of experience in fine spirits. Creators of The Glenrothes single malt brand.",
    notableReleases: ["Berry's Own Selection", "Blue Hanger blend", "Classic Range"]
  },
  {
    name: "Cadenhead's",
    country: "Scotland",
    region: "Campbeltown",
    founded: 1842,
    description: "Scotland's oldest independent bottler, founded in Aberdeen and now based in Campbeltown next to Springbank distillery (same ownership). Cadenhead's has a reputation for uncompromising authenticity and transparency in whisky bottling.",
    specialty: "Every Cadenhead's bottling is non-chill-filtered with no added color — they were among the first to commit to this. Their small batch releases and shop exclusives are highly collectible. Known for bottling at original cask strength or specific ABV without compromise.",
    notableReleases: ["Original Collection", "Small Batch", "Authentic Collection", "Creations"]
  },
  {
    name: "Compass Box",
    country: "Scotland",
    region: "London",
    founded: 2000,
    description: "Founded by American-born John Glaser, a former Johnnie Walker marketing director, Compass Box is a modern whisky maker that has revolutionized blended whisky. Based in London, they craft artisanal blended malts and blended Scotch whiskies with radical transparency.",
    specialty: "Not a traditional independent bottler — Compass Box creates bespoke blended whiskies by sourcing and marrying components from multiple distilleries. Famous for pushing transparency boundaries, they list exact recipe percentages on their website. Their whiskies challenge the perception that blends are inferior to single malts.",
    notableReleases: ["The Peat Monster", "Hedonism", "Spice Tree", "The Story of the Spaniard", "Orchard House", "Glasgow Blend"]
  },
  {
    name: "That Boutique-y Whisky Company",
    country: "England",
    region: "London",
    founded: 2012,
    description: "A modern, playful independent bottler known for its distinctive comic-book style labels illustrated by Emily Chappell. Part of the Atom Group, they source casks from distilleries worldwide and release small batch bottlings with a focus on fun and accessibility.",
    specialty: "Democratizing rare whisky by bottling from prestigious and obscure distilleries alike in affordable small batches. Their illustrated labels tell the story of each distillery. They also produce gin, rum, and other spirits under sister brands. Releases include blended malts with creative flavor profiles.",
    notableReleases: ["Single malt range", "Blended whisky ranges", "World whisky series"]
  },
  {
    name: "Blackadder",
    country: "Scotland",
    region: "Highland",
    founded: 1995,
    description: "Founded by Robin Tucek, a renowned whisky writer, Blackadder takes a purist approach to whisky bottling. The company is known for its Raw Cask series, which takes natural whisky to the extreme by leaving the spirit completely unfiltered.",
    specialty: "Their Raw Cask range is bottled directly from the cask without any filtering — not even basic filtration — meaning the whisky may contain charred wood chips and cask sediment. This radical approach gives the most authentic cask experience possible. All bottlings are at cask strength with no color added.",
    notableReleases: ["Raw Cask", "Statement", "Smoking Islay"]
  },
  {
    name: "Adelphi",
    country: "Scotland",
    region: "Highland",
    founded: 1993,
    description: "Named after the historic Adelphi distillery in Glasgow (closed 1907), this independent bottler was revived by Jamie Walker. Adelphi focuses on small-batch, hand-selected casks and also owns Ardnamurchan distillery on the Scottish west coast, one of the most remote mainland distilleries.",
    specialty: "Renowned for meticulous cask selection and limited releases, often from silent or rare distilleries. Their ownership of Ardnamurchan distillery — powered largely by renewable energy — shows their commitment to combining tradition with innovation. Bottlings are always natural color and non-chill-filtered.",
    notableReleases: ["Adelphi Selection", "Breath of the Highlands", "Ardnamurchan single malt"]
  },
  {
    name: "Murray McDavid",
    country: "Scotland",
    region: "Speyside",
    founded: 1996,
    description: "Originally co-founded by Mark Reynier (who later revived Bruichladdich), Murray McDavid is now owned by Aceo Ltd. The company specializes in additional cask maturation, finishing whiskies in carefully selected wine, port, and other casks.",
    specialty: "Pioneers of 'ACE'ing' — Additional Cask Enhancement — where single malts are finished in specially selected casks (Bordeaux, Burgundy, Madeira, etc.) to add complexity. Each release documents the complete cask journey. Known for discovering how different wood finishes transform whisky character.",
    notableReleases: ["Benchmark", "Mission Gold", "Mystery Malt"]
  },
  {
    name: "Ian Macleod Distillers",
    country: "Scotland",
    region: "Edinburgh",
    founded: 1933,
    description: "A family-owned company that operates as both a distiller and an independent bottler. Ian Macleod owns Glengoyne, Tamdhu, and Rosebank distilleries while also bottling whisky from other distilleries under the Chieftain's brand.",
    specialty: "Unique position as both distillery owner and independent bottler. Their Chieftain's range features carefully selected single casks, while their own distilleries (Glengoyne and Tamdhu) showcase their commitment to sherry cask maturation. They famously revived the legendary Rosebank distillery.",
    notableReleases: ["Chieftain's", "Smokehead", "Edinburgh Gin", "As We Get It"]
  },
  {
    name: "Wemyss Malts",
    country: "Scotland",
    region: "Edinburgh",
    founded: 2005,
    description: "Founded by the Wemyss family from Fife, who have a connection to whisky dating back to 1824 when John Haig built his first distillery on their land. Wemyss Malts focuses on flavor-led whisky selection and naming, making single malts accessible through evocative tasting descriptors.",
    specialty: "Each bottling is named after its dominant flavor character rather than age or cask type — names like 'Velvet Fig', 'Spice King', or 'Blooming Gorse'. This flavor-first approach helps drinkers choose whisky based on taste preference. The family also owns Kingsbarns distillery in the Lowlands.",
    notableReleases: ["Single Cask Releases", "Spice King", "The Hive", "Peat Chimney", "Kingsbarns single malt"]
  },
  {
    name: "Samaroli",
    country: "Italy",
    region: "Rome",
    founded: 1968,
    description: "Founded by the legendary Silvano Samaroli, one of the most visionary figures in whisky history. Samaroli was among the first on the European continent to bottle single cask Scotch whisky. His artistic labels and impeccable palate made Samaroli bottlings among the most sought-after in the world.",
    specialty: "Samaroli bottlings are considered art in the whisky world — combining extraordinary liquid with beautiful, often hand-painted labels. Silvano Samaroli's personal selections from the 1970s and 1980s are now among the most valuable bottles at auction, with some fetching over €50,000. The brand continues after his passing in 2017.",
    notableReleases: ["Coilltean", "Bouquet series", "Evolution", "No Age"]
  },
  {
    name: "The Scotch Malt Whisky Society (SMWS)",
    country: "Scotland",
    region: "Edinburgh",
    founded: 1983,
    description: "A members-only club and bottler based in Leith, Edinburgh. SMWS bottles single cask whiskies from distilleries across Scotland and the world, identifying them only by a numerical code rather than the distillery name — adding an element of mystery and encouraging tasting without preconception.",
    specialty: "All bottles use a coded numbering system (e.g., 29.272) instead of distillery names, and each receives a creative, poetic tasting-note title like 'Campfire on a Pebble Beach'. Bottlings are always single cask, cask strength, non-chill-filtered, and natural color. The society operates tasting rooms worldwide.",
    notableReleases: ["Single cask numbered releases", "Outturn magazine selections"]
  },
  {
    name: "Whisky-Fässle",
    country: "Germany",
    region: "Baden-Württemberg",
    founded: 2009,
    description: "A small, family-run German independent bottler based in southern Germany. Whisky-Fässle is known for personally selecting single casks from Scottish distilleries and bottling them for the German market with a focus on quality and authenticity.",
    specialty: "Offers carefully selected single cask bottlings at natural cask strength, always non-chill-filtered and without artificial coloring. Known for providing excellent value and discovering lesser-known distillery gems. Their personal approach and detailed cask descriptions have built a loyal following among German whisky enthusiasts.",
    notableReleases: ["Single Cask Bottlings", "Fässle Exclusives"]
  },
  {
    name: "Kirsch Import",
    country: "Germany",
    region: "Baden-Württemberg",
    founded: 1999,
    description: "One of Germany's leading whisky importers and independent bottlers, based in Stuhr. Kirsch Import distributes many international whisky brands in Germany while also selecting and bottling their own single cask releases under various labels.",
    specialty: "Combines the role of major distributor with passionate independent bottling. Their own selections are bottled at cask strength without chill-filtration or coloring. They import and distribute many prestigious brands in the German market, giving them exceptional access to rare casks.",
    notableReleases: ["Kirsch Whisky", "Single Cask selections"]
  },
  {
    name: "Jack Wiebers",
    country: "Germany",
    region: "Niedersachsen",
    founded: 2006,
    description: "A German independent bottler that has made a name for itself by sourcing exceptional casks from distilleries worldwide. Jack Wiebers focuses on releasing whiskies that showcase the character of the distillery while highlighting the influence of careful cask selection.",
    specialty: "Known for their World of Whisky range covering distilleries from Scotland, Ireland, and beyond. All bottlings are natural — no chill-filtration, no coloring, and typically at cask strength. Their old and rare releases have earned them recognition among serious collectors.",
    notableReleases: ["World of Whisky", "Old Train Line", "Wiebers Gold Seal"]
  },
  {
    name: "Elixir Distillers",
    country: "Scotland",
    region: "London",
    founded: 2017,
    description: "Founded by Sukhinder and Rajbir Singh, who previously created The Whisky Exchange. Elixir Distillers combines decades of experience in whisky retail with independent bottling. They are also building a new distillery on Islay called Port Ellen — not the Diageo one but their own nearby project.",
    specialty: "Their Single Malts of Scotland range is curated by one of the most experienced palates in the industry. Known for thoughtful cask selection and a deep knowledge of what makes great whisky, built from decades of tasting thousands of casks at The Whisky Exchange.",
    notableReleases: ["Single Malts of Scotland", "Elements of Islay", "Port Askaig", "Black Tot Rum"]
  },
];
