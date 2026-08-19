const DEFAULT_INCOME = {
  monthTotal: 2840000,
  previousDelta: 8.4,
  stability: 72,
  sources: [
    { name: '배달 플랫폼', amount: 1260000, color: '#5748e7', volatility: 0.19 },
    { name: '영상 편집 외주', amount: 980000, color: '#33b67d', volatility: 0.27 },
    { name: '콘텐츠 수익', amount: 600000, color: '#ffae62', volatility: 0.35 },
  ],
  weeklyForecast: [61, 68, 58, 75, 72, 81, 69, 77],
  weeklyRange: [14, 16, 13, 18, 17, 20, 16, 18],
};

// 실제 MVP 1이 준비되면 이 주소만 예측 API 주소로 교체합니다.
const MVP1_ENDPOINT = './mvp1-sample-data.json';

const state = {
  step: 'goal',
  goal: null,
  saved: 0,
  fixedExpense: 1450000,
  emergencyReserve: 400000,
  income: structuredClone(DEFAULT_INCOME),
  analysis: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const won = (value) => `${Math.max(0, Math.round(value)).toLocaleString('ko-KR')}원`;
const compactWon = (value) => value >= 10000 ? `${Math.round(value / 10000).toLocaleString('ko-KR')}만 원` : won(value);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function seededRandom(seed) {
  let value = seed % 2147483647;
  return () => ((value = value * 16807 % 2147483647) - 1) / 2147483646;
}

function gaussian(random) {
  const u = Math.max(random(), 1e-7);
  const v = Math.max(random(), 1e-7);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function parseKoreanAmount(text) {
  const numberMatch = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(천만|백만|십만|만|천)?\s*원?/);
  if (!numberMatch) return null;
  const units = { 천만: 10000000, 백만: 1000000, 십만: 100000, 만: 10000, 천: 1000 };
  const value = Number(numberMatch[1]);
  const unit = units[numberMatch[2]] || 1;
  const amount = value * unit;
  return amount < 10000 && !numberMatch[2] ? amount * 10000 : amount;
}

function parseGoal(text) {
  const amount = parseKoreanAmount(text) || 1500000;
  const monthMatch = text.match(/(\d{1,2})월/);
  const now = new Date();
  let month = monthMatch ? Number(monthMatch[1]) - 1 : Math.min(11, now.getMonth() + 2);
  let year = now.getFullYear();
  if (month < now.getMonth()) year += 1;
  const deadline = new Date(year, month + 1, 0);
  let title = '나만의 금융 목표';
  let emoji = '🎯';
  if (/노트북|맥북|컴퓨터/.test(text)) { title = '작업용 노트북 마련'; emoji = '💻'; }
  else if (/비상금|안전자금/.test(text)) { title = '든든한 비상금 만들기'; emoji = '🛟'; }
  else if (/세금|종소세|종합소득세/.test(text)) { title = '세금 미리 준비하기'; emoji = '🧾'; }
  else if (/여행/.test(text)) { title = '여행 자금 마련'; emoji = '✈️'; }
  return { amount, deadline, title, emoji, original: text };
}

function appendMessage(content, type = 'bot', small = '') {
  const row = document.createElement('div');
  row.className = `message-row ${type}`;
  if (type === 'bot') row.innerHTML = '<div class="mini-ai" aria-hidden="true">✦</div>';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  if (type === 'user') {
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    bubble.appendChild(paragraph);
  } else {
    bubble.innerHTML = `<p>${content}</p>${small ? `<small>${small}</small>` : ''}`;
  }
  row.appendChild(bubble);
  $('#chatLog').appendChild(row);
  $('#chatLog').scrollTo({ top: $('#chatLog').scrollHeight, behavior: 'smooth' });
}

function botThinking() {
  const row = document.createElement('div');
  row.className = 'message-row bot thinking';
  row.innerHTML = '<div class="mini-ai" aria-hidden="true">✦</div><div class="message-bubble">분석 중 ···</div>';
  $('#chatLog').appendChild(row);
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
  return row;
}

function renderGoal() {
  if (!state.goal) return;
  $('#emptyGoal').classList.add('hidden');
  $('#goalContent').classList.remove('hidden');
  $('#goalTitle').textContent = state.goal.title;
  $('#goalEmoji').textContent = state.goal.emoji;
  $('#goalAmount').textContent = won(state.goal.amount);
  $('#savedAmount').textContent = won(state.saved);
  $('#goalDate').textContent = state.goal.deadline.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  $('#goalProgress').style.width = `${Math.min(100, state.saved / state.goal.amount * 100)}%`;
}

function normaliseInputAmount(text) {
  if (/없|0/.test(text)) return 0;
  return parseKoreanAmount(text);
}

async function handleChat(text) {
  if (!text.trim()) return;
  appendMessage(text, 'user');
  $('#quickPrompts').classList.add('hidden');
  const thinking = botThinking();
  await delay(650);
  thinking.remove();

  if (state.step === 'goal') {
    state.goal = parseGoal(text);
    renderGoal();
    state.step = 'saved';
    appendMessage(`<b>${state.goal.title}</b>, 좋은 목표예요!<br>현재 이 목표를 위해 준비한 금액이 있나요?`, 'bot', '예: “35만 원 있어요” 또는 “아직 없어요”');
    $('#chatMessage').placeholder = '현재 준비한 금액을 알려주세요';
    return;
  }

  if (state.step === 'saved') {
    const value = normaliseInputAmount(text);
    if (value === null) {
      appendMessage('금액을 숫자로 한 번만 더 알려주세요.', 'bot', '예: “35만 원”');
      return;
    }
    state.saved = value;
    renderGoal();
    state.step = 'expense';
    appendMessage(`현재 준비한 <b>${compactWon(value)}</b>을 반영했어요.<br>한 달 필수 생활비와 업무비는 대략 얼마인가요?`, 'bot', '월세·식비·교통비·업무 구독료 등을 포함해주세요.');
    $('#chatMessage').placeholder = '월 필수 지출을 알려주세요';
    return;
  }

  if (state.step === 'expense') {
    const value = normaliseInputAmount(text);
    if (value === null || value < 100000) {
      appendMessage('월 필수 지출을 금액으로 알려주세요.', 'bot', '예: “145만 원 정도예요”');
      return;
    }
    state.fixedExpense = value;
    state.step = 'analysing';
    appendMessage(`좋아요. 월 필수 지출 <b>${compactWon(value)}</b>을 먼저 보호할게요.<br>MVP 1의 소득 예측과 연결해 달성 가능성을 계산하고 있어요.`, 'bot');
    await delay(900);
    runAnalysis();
    state.step = 'complete';
    appendMessage(`분석이 끝났어요. 현재 조건에서 목표 달성 확률은 <b>${state.analysis.probability}%</b>예요.`, 'bot', '아래에서 세 가지 준비 방법을 비교해보세요.');
    $('#chatMessage').placeholder = '목표에 대해 더 물어보세요';
    return;
  }

  appendMessage('현재 계획을 기준으로 답변을 준비했어요. 소득이 달라지면 “다시 계산해줘”라고 말씀해주세요.', 'bot');
  if (/다시|재계산|변경/.test(text)) runAnalysis(true);
}

function monthsRemaining(deadline) {
  const now = new Date();
  return Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + deadline.getMonth() - now.getMonth() + 1);
}

function runAnalysis(silent = false) {
  const months = monthsRemaining(state.goal.deadline);
  const gap = Math.max(0, state.goal.amount - state.saved);
  const taxRate = 0.08;
  const random = seededRandom(8173 + state.goal.amount + state.saved);
  const simulations = 5000;
  let success = 0;
  let totalAvailable = 0;
  for (let i = 0; i < simulations; i += 1) {
    let available = state.saved;
    for (let m = 0; m < months; m += 1) {
      let income = 0;
      state.income.sources.forEach((source) => {
        income += Math.max(0, source.amount * (1 + gaussian(random) * source.volatility));
      });
      const protectedCost = state.fixedExpense + state.emergencyReserve / Math.max(3, months);
      available += Math.max(0, income * (1 - taxRate) - protectedCost);
    }
    totalAvailable += available;
    if (available >= state.goal.amount) success += 1;
  }
  const rawProbability = Math.round(success / simulations * 100);
  const probability = Math.max(12, Math.min(96, rawProbability));
  const weekly = Math.ceil(gap / Math.max(1, months * 4) / 100) * 100;
  state.analysis = { probability, gap, weekly, averageAvailable: totalAvailable / simulations, months };
  renderAnalysis();
  if (!silent) $('#analysisSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAnalysis() {
  const { probability, gap, weekly, months } = state.analysis;
  $('#probability').textContent = probability;
  $('#probabilityVisual').style.setProperty('--p', probability);
  $('#gapAmount').textContent = won(gap);
  $('#weeklyAmount').textContent = won(weekly);
  const high = probability >= 70;
  const medium = probability >= 45 && probability < 70;
  $('#statusPill').textContent = high ? '달성 가능성이 높아요' : medium ? '조정하면 가능해요' : '계획 조정이 필요해요';
  $('#analysisHeadline').textContent = high ? '현재 흐름이라면 목표에 가까워질 수 있어요.' : medium ? '조금만 조정하면 현실적인 목표예요.' : '기간이나 금액을 조정해 안전하게 준비해요.';
  $('#analysisDescription').textContent = `생활비와 비상금을 지키면서 앞으로 ${months}개월간 주당 ${won(weekly)}을 준비하는 기준입니다.`;
  $('#analysisSection').classList.remove('hidden');
  $('#plans').classList.remove('hidden');
  $('#analysisLock').classList.add('ready');
  $('#analysisLock').innerHTML = `<div class="lock-icon">✓</div><p><b>${probability}% 달성 가능</b><span>소득 변화 시 자동으로 다시 계산해요.</span></p>`;
  renderPlans(weekly);
}

function renderPlans(base) {
  const plans = [
    { type: 'SAFE', title: '안전 플랜', icon: '🛟', multiplier: .78, color: '#218c64', soft: '#e9f8f1', desc: '생활비와 비상금을 가장 먼저 지키며 기간을 유연하게 조정해요.' },
    { type: 'BALANCED', title: '기본 플랜', icon: '⚖️', multiplier: 1, color: '#5748e7', soft: '#eeecff', desc: '현재 소득 흐름에서 가장 현실적인 주간 적립 계획이에요.', recommended: true },
    { type: 'CHALLENGE', title: '도전 플랜', icon: '⚡', multiplier: 1.28, color: '#db7d31', soft: '#fff1e3', desc: '수입이 좋은 주에 더 모아 목표 시점을 앞당기는 계획이에요.' },
  ];
  $('#planGrid').innerHTML = plans.map((plan) => {
    const amount = Math.ceil(base * plan.multiplier / 100) * 100;
    return `<article class="plan-card panel ${plan.recommended ? 'recommended' : ''}" style="--plan-color:${plan.color};--plan-soft:${plan.soft}">
      ${plan.recommended ? '<span class="recommend-ribbon">가장 현실적</span>' : ''}
      <div class="plan-icon">${plan.icon}</div>
      <p class="plan-type">${plan.type}</p>
      <h3>${plan.title}</h3>
      <p>${plan.desc}</p>
      <div class="plan-value"><span>매주 준비할 금액</span><b>${won(amount)}</b><small> · 입금 시 우선 분리</small></div>
      <button type="button" data-plan="${plan.title}" data-amount="${amount}">${plan.recommended ? '이 플랜으로 시작하기' : '플랜 선택하기'}</button>
    </article>`;
  }).join('');
  $$('#planGrid button').forEach((button) => button.addEventListener('click', choosePlan));
}

function choosePlan(event) {
  $$('#planGrid button').forEach((button) => { button.classList.remove('selected'); button.textContent = button.closest('.recommended') ? '이 플랜으로 시작하기' : '플랜 선택하기'; });
  const button = event.currentTarget;
  button.classList.add('selected');
  button.textContent = '✓ 선택했어요';
  showToast(`${button.dataset.plan}을 선택했어요. 매주 ${won(Number(button.dataset.amount))}씩 준비합니다.`);
}

function renderIncome() {
  $('#monthlyIncome').textContent = won(state.income.monthTotal);
  $('#stabilityScore').textContent = state.income.stability;
  $('.gauge i').style.marginLeft = `${state.income.stability}%`;
  $('#sourceList').innerHTML = state.income.sources.map((source) => `<div class="source-item" style="--source-color:${source.color}"><i></i><span>${source.name}</span><b>${compactWon(source.amount)}</b></div>`).join('');
  renderChart();
}

async function loadMvp1Income() {
  try {
    const response = await fetch(MVP1_ENDPOINT);
    if (!response.ok) throw new Error('income data unavailable');
    const data = await response.json();
    state.income = {
      monthTotal: data.month_total,
      previousDelta: DEFAULT_INCOME.previousDelta,
      stability: data.stability_score,
      sources: data.income_sources.map((source, index) => ({
        name: source.name,
        amount: source.expected_amount,
        volatility: source.volatility,
        color: DEFAULT_INCOME.sources[index]?.color || '#5748e7',
      })),
      weeklyForecast: data.weekly_forecast.map((value) => value / 10000),
      weeklyRange: data.weekly_range.map((value) => value / 10000),
    };
    renderIncome();
    $('.sample-badge').innerHTML = '<span></span>MVP 1 샘플 소득 연결 완료';
  } catch {
    renderIncome();
  }
}

function renderChart() {
  const values = state.income.weeklyForecast;
  const ranges = state.income.weeklyRange;
  const w = 560, h = 170, padX = 22, padY = 14;
  const max = Math.max(...values.map((v, i) => v + ranges[i])) * 1.08;
  const min = Math.min(...values.map((v, i) => v - ranges[i])) * .85;
  const x = (i) => padX + i * ((w - padX * 2) / (values.length - 1));
  const y = (v) => h - padY - ((v - min) / (max - min)) * (h - padY * 2 - 20);
  const line = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
  const upper = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v + ranges[i])}`).join(' ');
  const lower = [...values].reverse().map((v, ri) => { const i = values.length - 1 - ri; return `L ${x(i)} ${y(v - ranges[i])}`; }).join(' ');
  const labels = values.map((_, i) => `<text x="${x(i)}" y="166" text-anchor="middle" fill="#a29fab" font-size="9">${i + 1}주</text>`).join('');
  const dots = values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#fff" stroke="#5748e7" stroke-width="2"/>`).join('');
  const grid = [0,1,2].map((i) => `<line x1="${padX}" y1="${35 + i * 42}" x2="${w-padX}" y2="${35 + i * 42}" stroke="#eeedf3" stroke-dasharray="3 5"/>`).join('');
  $('#incomeChart').innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="rangeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9b1f7" stop-opacity=".5"/><stop offset="1" stop-color="#eeeaff" stop-opacity=".15"/></linearGradient></defs>${grid}<path d="${upper} ${lower} Z" fill="url(#rangeFill)"/><path d="${line}" fill="none" stroke="#5748e7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}

function refreshIncome() {
  const random = seededRandom(Date.now() % 100000);
  state.income.weeklyForecast = DEFAULT_INCOME.weeklyForecast.map((value) => Math.round(value * (.9 + random() * .22)));
  state.income.monthTotal = Math.round(state.income.weeklyForecast.slice(0, 4).reduce((a, b) => a + b, 0) * 10000 / 10000) * 10000;
  state.income.stability = 68 + Math.round(random() * 10);
  const scale = state.income.monthTotal / DEFAULT_INCOME.monthTotal;
  state.income.sources = DEFAULT_INCOME.sources.map((source) => ({ ...source, amount: Math.round(source.amount * scale / 10000) * 10000 }));
  renderIncome();
  if (state.analysis) runAnalysis(true);
  showToast('MVP 1 샘플 소득을 새로 불러왔어요.');
}

function resetGoal() {
  state.step = 'goal'; state.goal = null; state.saved = 0; state.analysis = null;
  $('#goalContent').classList.add('hidden');
  $('#emptyGoal').classList.remove('hidden');
  $('#analysisSection').classList.add('hidden');
  $('#plans').classList.add('hidden');
  $('#quickPrompts').classList.remove('hidden');
  $('#chatMessage').placeholder = '목표를 입력해주세요';
  appendMessage('새 목표로 다시 시작할게요. 이번에는 무엇을 준비하고 싶나요?', 'bot');
  $('#planner').scrollIntoView({ behavior: 'smooth' });
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3000);
}

$('#chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#chatMessage');
  const text = input.value.trim();
  input.value = '';
  handleChat(text);
});
$$('[data-prompt]').forEach((button) => button.addEventListener('click', () => handleChat(button.dataset.prompt)));
$('#refreshIncome').addEventListener('click', refreshIncome);
$('#editGoal').addEventListener('click', resetGoal);
$('#viewMethod').addEventListener('click', () => $('#methodModal').classList.remove('hidden'));
$('#closeModal').addEventListener('click', () => $('#methodModal').classList.add('hidden'));
$('#methodModal').addEventListener('click', (event) => { if (event.target === $('#methodModal')) $('#methodModal').classList.add('hidden'); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') $('#methodModal').classList.add('hidden'); });

renderIncome();
loadMvp1Income();
