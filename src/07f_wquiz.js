/* ============ Activity: Weather Quiz ============ */
// Rounds of 8 from the questions below; a star only on the first try (makeQuiz, src/07_quiz.js).
const WQUIZ = [
  { id: 'w1', name: 'Evaporation', q: 'The sun warms a puddle, and the water rises into the air. What is this called?', a: ['Evaporation', 'Condensation', 'Precipitation'], hint: 'The water seems to disappear into the air.', why: 'Evaporation turns liquid water into water vapor.' },
  { id: 'w2', name: 'Condensation', q: 'Water vapor cools and turns into tiny drops that make a cloud. What is this called?', a: ['Condensation', 'Evaporation', 'Collection'], hint: 'Think of the drops on a cold glass of lemonade.', why: 'Condensation is water vapor turning back into drops of water.' },
  { id: 'w3', name: 'Precipitation', q: 'Rain, snow and hail are all kinds of what?', a: ['Precipitation', 'Evaporation', 'Wind'], hint: 'They all fall from clouds.', why: 'Precipitation is water falling from clouds.' },
  { id: 'w4', name: 'Collection', q: 'Rain runs into rivers, lakes and oceans. What is this part of the water cycle called?', a: ['Collection', 'Condensation', 'Evaporation'], hint: 'The water gathers together in one place.', why: 'Collection is water gathering in rivers, lakes and oceans.' },
  { id: 'w5', name: 'The sun', q: 'What gives the water cycle its energy?', a: ['The sun', 'The moon', 'The wind'], hint: 'It warms the water so it can rise.', why: 'The sun\'s heat makes water evaporate.' },
  { id: 'w6', name: 'Water vapor', q: 'What do we call water when it is a gas?', a: ['Water vapor', 'Ice', 'Snow'], hint: 'You can\'t see it, but it\'s in the air all around you.', why: 'Water vapor is water as a gas.' },
  { id: 'w7', name: 'Cumulus', pic: 'cumulus', q: 'What kind of cloud is this?', a: ['Cumulus', 'Cirrus', 'Stratus'], hint: 'It\'s big and puffy, like cotton balls.', why: 'Cumulus clouds are big and puffy.' },
  { id: 'w8', name: 'Cirrus', pic: 'cirrus', q: 'These thin, wispy clouds are high up in the sky. What are they?', a: ['Cirrus', 'Cumulus', 'Stratus'], hint: 'Their name means a curl of hair, like a wisp.', why: 'Cirrus clouds are high, thin and made of ice.' },
  { id: 'w9', name: 'Stratus', pic: 'stratus', q: 'What is a low, flat, grey cloud like this one called?', a: ['Stratus', 'Cirrus', 'Cumulus'], hint: 'It spreads out like a blanket.', why: 'Stratus clouds are low, flat blankets of cloud.' },
  { id: 'w10', name: 'Storm clouds', q: 'Which tall cloud brings thunderstorms?', a: ['Cumulonimbus', 'Cirrus', 'Stratus'], hint: 'Look for the longest name. Nimbus means rain cloud.', why: 'Cumulonimbus clouds grow very tall and bring storms.' },
  { id: 'w11', name: 'Fog', q: 'What is fog, really?', a: ['A cloud on the ground', 'A kind of smoke', 'A kind of snow'], hint: 'It\'s made of tiny water drops floating in the air.', why: 'Fog is a cloud that sits on the ground.' },
  { id: 'w12', name: 'Thermometer', q: 'Which tool measures temperature?', a: ['Thermometer', 'Rain gauge', 'Wind vane'], hint: 'It tells you how hot or cold it is.', why: 'A thermometer measures how hot or cold the air is.' },
  { id: 'w13', name: 'Rain gauge', q: 'Which tool measures how much rain fell?', a: ['Rain gauge', 'Thermometer', 'Anemometer'], hint: 'It catches the rain in a tube.', why: 'A rain gauge catches rain so we can measure it.' },
  { id: 'w14', name: 'Wind vane', q: 'What does a wind vane show?', a: ['Where the wind comes from', 'How hot it is', 'How much it rained'], hint: 'Its arrow turns to point into the wind.', why: 'A wind vane points to where the wind is coming from.' },
  { id: 'w15', name: 'Anemometer', q: 'What does an anemometer measure?', a: ['How fast the wind blows', 'How much rain fell', 'How cold it is'], hint: 'Its little cups spin around.', why: 'The faster its cups spin, the faster the wind.' },
  { id: 'w16', name: 'Barometer', q: 'What does a barometer measure?', a: ['Air pressure', 'How much rain fell', 'How sunny it is'], hint: 'It feels the push of the air.', why: 'A barometer measures air pressure. Falling pressure often means rain.' },
  { id: 'w17', name: 'Snow', q: 'When the air is below freezing, how does water fall?', a: ['As snow', 'As rain', 'As fog'], hint: 'Brrr! It\'s cold and white.', why: 'In freezing air, water falls as snow.' },
  { id: 'w18', name: 'Climate', q: 'What do we call the usual weather of a place over many years?', a: ['Climate', 'Weather', 'Forecast'], hint: 'Weather is just today. This is the long, big picture.', why: 'Climate is the usual weather over many years. Weather is just today.' },
  { id: 'w19', name: 'Terrarium', q: 'Drops form on the lid of a closed jar with a plant inside. Where did the water come from?', a: ['The soil and the plant', 'Outside the jar', 'The lid'], hint: 'The jar is closed, so nothing can get in.', why: 'Water from the soil and the plant rose up and condensed on the lid.' },
  { id: 'w20', name: 'Transpiration', q: 'Plants give off water vapor from their leaves. What is this called?', a: ['Transpiration', 'Precipitation', 'Pollination'], hint: 'Precipitation falls from clouds, and pollination is for flowers.', why: 'Transpiration is plants giving off water vapor.' },
  { id: 'w21', name: 'Wind', q: 'What is wind?', a: ['Moving air', 'Falling rain', 'Floating clouds'], hint: 'You can\'t see it, but you can feel it push.', why: 'Wind is air on the move.' },
  { id: 'w22', name: 'Oceans', q: 'Where is most of Earth\'s water?', a: ['In the oceans', 'In the clouds', 'In rivers'], hint: 'It\'s salty!', why: 'Most of Earth\'s water is in the salty oceans.' }
];
function drawWeatherPic(cv, pic) {
  const c = cv.getContext('2d'), k = cv.width / 400; c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, 400, 400);
  sky(c, pic === 'stratus' ? '#A9B6C4' : '#5DAEE0', WC.sky2, 400); c.fillStyle = C.grass; c.fillRect(0, 330, 400, 70); c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 330); c.lineTo(400, 330); c.stroke();
  if (pic === 'cumulus') { puffCloud(c, 200, 180, 1.4); puffCloud(c, 80, 90, .6); }
  if (pic === 'cirrus') { cirrusCloud(c, 200, 110, 1.2); cirrusCloud(c, 110, 190, .7); }
  if (pic === 'stratus') stratusCloud(c, 200, 230, 1.35);
}
const A_wquiz = makeQuiz({
  id: 'weather.quiz', name: 'Weather Quiz', icon: 'wquiz', prefix: 'weather.quiz.', questions: WQUIZ, drawPic: drawWeatherPic, picLabel: 'A picture of clouds in the sky',
  badge: { id: 'weather.b.quiz', name: 'Weather Whiz', desc: 'You earned ten weather quiz stars. You really know your weather!', how: 'Not yet! Earn ten stars in the <b>Weather Quiz</b>. You get a star when you answer right on the first try.', reward: 'snowman' },
  intro: 'Ready for a weather challenge? Get it right on the <b>first try</b> to earn a star. Collect ten quiz stars for the Weather Whiz badge!',
  expert: 'Wow, you\'re a weather expert! Play again to collect more stars.'
});

/* ============ Weather & Water icons (100x100) ============ */
Object.assign(ICONS, {
  // sun, cloud and rain with a loop of arrows: the water cycle
  wcycle(c, t = 0) {
    c.save(); c.translate(26, 30); sun(c, 0, 0, 13, t, { face: false }); c.restore(); puffCloud(c, 62, 40, .34);
    c.strokeStyle = C.water; c.lineWidth = 4; c.lineCap = 'round'; for (const x of [52, 64, 76]) { c.beginPath(); c.moveTo(x, 62); c.lineTo(x - 3, 72); c.stroke(); }
    c.fillStyle = C.water; c.strokeStyle = C.ink; c.lineWidth = 3; const lake = ellipse(46, 88, 34, 9); c.fill(lake); c.stroke(lake);
    arrow(c, 18, 74, 20, 52, C.sun);
  },
  // a jar with a little plant and drops on the glass
  jar(c) {
    const j = rrect(22, 26, 56, 68, 12); c.fillStyle = 'rgba(221,243,247,.85)'; c.fill(j); c.save(); c.clip(j); c.fillStyle = C.soil; c.fillRect(22, 74, 56, 20); c.fillStyle = '#9AA3AE'; c.fillRect(22, 86, 56, 8); c.restore();
    c.strokeStyle = C.leafDeep; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(50, 76); c.lineTo(50, 52); c.stroke(); drawLeaf(c, 50, 54, -150, .2); drawLeaf(c, 50, 54, -30, .2);
    c.strokeStyle = C.ink; c.lineWidth = 3.5; c.stroke(j); c.fillStyle = '#C8CDD2'; const lid = rrect(18, 16, 64, 12, 5); c.fill(lid); c.stroke(lid);
    c.fillStyle = '#fff'; c.strokeStyle = 'rgba(47,134,194,.7)'; c.lineWidth = 1.5; for (const [x, y] of [[32, 38], [66, 44], [36, 56], [62, 34]]) { c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); c.stroke(); }
  },
  // a puffy cloud in front of a wispy one
  clouds(c, t = 0) { cirrusCloud(c, 56, 30, .38, t); puffCloud(c, 50, 62, .5, WC.cloud, { face: { t } }); },
  // a wind vane and wind cups
  station(c, t = 0) {
    c.strokeStyle = C.ink; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 94); c.lineTo(30, 40); c.moveTo(72, 94); c.lineTo(72, 34); c.stroke();
    c.fillStyle = C.carrot; c.lineWidth = 3; c.beginPath(); c.moveTo(6, 40); c.lineTo(18, 32); c.lineTo(18, 48); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(18, 40); c.lineTo(46, 40); c.stroke();
    c.fillStyle = WC.accent; c.beginPath(); c.moveTo(46, 40); c.lineTo(54, 30); c.lineTo(56, 40); c.lineTo(54, 50); c.closePath(); c.fill(); c.stroke();
    const sp = RM ? .5 : t * 3; for (let i = 0; i < 3; i++) { const a = sp + i * TAU / 3, x = 72 + Math.cos(a) * 18, y = 30 + Math.sin(a) * 6; c.beginPath(); c.moveTo(72, 30); c.lineTo(x, y); c.stroke(); c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); c.stroke(); }
  },
  // a cloud with a question mark
  wquiz(c) { puffCloud(c, 50, 54, .5, C.sun); label(c, '?', 50, 58, { size: 34, weight: 700, stroke: null }); },
  // a gold trophy with a raindrop on it
  wtrophy(c) {
    c.fillStyle = C.sun; c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(26, 16); c.lineTo(74, 16); c.quadraticCurveTo(74, 62, 50, 64); c.quadraticCurveTo(26, 62, 26, 16); c.fill(); c.stroke();
    c.beginPath(); c.arc(22, 32, 11, PI * .5, PI * 1.5); c.moveTo(78, 21); c.arc(78, 32, 11, -PI * .5, PI * .5); c.stroke(); c.fillRect(44, 64, 12, 14); c.strokeRect(44, 64, 12, 14);
    c.fillStyle = '#5BA8D6'; c.fillRect(32, 78, 36, 12); c.strokeRect(32, 78, 36, 12); raindrop(c, 50, 40, 1.1);
  }
});
