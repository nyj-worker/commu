/**
 * FastAPI Board - Frontend Application Logic
 * 바닐라 자바스크립트(ES6+) 기반 비동기 REST API 클라이언트
 */

// 전역 앱 객체 정의
const app = {
  state: {
    page: 1,
    limit: 9,
    category: "전체",
    keyword: "",
    currentPost: null, // 현재 상세보기 중인 게시글
    theme: localStorage.getItem("fastapi_board_theme") || "light"
  },

  // --- 1. 초기화 메서드 ---
  init() {
    this.applyTheme(this.state.theme);
    this.bindEvents();
    this.loadPosts();
    this.loadCategories();
  },

  // --- 2. 테마 설정 (라이트 / 다크) ---
  applyTheme(theme) {
    this.state.theme = theme;
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("fastapi_board_theme", theme);

    const sunIcon = document.getElementById("themeIconSun");
    const moonIcon = document.getElementById("themeIconMoon");
    if (theme === "dark") {
      sunIcon.classList.add("hidden");
      moonIcon.classList.remove("hidden");
    } else {
      sunIcon.classList.remove("hidden");
      moonIcon.classList.add("hidden");
    }
  },

  toggleTheme() {
    const nextTheme = this.state.theme === "light" ? "dark" : "light";
    this.applyTheme(nextTheme);
  },

  // --- 3. 이벤트 리스너 등록 ---
  bindEvents() {
    // 테마 토글 버튼
    document.getElementById("themeToggleBtn").addEventListener("click", () => this.toggleTheme());

    // 글쓰기 모달 열기 버튼
    document.getElementById("openWriteModalBtn").addEventListener("click", () => this.openWriteModal());

    // 카테고리 탭 클릭 이벤트 (이벤트 위임)
    const categoryTabs = document.getElementById("categoryTabs");
    categoryTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-tab");
      if (!btn) return;
      const cat = btn.dataset.category;
      this.setCategory(cat);
    });

    // 검색 입력 디바운스 (사용자 타이핑 완료 350ms 후 검색 실행)
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearSearchBtn");
    let debounceTimer = null;

    searchInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      clearBtn.classList.toggle("hidden", val.length === 0);

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.state.keyword = val;
        this.state.page = 1;
        this.loadPosts();
      }, 350);
    });

    // 검색 지우기 버튼
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearBtn.classList.add("hidden");
      this.state.keyword = "";
      this.state.page = 1;
      this.loadPosts();
      searchInput.focus();
    });

    // 상세보기 모달 내 [수정], [삭제] 버튼
    document.getElementById("btnOpenEdit").addEventListener("click", () => this.openEditModal());
    document.getElementById("btnOpenDelete").addEventListener("click", () => this.openDeleteModal());

    // ESC 키로 열린 모달 닫기
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAllModals();
      }
    });

    // 모달 바깥 배경(오버레이) 클릭 시 닫기
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.classList.add("hidden");
        }
      });
    });
  },

  // --- 4. 카테고리 선택 변경 ---
  setCategory(category) {
    this.state.category = category;
    this.state.page = 1;

    // 탭 활성화 UI 갱신
    document.querySelectorAll(".cat-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.category === category);
    });

    this.loadPosts();
  },

  // --- 5. 백엔드 API: 게시글 목록 불러오기 ---
  async loadPosts() {
    const { page, limit, category, keyword } = this.state;
    const params = new URLSearchParams({
      page: page,
      limit: limit
    });

    if (category && category !== "전체") {
      params.append("category", category);
    }
    if (keyword && keyword.trim()) {
      params.append("keyword", keyword.trim());
    }

    try {
      const response = await fetch(`/api/posts?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`서버 응답 오류 (${response.status})`);
      }
      const data = await response.json();
      this.renderPosts(data);
      this.renderPagination(data);
    } catch (err) {
      console.error("게시글 로드 실패:", err);
      this.showToast("게시글 목록을 불러오지 못했습니다.", "error");
    }
  },

  // --- 6. 백엔드 API: 카테고리 통계 불러오기 ---
  async loadCategories() {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) return;
      const counts = await response.json();

      let total = 0;
      const countMap = { "공지": 0, "자유": 0, "질문": 0, "정보": 0, "일반": 0 };

      counts.forEach((item) => {
        total += item.count;
        if (countMap.hasOwnProperty(item.name)) {
          countMap[item.name] = item.count;
        }
      });

      const countAllEl = document.getElementById("countAll");
      const countNoticeEl = document.getElementById("countNotice");
      const countFreeEl = document.getElementById("countFree");
      const countQnaEl = document.getElementById("countQna");
      const countInfoEl = document.getElementById("countInfo");

      if (countAllEl) countAllEl.textContent = total;
      if (countNoticeEl) countNoticeEl.textContent = countMap["공지"] || 0;
      if (countFreeEl) countFreeEl.textContent = countMap["자유"] || 0;
      if (countQnaEl) countQnaEl.textContent = countMap["질문"] || 0;
      if (countInfoEl) countInfoEl.textContent = countMap["정보"] || 0;
    } catch (err) {
      console.warn("카테고리 통계 로드 생략:", err);
    }
  },

  // --- 7. 게시글 목록 렌더링 ---
  renderPosts(data) {
    const grid = document.getElementById("postsGrid");
    const emptyState = document.getElementById("emptyState");
    const totalCountText = document.getElementById("totalCountText");

    totalCountText.textContent = data.total_count;

    if (!data.items || data.items.length === 0) {
      grid.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    grid.innerHTML = data.items
      .map((post) => {
        const initial = post.author ? post.author.charAt(0).toUpperCase() : "?";
        const formattedDate = this.formatDate(post.created_at);

        return `
          <article class="post-card" onclick="app.viewPost(${post.id})">
            <div>
              <div class="post-card-top">
                <span class="post-badge badge-${this.escapeHtml(post.category)}">${this.escapeHtml(post.category)}</span>
                <span class="post-card-id">#${post.id}</span>
              </div>
              <h2 class="post-card-title">${this.escapeHtml(post.title)}</h2>
              <p class="post-card-snippet">${this.escapeHtml(post.content)}</p>
            </div>
            
            <div class="post-card-footer">
              <div class="post-author-wrap">
                <div class="avatar-mini">${this.escapeHtml(initial)}</div>
                <span class="post-card-author">${this.escapeHtml(post.author)}</span>
              </div>
              <div class="post-meta-group">
                <div class="post-meta-item" title="조회수">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>${post.views}</span>
                </div>
                <span>&bull;</span>
                <time datetime="${post.created_at}">${formattedDate}</time>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  },

  // --- 8. 페이지네이션 버튼 렌더링 ---
  renderPagination(data) {
    const container = document.getElementById("pagination");
    if (!data.total_pages || data.total_pages <= 1) {
      container.innerHTML = "";
      return;
    }

    const { page, total_pages } = data;
    let buttonsHtml = "";

    // 이전 페이지 버튼
    buttonsHtml += `
      <button class="page-btn" ${page <= 1 ? "disabled" : ""} onclick="app.goToPage(${page - 1})" title="이전 페이지">
        &lsaquo;
      </button>
    `;

    // 페이지 번호 생성 (최대 5개 범위 표기)
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(total_pages, startPage + 4);

    for (let p = startPage; p <= endPage; p++) {
      buttonsHtml += `
        <button class="page-btn ${p === page ? "active" : ""}" onclick="app.goToPage(${p})">
          ${p}
        </button>
      `;
    }

    // 다음 페이지 버튼
    buttonsHtml += `
      <button class="page-btn" ${page >= total_pages ? "disabled" : ""} onclick="app.goToPage(${page + 1})" title="다음 페이지">
        &rsaquo;
      </button>
    `;

    container.innerHTML = buttonsHtml;
  },

  goToPage(pageNum) {
    this.state.page = pageNum;
    this.loadPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // --- 9. 게시글 상세 조회 (모달 열기 및 조회수 갱신) ---
  async viewPost(postId) {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) {
        throw new Error("게시글을 찾을 수 없습니다.");
      }
      const post = await response.json();
      this.state.currentPost = post;

      // 모달 DOM 엘리먼트에 데이터 채우기
      document.getElementById("viewId").textContent = post.id;
      document.getElementById("viewTitle").textContent = post.title;
      document.getElementById("viewAuthor").textContent = post.author;
      document.getElementById("viewAvatar").textContent = post.author.charAt(0).toUpperCase();
      document.getElementById("viewDate").textContent = this.formatDate(post.created_at, true);
      document.getElementById("viewViews").textContent = post.views;
      document.getElementById("viewContent").textContent = post.content;

      const categoryBadge = document.getElementById("viewCategory");
      categoryBadge.textContent = post.category;
      categoryBadge.className = `post-badge badge-${post.category}`;

      this.openModal("viewModal");

      // 목록의 조회수도 업데이트하기 위해 조용히 목록 갱신
      this.loadPosts();
    } catch (err) {
      console.error(err);
      this.showToast(err.message || "게시글 정보를 가져오지 못했습니다.", "error");
    }
  },

  // --- 10. 신규 게시글 작성 처리 ---
  openWriteModal() {
    document.getElementById("writeForm").reset();
    this.openModal("writeModal");
    setTimeout(() => document.getElementById("writeTitle").focus(), 100);
  },

  async handleCreatePost(event) {
    event.preventDefault();

    const title = document.getElementById("writeTitle").value.trim();
    const content = document.getElementById("writeContent").value.trim();
    const author = document.getElementById("writeAuthor").value.trim();
    const category = document.getElementById("writeCategory").value;
    const password = document.getElementById("writePassword").value;

    if (password.length < 4) {
      this.showToast("비밀번호는 최소 4자리 이상이어야 합니다.", "error");
      return;
    }

    const submitBtn = document.getElementById("btnSubmitWrite");
    submitBtn.disabled = true;
    submitBtn.textContent = "저장 중...";

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, author, category, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "게시글 등록에 실패했습니다.");
      }

      this.closeModal("writeModal");
      this.showToast("게시글이 성공적으로 등록되었습니다!", "success");

      // 목록 및 카테고리 갱신 후 첫 페이지로 이동
      this.state.page = 1;
      this.loadPosts();
      this.loadCategories();
    } catch (err) {
      console.error(err);
      this.showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "작성 완료";
    }
  },

  // --- 11. 게시글 수정 처리 ---
  openEditModal() {
    const post = this.state.currentPost;
    if (!post) return;

    this.closeModal("viewModal");

    document.getElementById("editPostId").value = post.id;
    document.getElementById("editCategory").value = post.category;
    document.getElementById("editTitle").value = post.title;
    document.getElementById("editContent").value = post.content;
    document.getElementById("editPassword").value = "";

    this.openModal("editModal");
    setTimeout(() => document.getElementById("editTitle").focus(), 100);
  },

  async handleUpdatePost(event) {
    event.preventDefault();

    const postId = document.getElementById("editPostId").value;
    const title = document.getElementById("editTitle").value.trim();
    const content = document.getElementById("editContent").value.trim();
    const category = document.getElementById("editCategory").value;
    const password = document.getElementById("editPassword").value;

    const submitBtn = document.getElementById("btnSubmitEdit");
    submitBtn.disabled = true;
    submitBtn.textContent = "수정 중...";

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "수정에 실패했습니다.");
      }

      const updatedPost = await response.json();
      this.closeModal("editModal");
      this.showToast("게시글이 성공적으로 수정되었습니다!", "success");

      // 갱신된 내용으로 상세 모달 다시 열기
      this.viewPost(updatedPost.id);
      this.loadCategories();
    } catch (err) {
      console.error(err);
      this.showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "수정 저장";
    }
  },

  // --- 12. 게시글 삭제 처리 ---
  openDeleteModal() {
    const post = this.state.currentPost;
    if (!post) return;

    this.closeModal("viewModal");

    document.getElementById("deletePostId").value = post.id;
    document.getElementById("deletePassword").value = "";

    this.openModal("deleteModal");
    setTimeout(() => document.getElementById("deletePassword").focus(), 100);
  },

  async handleDeletePost(event) {
    event.preventDefault();

    const postId = document.getElementById("deletePostId").value;
    const password = document.getElementById("deletePassword").value;

    const submitBtn = document.getElementById("btnSubmitDelete");
    submitBtn.disabled = true;
    submitBtn.textContent = "삭제 중...";

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "삭제에 실패했습니다.");
      }

      this.closeModal("deleteModal");
      this.showToast("게시글이 삭제되었습니다.", "info");

      this.state.currentPost = null;
      this.loadPosts();
      this.loadCategories();
    } catch (err) {
      console.error(err);
      this.showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "영구 삭제";
    }
  },

  // --- 13. 모달 공통 제어 ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
    }
  },

  closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.classList.add("hidden");
    });
  },

  // --- 14. 토스트 알림 표시 ---
  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === "error") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  // --- 15. 유틸리티: HTML 이스케이프 (XSS 방어) ---
  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  // --- 16. 유틸리티: 일시 포맷팅 ---
  formatDate(dateStr, full = false) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    if (full) {
      return `${year}.${month}.${day} ${hours}:${minutes}`;
    }
    return `${year}.${month}.${day}`;
  }
};

// DOM 로드 완료 시 앱 실행
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
