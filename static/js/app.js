/**
 * FastAPI Board - Frontend Application Logic
 * 바닐라 자바스크립트(ES6+) 기반 비동기 REST API 클라이언트
 */

/**
 * 마크다운 에디터 & 툴바 제어 클래스
 * - 13가지 서식 도구 지원
 * - 선택 영역(selectionStart/End) 보존 및 자동 템플릿 삽입 UX
 * - Undo/Redo, 드롭다운 메뉴, 실시간 미리보기 렌더링 지원
 */
class MarkdownEditor {
  constructor({ containerId, textareaId, previewPaneId, previewContentId, editPaneId, addMenuId, moreMenuId }) {
    this.container = document.getElementById(containerId);
    this.textarea = document.getElementById(textareaId);
    this.previewPane = document.getElementById(previewPaneId);
    this.previewContent = document.getElementById(previewContentId);
    this.editPane = document.getElementById(editPaneId);
    this.addMenu = document.getElementById(addMenuId);
    this.moreMenu = document.getElementById(moreMenuId);

    if (this.container && this.textarea) {
      this.initEvents();
    }
  }

  // 이벤트 리스너 등록
  initEvents() {
    const toolbar = this.container.querySelector(".markdown-toolbar");
    if (toolbar) {
      // 툴바 버튼 클릭 시 textarea의 포커스 및 선택 영역이 풀리지 않도록 mousedown 이벤트 차단
      toolbar.addEventListener("mousedown", (e) => {
        const btn = e.target.closest(".md-btn, .dropdown-item");
        if (btn) {
          e.preventDefault();
        }
      });

      // 툴바 버튼 클릭 처리
      toolbar.addEventListener("click", (e) => {
        const btn = e.target.closest(".md-btn, .dropdown-item");
        if (!btn) return;
        const action = btn.dataset.action;
        if (action) {
          this.handleAction(action);
        }
      });
    }

    // 에디터 바깥 영역 클릭 시 열려있는 드롭다운 메뉴 닫기
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) {
        this.closeAllDropdowns();
      }
    });

    // 텍스트 입력 시 실시간 미리보기 갱신
    this.textarea.addEventListener("input", () => {
      this.updatePreview();
    });
  }

  // 드롭다운 메뉴 닫기
  closeAllDropdowns() {
    if (this.addMenu) this.addMenu.classList.add("hidden");
    if (this.moreMenu) this.moreMenu.classList.add("hidden");
  }

  // 툴바 기능별 분기 처리
  handleAction(action) {
    switch (action) {
      case "toggle-add":
        if (this.moreMenu) this.moreMenu.classList.add("hidden");
        if (this.addMenu) this.addMenu.classList.toggle("hidden");
        break;

      case "toggle-more":
        if (this.addMenu) this.addMenu.classList.add("hidden");
        if (this.moreMenu) this.moreMenu.classList.toggle("hidden");
        break;

      case "bold":
        this.wrapSelection("**", "**", "굵은 텍스트");
        this.closeAllDropdowns();
        break;

      case "underline":
        this.wrapSelection("<u>", "</u>", "밑줄 텍스트");
        this.closeAllDropdowns();
        break;

      case "highlight":
        this.wrapSelection("==", "==", "형광펜 텍스트");
        this.closeAllDropdowns();
        break;

      case "undo":
        this.textarea.focus();
        document.execCommand("undo");
        this.updatePreview();
        break;

      case "redo":
        this.textarea.focus();
        document.execCommand("redo");
        this.updatePreview();
        break;

      case "quote":
        this.prefixLines("> ", "인용 문구를 입력하세요");
        this.closeAllDropdowns();
        break;

      case "link":
        this.insertLink();
        this.closeAllDropdowns();
        break;

      case "checklist":
        this.prefixLines("- [ ] ", "할 일 항목");
        this.closeAllDropdowns();
        break;

      case "bullet-list":
        this.prefixLines("- ", "목록 항목");
        this.closeAllDropdowns();
        break;

      case "numbered-list":
        this.prefixLines("1. ", "번호 목록 항목");
        this.closeAllDropdowns();
        break;

      case "code-block":
        this.insertCodeBlock();
        this.closeAllDropdowns();
        break;

      case "heading-1":
        this.prefixLines("# ", "대제목 내용");
        this.closeAllDropdowns();
        break;

      case "heading-2":
        this.prefixLines("## ", "중제목 내용");
        this.closeAllDropdowns();
        break;

      case "heading-3":
        this.prefixLines("### ", "소제목 내용");
        this.closeAllDropdowns();
        break;

      case "strikethrough":
        this.wrapSelection("~~", "~~", "취소선 텍스트");
        this.closeAllDropdowns();
        break;

      case "inline-code":
        this.wrapSelection("`", "`", "코드");
        this.closeAllDropdowns();
        break;

      case "details-toggle":
        this.insertDetails();
        this.closeAllDropdowns();
        break;

      case "insert-image":
        this.insertImage();
        this.closeAllDropdowns();
        break;

      case "insert-table":
        this.insertTable();
        this.closeAllDropdowns();
        break;

      case "insert-callout":
        this.insertCallout();
        this.closeAllDropdowns();
        break;

      case "insert-hr":
        this.insertText("\n\n---\n\n");
        this.closeAllDropdowns();
        break;
    }
  }

  // [UX 핵심] 텍스트 앞뒤 감싸기 및 드래그 영역 유지
  wrapSelection(prefix, suffix, defaultText) {
    const el = this.textarea;
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const hasSelection = start !== end;
    const selectedText = hasSelection ? val.substring(start, end) : defaultText;

    const replacement = prefix + selectedText + suffix;
    el.setRangeText(replacement, start, end, "select");

    if (!hasSelection) {
      // 선택된 내용이 없었으면 기본 텍스트 부분을 드래그 선택 상태로 지정 (바로 타이핑하여 수정 가능)
      el.setSelectionRange(start + prefix.length, start + prefix.length + defaultText.length);
    } else {
      // 선택된 내용이 있었으면 서식이 감싸진 내부 텍스트를 계속 선택 상태로 유지
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }

    this.updatePreview();
  }

  // 줄 단위 접두사 삽입 (인용구, 목록, 체크박스 등)
  prefixLines(prefix, defaultText) {
    const el = this.textarea;
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;

    if (start === end) {
      // 커서 위치에서 해당 줄의 시작 위치 탐색
      const lineStart = val.lastIndexOf("\n", start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      if (currentLine.trim().length === 0) {
        const insert = prefix + defaultText;
        el.setRangeText(insert, start, end, "select");
        el.setSelectionRange(start + prefix.length, start + insert.length);
      } else {
        el.setRangeText(prefix, lineStart, lineStart, "select");
        el.setSelectionRange(start + prefix.length, start + prefix.length);
      }
    } else {
      // 여러 줄이 드래그 선택된 경우 각 줄마다 접두사 적용
      const selected = val.substring(start, end);
      const lines = selected.split("\n");
      const transformed = lines.map((line) => (line.startsWith(prefix) ? line : prefix + line)).join("\n");
      el.setRangeText(transformed, start, end, "select");
      el.setSelectionRange(start, start + transformed.length);
    }

    this.updatePreview();
  }

  // 단순 텍스트 삽입
  insertText(text) {
    const el = this.textarea;
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.setRangeText(text, start, end, "end");
    this.updatePreview();
  }

  // 하이퍼링크 삽입
  insertLink() {
    const el = this.textarea;
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || "링크 텍스트";
    const linkTemplate = `[${selected}](https://)`;
    el.setRangeText(linkTemplate, start, end, "select");
    const urlStart = start + selected.length + 3;
    el.setSelectionRange(urlStart, urlStart + 8);
    this.updatePreview();
  }

  // 이미지 템플릿 삽입
  insertImage() {
    const el = this.textarea;
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || "이미지 설명";
    const imgTemplate = `![${selected}](https://images.unsplash.com/photo-1518770660439-4636190af475?w=800)`;
    el.setRangeText(imgTemplate, start, end, "select");
    this.updatePreview();
  }

  // 표(테이블) 템플릿 삽입
  insertTable() {
    const tableTemplate = `\n| 제목 1 | 제목 2 | 제목 3 |\n| :--- | :---: | ---: |\n| 내용 1 | 내용 2 | 내용 3 |\n| 항목 A | 항목 B | 항목 C |\n\n`;
    this.insertText(tableTemplate);
  }

  // 안내 박스(콜아웃) 삽입
  insertCallout() {
    const calloutTemplate = `\n> 💡 **안내 및 주의사항**\n> 여기에 중요한 내용을 상세히 작성하세요.\n\n`;
    this.insertText(calloutTemplate);
  }

  // 접기/펼치기 블록 삽입
  insertDetails() {
    const detailsTemplate = `\n<details>\n<summary>👉 상세 내용 열기 (클릭)</summary>\n\n숨겨진 세부 정보나 본문 내용을 여기에 작성합니다.\n</details>\n\n`;
    this.insertText(detailsTemplate);
  }

  // 코드 블록 삽입
  insertCodeBlock() {
    const el = this.textarea;
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);

    if (selected) {
      const code = "```\n" + selected + "\n```";
      el.setRangeText(code, start, end, "select");
      el.setSelectionRange(start + 4, start + 4 + selected.length);
    } else {
      const code = '```python\n# 코드를 여기에 입력하세요\nprint("Hello, FastAPI Board!")\n```\n';
      el.setRangeText(code, start, end, "select");
      el.setSelectionRange(start + 10, start + 10 + 13);
    }
    this.updatePreview();
  }

  // 탭 전환 (작성 vs 미리보기)
  switchTab(tabName) {
    if (tabName === "preview") {
      this.updatePreview();
      if (this.editPane) this.editPane.classList.add("hidden");
      if (this.previewPane) this.previewPane.classList.remove("hidden");
    } else {
      if (this.previewPane) this.previewPane.classList.add("hidden");
      if (this.editPane) this.editPane.classList.remove("hidden");
      setTimeout(() => this.textarea.focus(), 50);
    }
  }

  // 실시간 미리보기 렌더링
  updatePreview() {
    if (!this.previewContent) return;
    const markdown = this.textarea.value.trim();
    if (!markdown) {
      this.previewContent.innerHTML = '<p class="preview-placeholder">작성창에 내용을 입력하면 여기에 실시간으로 서식이 반영됩니다.</p>';
      return;
    }
    this.previewContent.innerHTML = app.renderMarkdown(markdown);
  }

  // 상태 초기화
  reset() {
    this.closeAllDropdowns();
    this.switchTab("write");
  }
}

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

  writeEditor: null,
  editEditor: null,

  // --- 1. 초기화 메서드 ---
  init() {
    this.applyTheme(this.state.theme);
    this.bindEvents();
    this.loadPosts();
    this.loadCategories();

    // 마크다운 에디터 인스턴스 초기화
    this.writeEditor = new MarkdownEditor({
      containerId: "writeEditor",
      textareaId: "writeContent",
      previewPaneId: "writePreviewPane",
      previewContentId: "writePreviewContent",
      editPaneId: "writeEditPane",
      addMenuId: "writeAddMenu",
      moreMenuId: "writeMoreMenu"
    });

    this.editEditor = new MarkdownEditor({
      containerId: "editEditor",
      textareaId: "editContent",
      previewPaneId: "editPreviewPane",
      previewContentId: "editPreviewContent",
      editPaneId: "editEditPane",
      addMenuId: "editAddMenu",
      moreMenuId: "editMoreMenu"
    });
  },

  // --- 1-1. 서버 응답 에러 안전 파싱 헬퍼 (JSON 파싱 에러 방지) ---
  async parseErrorMessage(response, defaultMsg = "요청 처리 중 오류가 발생했습니다.") {
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data && data.detail) {
          if (Array.isArray(data.detail)) {
            return data.detail.map(d => d.msg).join(", ");
          }
          return data.detail;
        }
      }
      const text = await response.text();
      if (text && text.trim().length > 0 && text.length < 200) {
        return text.trim();
      }
    } catch (e) {
      console.warn("에러 메시지 파싱 중 오류:", e);
    }
    return `${defaultMsg} (HTTP ${response.status})`;
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

    // 에디터 탭 전환 이벤트 (작성 / 미리보기)
    document.querySelectorAll(".editor-tabs").forEach((tabContainer) => {
      tabContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab-btn");
        if (!btn) return;
        const targetTab = btn.dataset.tab;
        const editorType = tabContainer.dataset.editor;

        tabContainer.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        if (editorType === "write" && this.writeEditor) {
          this.writeEditor.switchTab(targetTab);
        } else if (editorType === "edit" && this.editEditor) {
          this.editEditor.switchTab(targetTab);
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
        const errMsg = await this.parseErrorMessage(response, "게시글을 찾을 수 없습니다.");
        throw new Error(errMsg);
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
      // 마크다운 문법을 파싱하고 살균된 HTML로 본문 렌더링
      document.getElementById("viewContent").innerHTML = this.renderMarkdown(post.content);

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

    // 마크다운 에디터 초기화 (작성 탭으로 복귀 및 드롭다운 닫기)
    if (this.writeEditor) {
      this.writeEditor.reset();
      const tabs = document.querySelector('.editor-tabs[data-editor="write"]');
      if (tabs) {
        tabs.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "write"));
      }
    }

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
        const errMsg = await this.parseErrorMessage(response, "게시글 등록에 실패했습니다.");
        throw new Error(errMsg);
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

    // 마크다운 에디터 초기화
    if (this.editEditor) {
      this.editEditor.reset();
      const tabs = document.querySelector('.editor-tabs[data-editor="edit"]');
      if (tabs) {
        tabs.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "write"));
      }
    }

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
        const errMsg = await this.parseErrorMessage(response, "수정에 실패했습니다.");
        throw new Error(errMsg);
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
        const errMsg = await this.parseErrorMessage(response, "삭제에 실패했습니다.");
        throw new Error(errMsg);
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
  },

  // --- 17. 유틸리티: 마크다운 파싱 & XSS 방어 살균 렌더러 ---
  renderMarkdown(markdownText) {
    if (!markdownText) return "";

    // 1. 형광펜 문법 (==선택텍스트==) -> <mark>선택텍스트</mark> 치환
    let text = String(markdownText).replace(/==([^=\n\r]+)==/g, "<mark>$1</mark>");

    // 2. marked.js 라이브러리가 로드되어 있으면 파싱
    if (typeof marked !== "undefined" && marked.parse) {
      try {
        marked.setOptions({
          gfm: true,
          breaks: true
        });
        const rawHtml = marked.parse(text);

        // 3. DOMPurify로 XSS 방어 살균 (mark, u, details, summary 등 허용)
        if (typeof DOMPurify !== "undefined") {
          return DOMPurify.sanitize(rawHtml, {
            ADD_TAGS: ["mark", "u", "details", "summary", "input"],
            ADD_ATTR: ["type", "checked", "disabled"]
          });
        }
        return rawHtml;
      } catch (err) {
        console.warn("마크다운 파싱 에러:", err);
      }
    }

    // fallback: 순수 텍스트 이스케이프 및 줄바꿈 보존
    return this.escapeHtml(text).replace(/\n/g, "<br/>");
  }
};

// DOM 로드 완료 시 앱 실행
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
