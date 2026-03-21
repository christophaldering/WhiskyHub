export interface WhiskyResult {
  whiskyId: string;
  name: string;
  distillery: string | null;
  region: string | null;
  avgOverall: number | null;
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  ratingCount: number;
  ratings: {
    participantId: string;
    overall: number;
    nose: number;
    taste: number;
    finish: number;
  }[];
}

export interface InsightsData {
  userAvg: number;
  groupAvg: number;
  delta: number;
  biggestOutlier: { name: string; userScore: number; groupScore: number; delta: number } | null;
  priceSurprise: {
    cheapestRank: number | null;
    cheapestName: string | null;
    isSurprise: boolean;
  };
  caskPattern: {
    sherryAvg: number | null;
    bourbonAvg: number | null;
    preferred: string | null;
    outlierWhisky: { name: string; delta: number } | null;
  };
  userRatingsCount: number;
  topWhisky: { name: string; score: number } | null;
  lowestWhisky: { name: string; score: number } | null;
  dimensionStrength: { dimension: string; delta: number } | null;
}

export function computeInsights(
  results: WhiskyResult[],
  participantId: string,
  prices?: Record<string, number>
): InsightsData {
  const userScores: { name: string; userScore: number; groupScore: number }[] = [];
  let userTotal = 0;
  let userCount = 0;
  let groupTotal = 0;
  let groupCount = 0;

  const userNoseScores: number[] = [];
  const userPalateScores: number[] = [];
  const userFinishScores: number[] = [];
  const groupNoseAvgs: number[] = [];
  const groupPalateAvgs: number[] = [];
  const groupFinishAvgs: number[] = [];

  for (const w of results) {
    const userRating = w.ratings.find(r => r.participantId === participantId);
    const groupAvg = w.avgOverall ?? 0;

    if (groupAvg > 0) {
      groupTotal += groupAvg;
      groupCount++;
    }

    if (w.avgNose != null) groupNoseAvgs.push(w.avgNose);
    if (w.avgTaste != null) groupPalateAvgs.push(w.avgTaste);
    if (w.avgFinish != null) groupFinishAvgs.push(w.avgFinish);

    if (userRating) {
      const uScore = userRating.overall;
      userTotal += uScore;
      userCount++;
      if (userRating.nose != null) userNoseScores.push(userRating.nose);
      if (userRating.taste != null) userPalateScores.push(userRating.taste);
      if (userRating.finish != null) userFinishScores.push(userRating.finish);

      userScores.push({
        name: w.name,
        userScore: uScore,
        groupScore: groupAvg,
      });
    }
  }

  const userAvg = userCount > 0 ? Math.round((userTotal / userCount) * 10) / 10 : 0;
  const groupAvg = groupCount > 0 ? Math.round((groupTotal / groupCount) * 10) / 10 : 0;
  const delta = Math.round((userAvg - groupAvg) * 10) / 10;

  let biggestOutlier: InsightsData["biggestOutlier"] = null;
  if (userScores.length > 0) {
    const sorted = [...userScores].sort(
      (a, b) => Math.abs(b.userScore - b.groupScore) - Math.abs(a.userScore - a.groupScore)
    );
    const top = sorted[0];
    biggestOutlier = {
      name: top.name,
      userScore: Math.round(top.userScore * 10) / 10,
      groupScore: Math.round(top.groupScore * 10) / 10,
      delta: Math.round((top.userScore - top.groupScore) * 10) / 10,
    };
  }

  let priceSurprise: InsightsData["priceSurprise"] = {
    cheapestRank: null,
    cheapestName: null,
    isSurprise: false,
  };
  if (prices && Object.keys(prices).length > 0) {
    const ranked = [...results]
      .filter(r => r.avgOverall != null)
      .sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));
    let cheapestId: string | null = null;
    let cheapestPrice = Infinity;
    for (const [wId, price] of Object.entries(prices)) {
      if (price < cheapestPrice) {
        cheapestPrice = price;
        cheapestId = wId;
      }
    }
    if (cheapestId) {
      const rank = ranked.findIndex(r => r.whiskyId === cheapestId) + 1;
      const cheapW = results.find(r => r.whiskyId === cheapestId);
      priceSurprise = {
        cheapestRank: rank > 0 ? rank : null,
        cheapestName: cheapW?.name ?? null,
        isSurprise: rank > 0 && rank <= Math.ceil(ranked.length / 2),
      };
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const sherryWhiskies = results.filter(w => {
    const region = (w.region || "").toLowerCase();
    const dist = (w.distillery || "").toLowerCase();
    return region.includes("sherry") || dist.includes("sherry");
  });
  const bourbonWhiskies = results.filter(w => {
    const region = (w.region || "").toLowerCase();
    const dist = (w.distillery || "").toLowerCase();
    return region.includes("bourbon") || dist.includes("bourbon");
  });

  const sherryAvg = sherryWhiskies.length > 0
    ? Math.round(avg(sherryWhiskies.map(w => {
        const ur = w.ratings.find(r => r.participantId === participantId);
        return ur?.overall ?? w.avgOverall ?? 0;
      })) * 10) / 10
    : null;

  const bourbonAvg = bourbonWhiskies.length > 0
    ? Math.round(avg(bourbonWhiskies.map(w => {
        const ur = w.ratings.find(r => r.participantId === participantId);
        return ur?.overall ?? w.avgOverall ?? 0;
      })) * 10) / 10
    : null;

  let caskPreferred: string | null = null;
  if (sherryAvg != null && bourbonAvg != null) {
    caskPreferred = sherryAvg > bourbonAvg ? "sherry" : sherryAvg < bourbonAvg ? "bourbon" : null;
  } else if (sherryAvg != null) {
    caskPreferred = "sherry";
  } else if (bourbonAvg != null) {
    caskPreferred = "bourbon";
  }

  let caskOutlier: InsightsData["caskPattern"]["outlierWhisky"] = null;
  if (userScores.length > 1) {
    const sortedByDelta = [...userScores].sort(
      (a, b) => Math.abs(b.userScore - b.groupScore) - Math.abs(a.userScore - a.groupScore)
    );
    const o = sortedByDelta[0];
    if (Math.abs(o.userScore - o.groupScore) > 5) {
      caskOutlier = { name: o.name, delta: Math.round((o.userScore - o.groupScore) * 10) / 10 };
    }
  }

  const userNoseAvg = avg(userNoseScores);
  const userPalateAvg = avg(userPalateScores);
  const userFinishAvg = avg(userFinishScores);
  const gNoseAvg = avg(groupNoseAvgs);
  const gPalateAvg = avg(groupPalateAvgs);
  const gFinishAvg = avg(groupFinishAvgs);

  const dimDeltas = [
    { dimension: "nose", delta: userNoseAvg - gNoseAvg },
    { dimension: "palate", delta: userPalateAvg - gPalateAvg },
    { dimension: "finish", delta: userFinishAvg - gFinishAvg },
  ].filter(d => !isNaN(d.delta));

  const dimensionStrength = dimDeltas.length > 0
    ? dimDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
    : null;

  const sortedUser = [...userScores].sort((a, b) => b.userScore - a.userScore);
  const topWhisky = sortedUser.length > 0
    ? { name: sortedUser[0].name, score: Math.round(sortedUser[0].userScore * 10) / 10 }
    : null;
  const lowestWhisky = sortedUser.length > 1
    ? { name: sortedUser[sortedUser.length - 1].name, score: Math.round(sortedUser[sortedUser.length - 1].userScore * 10) / 10 }
    : null;

  return {
    userAvg,
    groupAvg,
    delta,
    biggestOutlier,
    priceSurprise,
    caskPattern: {
      sherryAvg,
      bourbonAvg,
      preferred: caskPreferred,
      outlierWhisky: caskOutlier,
    },
    userRatingsCount: userCount,
    topWhisky,
    lowestWhisky,
    dimensionStrength: dimensionStrength ? {
      dimension: dimensionStrength.dimension,
      delta: Math.round(dimensionStrength.delta * 10) / 10,
    } : null,
  };
}
