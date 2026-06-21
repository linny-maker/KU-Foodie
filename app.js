// 전역 상태 변수
let allRestaurants = [];
let filteredRestaurants = [];
let currentKeyword = "";
let searchQuery = "";

// DOM 요소
const csvPathEl = document.getElementById('csv-path');
const btnOpenFolder = document.getElementById('btn-open-folder');
const btnReload = document.getElementById('btn-reload');
const keywordCards = document.querySelectorAll('.keyword-card');

const dashboard = document.getElementById('recommendation-dashboard');
const selectedKeywordTitle = document.getElementById('selected-keyword-title');
const resultCountEl = document.getElementById('result-count');

const filterLocation = document.getElementById('filter-location');
const filterCategory = document.getElementById('filter-category');
const sortBy = document.getElementById('sort-by');

const todayPickCard = document.getElementById('today-pick-card');
const restaurantsGrid = document.getElementById('restaurants-grid');
const emptyState = document.getElementById('empty-state');

// 모달 요소
const detailModal = document.getElementById('detail-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalName = document.getElementById('modal-name');
const modalCategory = document.getElementById('modal-category');
const modalRating = document.getElementById('modal-rating');
const modalLocation = document.getElementById('modal-location');
const modalBreaktime = document.getElementById('modal-breaktime');
const modalMenu = document.getElementById('modal-menu');
const modalPrice = document.getElementById('modal-price');
const modalPhone = document.getElementById('modal-phone');
const modalKeywords = document.getElementById('modal-keywords');
const modalReason = document.getElementById('modal-reason');

// 추가된 DOM 요소
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const rouletteContainer = document.getElementById('roulette-container');
const rouletteWheel = document.getElementById('roulette-wheel');
const recommendationResultContainer = document.getElementById('recommendation-result-container');
const courseFlow = document.getElementById('course-flow');
const toastContainer = document.getElementById('toast-container');
const btnNaverMap = document.getElementById('btn-naver-map');
const btnKakaoMap = document.getElementById('btn-kakao-map');

// 한글 초성 추출 배열
const CHOSUNGS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// 한글 텍스트를 초성 문자열로 변환하는 함수
function getChosungStr(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 44032; // 한글 유니코드 시작 값 0xAC00 (44032)
    if (code >= 0 && code <= 11172) {
      const chosungIndex = Math.floor(code / 588);
      result += CHOSUNGS[chosungIndex];
    } else {
      result += text[i];
    }
  }
  return result;
}

// 초성 검색 매칭 여부 반환 함수
function matchChosung(text, query) {
  const isChosungOnly = /^[ㄱ-ㅎ\s]+$/.test(query);
  if (!isChosungOnly) return false;
  
  const textChosung = getChosungStr(text);
  return textChosung.includes(query);
}

// 토스트 메시지 띄우기 함수
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : 'ℹ️'}</span>
    <span class="toast-text">${message}</span>
  `;
  toastContainer.appendChild(toast);

  // Trigger browser reflow to animate
  void toast.offsetWidth;
  toast.classList.add('visible');

  // Dismiss after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3500);
}

// 초기화
window.addEventListener('DOMContentLoaded', async () => {
  // 데이터 로드
  await loadData();

  if (btnReload) {
    btnReload.addEventListener('click', async () => {
      btnReload.style.transform = 'rotate(360deg)';
      btnReload.style.transition = 'transform 0.5s ease';
      setTimeout(() => {
        btnReload.style.transform = 'none';
        btnReload.style.transition = 'none';
      }, 500);

      await loadData();
      showToast('🔄 맛집 데이터를 수동으로 불러왔습니다.', 'success');
      if (currentKeyword) {
        processKeywordSelection(currentKeyword, true); // 새로고침 시 룰렛 없이 즉시 반영
      }
    });
  }

  // 키워드 카드 클릭 이벤트
  keywordCards.forEach(card => {
    card.addEventListener('click', () => {
      const keyword = card.getAttribute('data-keyword');
      
      keywordCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      processKeywordSelection(keyword, false); // 사용자가 직접 누를 때는 룰렛 돌림
    });
  });

  // 실시간 검색 이벤트 등록
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    if (searchQuery) {
      searchClearBtn.classList.remove('hidden');
    } else {
      searchClearBtn.classList.add('hidden');
    }
    updateFilteredList();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.classList.add('hidden');
    searchInput.focus();
    updateFilteredList();
  });

  // 필터 및 정렬 이벤트
  filterLocation.addEventListener('change', updateFilteredList);
  filterCategory.addEventListener('change', updateFilteredList);
  sortBy.addEventListener('change', updateFilteredList);

  // 모달 닫기
  modalCloseBtn.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      closeModal();
    }
  });

  // ESC 키 입력 시 모달 닫기
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // CSV 경로 클릭 시 복사 기능
  csvPathEl.addEventListener('click', () => {
    navigator.clipboard.writeText(csvPathEl.textContent);
    
    const originalText = csvPathEl.textContent;
    csvPathEl.textContent = '클립보드에 복사되었습니다!';
    csvPathEl.style.color = 'var(--crimson)';
    setTimeout(() => {
      csvPathEl.textContent = originalText;
      csvPathEl.style.color = '';
    }, 1500);
  });
});

// CSV 데이터 파싱 (간단 버전)
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    
    // 단순 파싱 (따옴표 처리 생략, 현재 데이터 구조에 최적화)
    const values = row.split(',');
    if (values.length >= 10) {
      results.push({
        이름: values[0].trim(),
        카테고리: values[1].trim(),
        브레이크타임: values[2].trim(),
        위치: values[3].trim(),
        별점: values[4].trim(),
        키워드: values[5].trim(),
        대표메뉴: values[6].trim(),
        가격대: values[7].trim(),
        연락처: values[8].trim(),
        추천이유: values.slice(9).join(',').trim()
      });
    }
  }
  return results;
}

// CSV 데이터 로드
async function loadData() {
  try {
    const response = await fetch('restaurants.csv');
    if (!response.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
    const text = await response.text();
    allRestaurants = parseCSV(text);
    console.log('로드된 맛집 데이터:', allRestaurants);
  } catch (err) {
    console.error('데이터 로드 실패:', err);
    showToast('❌ CSV 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
  }
}

// 키워드 선택 시 메인 로직 처리
function processKeywordSelection(keyword, skipRoulette = false) {
  currentKeyword = keyword;
  selectedKeywordTitle.textContent = keyword;

  // 필터 조건 초기화 (키워드 변경 시 전체로 리셋)
  filterLocation.value = "전체";
  filterCategory.value = "전체";
  sortBy.value = "별점순";
  searchInput.value = "";
  searchQuery = "";
  searchClearBtn.classList.add('hidden');

  // 대시보드 보이기
  dashboard.classList.remove('hidden');
  void dashboard.offsetWidth;
  dashboard.classList.add('visible');

  // 1. 해당 키워드로 필터링된 전체 리스트 확보
  filteredRestaurants = allRestaurants.filter(r => {
    if (!r.키워드) return false;
    const keywords = r.키워드.split(';').map(k => k.trim());
    return keywords.includes(keyword);
  });

  if (filteredRestaurants.length === 0) {
    rouletteContainer.classList.add('hidden');
    recommendationResultContainer.classList.remove('hidden');
    recommendationResultContainer.classList.add('visible');
    renderTodayPick(null);
    courseFlow.innerHTML = `<div class="no-course">선택한 키워드에 해당하는 맛집이 없습니다.</div>`;
    updateFilteredList();
    return;
  }

  // 룰렛 연출 적용 여부에 따른 분기
  if (skipRoulette) {
    rouletteContainer.classList.add('hidden');
    recommendationResultContainer.classList.remove('hidden');
    void recommendationResultContainer.offsetWidth;
    recommendationResultContainer.classList.add('visible');

    const randomIndex = Math.floor(Math.random() * filteredRestaurants.length);
    const selectedRestaurant = filteredRestaurants[randomIndex];

    renderTodayPick(selectedRestaurant);
    renderCourse(selectedRestaurant, keyword);
    updateFilteredList();
  } else {
    // 룰렛 시퀀스 가동
    recommendationResultContainer.classList.add('hidden');
    recommendationResultContainer.classList.remove('visible');
    rouletteContainer.classList.remove('hidden');

    const spinItems = [];
    const listLength = filteredRestaurants.length;
    // 부드러운 룰렛 회전 효과를 위해 아이템 목록을 늘려서 구성
    for (let i = 0; i < 20; i++) {
      spinItems.push(filteredRestaurants[i % listLength]);
    }

    const targetPickIndex = Math.floor(Math.random() * listLength);
    const targetSpinIndex = 15 + (targetPickIndex % listLength);
    const selectedRestaurant = filteredRestaurants[targetPickIndex];

    spinItems[targetSpinIndex] = selectedRestaurant;

    // 룰렛 스피너 요소 렌더링
    rouletteWheel.innerHTML = spinItems.map(r => `<div class="roulette-item">${escapeHtml(r.이름)}</div>`).join('');

    // 위치 초기화
    rouletteWheel.style.transition = 'none';
    rouletteWheel.style.transform = 'translateY(0)';
    void rouletteWheel.offsetHeight;

    // 스핀 개시 (60px 높이씩 translateY)
    const itemHeight = 60;
    const targetTranslateY = -(targetSpinIndex * itemHeight);
    rouletteWheel.style.transition = 'transform 3.2s cubic-bezier(0.1, 0.8, 0.15, 1)';
    rouletteWheel.style.transform = `translateY(${targetTranslateY}px)`;

    // 스핀 완료 후 결과 출력
    setTimeout(() => {
      rouletteContainer.classList.add('hidden');
      recommendationResultContainer.classList.remove('hidden');
      void recommendationResultContainer.offsetWidth;
      recommendationResultContainer.classList.add('visible');

      renderTodayPick(selectedRestaurant);
      renderCourse(selectedRestaurant, keyword);
      updateFilteredList();
      showToast(`🐯 오늘의 맛집 '${selectedRestaurant.이름}' 추천!`, 'success');
    }, 3300);
  }
}

// 오늘의 추천 맛집 선정 및 렌더링
function renderTodayPick(pick) {
  if (!pick) {
    todayPickCard.innerHTML = `<div class="no-pick">선택한 키워드에 해당하는 맛집이 없습니다.</div>`;
    return;
  }

  todayPickCard.innerHTML = `
    <div class="pick-left">
      <div class="pick-header">
        <span class="pick-category">${escapeHtml(pick.카테고리)}</span>
        <h3 class="pick-title">${escapeHtml(pick.이름)}</h3>
        <span class="pick-rating">★ ${escapeHtml(pick.별점)}</span>
      </div>
      <div class="pick-meta">
        <div class="meta-item">
          <span class="meta-label">📍 위치:</span>
          <span class="meta-value">${escapeHtml(pick.위치)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">🕒 브레이크:</span>
          <span class="meta-value">${escapeHtml(pick.브레이크타임 || '없음')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">🍴 대표 메뉴:</span>
          <span class="meta-value">${escapeHtml(pick.대표메뉴 || '정보 없음')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">💵 가격대:</span>
          <span class="meta-value">${escapeHtml(pick.가격대 || '정보 없음')}</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="openRestaurantDetail('${escapeJs(pick.이름)}')">
        상세 정보 & 연락처 보기
      </button>
    </div>
    <div class="pick-right">
      <div class="pick-reason-title">🐯 선배들의 강력 추천 이유!</div>
      <p class="pick-reason">"${escapeHtml(pick.추천이유 || '정성스럽고 맛있는 메뉴가 준비되어 있습니다.')}"</p>
      
      <div class="map-buttons" style="margin-top: 18px;">
        <a href="https://map.naver.com/v5/search/${encodeURIComponent('안암동 ' + pick.이름)}" target="_blank" class="btn btn-map-naver" style="font-size: 0.75rem; padding: 6px 12px;">
          🗺️ 네이버 지도
        </a>
        <a href="https://map.kakao.com/link/search/${encodeURIComponent('안암동 ' + pick.이름)}" target="_blank" class="btn btn-map-kakao" style="font-size: 0.75rem; padding: 6px 12px;">
          💛 카카오 맵
        </a>
      </div>
    </div>
  `;
}

// 2차 코스 맛집 선정 함수
function findSecondCourse(firstRestaurant, keyword) {
  let candidates = [];
  
  if (keyword === '밥약' || keyword === '데이트') {
    // 2차: 디저트/카페
    candidates = allRestaurants.filter(r => 
      r.이름 !== firstRestaurant.이름 && 
      (r.카테고리 === '디저트' || (r.키워드 && r.키워드.includes('카공')))
    );
  } else if (keyword === '뒤풀이') {
    // 2차: 술집/주점/2차 맛집
    candidates = allRestaurants.filter(r => 
      r.이름 !== firstRestaurant.이름 && 
      (r.카테고리.includes('주점') || (r.키워드 && r.키워드.includes('뒤풀이')))
    );
  } else {
    // 혼밥, 카공 등: 카페나 가벼운 디저트
    candidates = allRestaurants.filter(r => 
      r.이름 !== firstRestaurant.이름 && 
      (r.카테고리 === '디저트' || (r.키워드 && r.키워드.includes('카공')))
    );
  }

  // 만약 후보가 없으면 디저트 전체 중 선택, 혹은 첫번째와 다른 아무 가게나 선택
  if (candidates.length === 0) {
    candidates = allRestaurants.filter(r => r.이름 !== firstRestaurant.이름);
  }
  
  if (candidates.length === 0) return null;
  
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

// 코스 추천 렌더링
function renderCourse(firstRestaurant, keyword) {
  const second = findSecondCourse(firstRestaurant, keyword);
  if (!second) {
    courseFlow.innerHTML = `<div class="no-course">연계하여 추천할 수 있는 2차 코스(카페/주점) 데이터가 부족합니다.</div>`;
    return;
  }
  
  let step1Title = "1차 식사";
  let step2Title = "2차 디저트 카페";
  
  if (keyword === '뒤풀이') {
    step1Title = "1차 모임/회식";
    step2Title = "2차 뒤풀이 주점";
  } else if (keyword === '카공') {
    step1Title = "1차 집중 카공";
    step2Title = "2차 가벼운 기분전환 카페";
  } else if (keyword === '혼밥') {
    step1Title = "1차 든든한 혼밥";
    step2Title = "2차 식후 테이크아웃";
  }

  courseFlow.innerHTML = `
    <!-- Step 1 -->
    <div class="course-step" onclick="openRestaurantDetail('${escapeJs(firstRestaurant.이름)}')">
      <div class="step-number">1</div>
      <div class="step-content">
        <span class="step-category">${escapeHtml(firstRestaurant.카테고리)}</span>
        <h5 class="step-name">${escapeHtml(firstRestaurant.이름)}</h5>
        <div class="step-menu">🍴 대표 메뉴: ${escapeHtml(firstRestaurant.대표메뉴 || '정보 없음')}</div>
        <p class="step-desc">${escapeHtml(step1Title)} 추천지. (클릭하면 정보 보기)</p>
      </div>
    </div>
    
    <!-- Connector -->
    <div class="course-connector">➔</div>
    
    <!-- Step 2 -->
    <div class="course-step" onclick="openRestaurantDetail('${escapeJs(second.이름)}')">
      <div class="step-number">2</div>
      <div class="step-content">
        <span class="step-category">${escapeHtml(second.카테고리)}</span>
        <h5 class="step-name">${escapeHtml(second.이름)}</h5>
        <div class="step-menu">🍴 대표 메뉴: ${escapeHtml(second.대표메뉴 || '정보 없음')}</div>
        <p class="step-desc">${escapeHtml(step2Title)} 추천지. (클릭하면 정보 보기)</p>
      </div>
    </div>
  `;
}

// 하단 리스트 필터 및 정렬 업데이트
function updateFilteredList() {
  const locVal = filterLocation.value;
  const catVal = filterCategory.value;
  const sortVal = sortBy.value;

  // 1. 키워드 필터링된 상태에서 추가 필터(위치, 카테고리, 검색어) 적용
  let list = filteredRestaurants.filter(r => {
    const matchLoc = (locVal === "전체" || r.위치 === locVal);
    const matchCat = (catVal === "전체" || r.카테고리 === catVal);
    
    let matchSearch = true;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const name = (r.이름 || '').toLowerCase();
      const menu = (r.대표메뉴 || '').toLowerCase();
      const category = (r.카테고리 || '').toLowerCase();
      const keyword = (r.키워드 || '').toLowerCase();
      const reason = (r.추천이유 || '').toLowerCase();
      
      matchSearch = name.includes(q) || 
                    menu.includes(q) || 
                    category.includes(q) || 
                    keyword.includes(q) || 
                    reason.includes(q) ||
                    matchChosung(name, q) ||
                    matchChosung(menu, q);
    }

    return matchLoc && matchCat && matchSearch;
  });

  // 2. 정렬 적용
  if (sortVal === "별점순") {
    list.sort((a, b) => parseFloat(b.별점 || 0) - parseFloat(a.별점 || 0));
  } else if (sortVal === "이름순") {
    list.sort((a, b) => (a.이름 || "").localeCompare(b.이름 || "", 'ko'));
  }

  // 개수 업데이트
  resultCountEl.textContent = `총 ${list.length}개 검색됨`;

  // 3. 렌더링
  if (list.length === 0) {
    restaurantsGrid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  restaurantsGrid.classList.remove('hidden');

  restaurantsGrid.innerHTML = list.map(r => {
    return `
      <div class="restaurant-card" onclick="openRestaurantDetail('${escapeJs(r.이름)}')">
        <div class="card-top">
          <div class="card-header-info">
            <h3 class="card-title">${escapeHtml(r.이름)}</h3>
            <span class="card-rating">★ ${escapeHtml(r.별점)}</span>
          </div>
          <div class="card-badges">
            <span class="badge-tag loc">📍 ${escapeHtml(r.위치)}</span>
            <span class="badge-tag cat">${escapeHtml(r.카테고리)}</span>
          </div>
          <p class="card-desc">${escapeHtml(r.추천이유 || '추천 설명이 없습니다.')}</p>
        </div>
        <div class="card-footer">
          <div class="footer-item">
            <span class="footer-item-val">${escapeHtml(r.대표메뉴 || '메뉴 정보 없음')}</span>
          </div>
          <div class="footer-item">
            <span>💵 ${escapeHtml(r.가격대 || '-')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 상세 모달 열기
window.openRestaurantDetail = function(name) {
  const restaurant = allRestaurants.find(r => r.이름 === name);
  if (!restaurant) return;

  modalName.textContent = restaurant.이름;
  modalCategory.textContent = restaurant.카테고리;
  modalRating.textContent = `★ ${restaurant.별점}`;
  modalLocation.textContent = restaurant.위치;
  modalBreaktime.textContent = restaurant.브레이크타임 || '없음';
  modalMenu.textContent = restaurant.대표메뉴 || '정보 없음';
  modalPrice.textContent = restaurant.가격대 || '정보 없음';
  modalPhone.textContent = restaurant.연락처 || '등록된 번호 없음';
  modalReason.textContent = restaurant.추천이유 || '추천 설명이 등록되어 있지 않습니다.';

  // 지도 바로가기 링크 대입 (검색어 보정 '안암동' 추가)
  btnNaverMap.href = `https://map.naver.com/v5/search/${encodeURIComponent('안암동 ' + restaurant.이름)}`;
  btnKakaoMap.href = `https://map.kakao.com/link/search/${encodeURIComponent('안암동 ' + restaurant.이름)}`;

  // 키워드 태그 목록 생성
  modalKeywords.innerHTML = '';
  if (restaurant.키워드) {
    const tags = restaurant.키워드.split(';').map(t => t.trim());
    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag-keyword';
      span.textContent = `#${tag}`;
      modalKeywords.appendChild(span);
    });
  }

  // 모달 띄우기
  detailModal.classList.remove('hidden');
  void detailModal.offsetWidth;
  detailModal.classList.add('visible');
};

function closeModal() {
  detailModal.classList.remove('visible');
  setTimeout(() => {
    detailModal.classList.add('hidden');
  }, 300);
}

// 보안용 HTML 이스케이프 함수
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 인라인 이벤트 리스너용 JS 이스케이프 함수
function escapeJs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}
