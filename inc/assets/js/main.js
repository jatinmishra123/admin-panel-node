"use strict";

// ================= SHARED PROFILE UI =================
window.applyUserProfileUI = function applyUserProfileUI(user) {
  var sidebarNameEl = document.querySelector(".sidebar-user strong");
  var sidebarWorkspaceEl = document.querySelector(".sidebar-user small");
  var sidebarAvatar = document.querySelector(".sidebar-user .avatar-img");
  var profileNameEls = document.querySelectorAll(".profile-name");
  var profileAvatarEls = document.querySelectorAll(".profile-button .avatar-img, .profile-button img");
  var brandSubtitleEl = document.querySelector(".brand-subtitle");

  if (sidebarNameEl) sidebarNameEl.textContent = user.name;
  if (sidebarWorkspaceEl && user.workspace) sidebarWorkspaceEl.textContent = user.workspace;
  if (sidebarAvatar && user.avatar) { sidebarAvatar.src = user.avatar; sidebarAvatar.alt = user.name; }
  if (brandSubtitleEl && user.name) brandSubtitleEl.textContent = user.name;

  Array.prototype.forEach.call(profileNameEls, function (el) { el.textContent = user.name; });
  Array.prototype.forEach.call(profileAvatarEls, function (img) { if (user.avatar) img.src = user.avatar; if (user.name) img.alt = user.name; });
};

// ================= AUTH HELPERS =================
window.getAuthToken = function getAuthToken() {
  try {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  } catch (error) {
    return null;
  }
};

window.clearAuthToken = function clearAuthToken() {
  try {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  } catch (error) {
    // ignore
  }
};

window.authorizedFetch = async function authorizedFetch(url, options) {
  options = options || {};
  var token = window.getAuthToken();
  options.headers = Object.assign({}, options.headers, token ? { Authorization: "Bearer " + token } : {});

  var response = await fetch(url, options);

  if (response.status === 401 || response.status === 403) {
    window.clearAuthToken();
    window.location.href = "/";
    return null;
  }

  return response;
};

// ================= PAGE AUTH GUARD + PROFILE LOAD =================
(function () {
  function run() {
    var isProtectedPage = !!document.querySelector(".admin-shell");

    if (!isProtectedPage) {
      return;
    }

    var token = window.getAuthToken();

    if (!token) {
      window.location.href = "/";
      return;
    }

    window.authorizedFetch("/api/profile")
      .then(function (response) {
        return response ? response.json() : null;
      })
      .then(function (result) {
        if (result && result.success && result.data) {
          window.adminHMDUser = {
            name: result.data.name,
            email: result.data.email,
            workspace: "Active Workspace",
            avatar: "../assets/images/brand/logo/logo.png"
          };
          window.applyUserProfileUI(window.adminHMDUser);
        }
      })
      .catch(function (error) {
        console.log("Profile load failed:", error);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();

// ================= SHARED LAYOUT PARTIALS (sidebar / navbar / footer) =================
function loadShellPartials(onDone) {
  var sidebarSlot = document.getElementById("sidebarSlot");
  var navbarSlot = document.getElementById("navbarSlot");
  var footerSlot = document.getElementById("footerSlot");

  if (!sidebarSlot && !navbarSlot && !footerSlot) {
    onDone();
    return;
  }

  function inject(slot, url) {
    if (!slot) return Promise.resolve();
    return fetch(url)
      .then(function (response) { return response.text(); })
      .then(function (html) { slot.outerHTML = html; })
      .catch(function (error) { console.log("Failed to load " + url + ":", error); });
  }

  Promise.all([
    inject(sidebarSlot, "/sidebar"),
    inject(navbarSlot, "/navbar"),
    inject(footerSlot, "/footer")
  ]).then(onDone);
}

(function () {
  var sidebarStorageKey = "adminHMD.sidebarMini";
  var themeStorageKey = "adminHMD.colorTheme";
  var desktopMedia = "(min-width: 992px)";

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
      return;
    }

    callback();
  }

  function isDesktop() {
    return window.matchMedia(desktopMedia).matches;
  }

  function canUseStorage() {
    try {
      var testKey = sidebarStorageKey + ".test";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getSavedMiniState(storageAvailable) {
    if (!storageAvailable) {
      return false;
    }

    return window.localStorage.getItem(sidebarStorageKey) === "true";
  }

  function saveMiniState(storageAvailable, isMini) {
    if (storageAvailable) {
      window.localStorage.setItem(sidebarStorageKey, String(isMini));
    }
  }

  function getPreferredTheme(storageAvailable) {
    var savedTheme = storageAvailable ? window.localStorage.getItem(themeStorageKey) : "";

    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  }

  onReady(function () {
    var body = document.body;
    var mediaQuery = window.matchMedia(desktopMedia);
    var storageAvailable = canUseStorage();
    var themeToggles = [];
    var themeIcons = [];

    function initValidation() {
      var forms = document.querySelectorAll(".needs-validation");

      Array.prototype.forEach.call(forms, function (form) {
        form.addEventListener("submit", function (event) {
          if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
          }

          form.classList.add("was-validated");
        });
      });
    }

    function initTableSearch() {
      var searchInputs = document.querySelectorAll("[data-table-search]");

      Array.prototype.forEach.call(searchInputs, function (input) {
        var tableId = input.getAttribute("data-table-search");
        var table = document.getElementById(tableId);

        if (!table) {
          return;
        }

        input.addEventListener("input", function () {
          var query = input.value.trim().toLowerCase();
          var rows = table.querySelectorAll("tbody tr");

          Array.prototype.forEach.call(rows, function (row) {
            row.hidden = query !== "" && row.textContent.toLowerCase().indexOf(query) === -1;
          });
        });
      });
    }

    function updateThemeControls(theme) {
      var nextTheme = theme === "dark" ? "light" : "dark";
      var label = "Switch to " + nextTheme + " mode";
      var iconClass = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";

      Array.prototype.forEach.call(themeToggles, function (button) {
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
      });

      Array.prototype.forEach.call(themeIcons, function (icon) {
        icon.className = iconClass;
      });
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-bs-theme", theme);

      if (storageAvailable) {
        window.localStorage.setItem(themeStorageKey, theme);
      }

      updateThemeControls(theme);
    }

    function initThemeToggle() {
      applyTheme(getPreferredTheme(storageAvailable));

      Array.prototype.forEach.call(themeToggles, function (button) {
        button.addEventListener("click", function () {
          var currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
          applyTheme(currentTheme === "dark" ? "light" : "dark");
        });
      });
    }

    initValidation();
    initTableSearch();

    // Initialize user profile values in UI. Provide a window.adminHMDUser object to override defaults.
    function initUserProfile() {
      var user = window.adminHMDUser || { name: "Loading...", workspace: "Active Workspace", avatar: "../assets/images/brand/logo/logo.png" };
      window.applyUserProfileUI(user);
    }

    function setClass(element, className, enabled) {
      if (enabled) {
        element.classList.add(className);
      } else {
        element.classList.remove(className);
      }
    }

    function initSidebarToggle() {
      var sidebarToggle = document.querySelector("[data-sidebar-toggle]");
      var closeButtons = document.querySelectorAll("[data-sidebar-close]");
      var sidebarLinks = document.querySelectorAll(".sidebar-nav .nav-link");

      if (!sidebarToggle) {
        return;
      }

      function setToggleExpanded() {
        var expanded = isDesktop()
          ? !body.classList.contains("sidebar-mini")
          : body.classList.contains("sidebar-open");

        sidebarToggle.setAttribute("aria-expanded", String(expanded));
      }

      function closeMobileSidebar() {
        body.classList.remove("sidebar-open");
        setToggleExpanded();
      }

      function toggleSidebar() {
        if (isDesktop()) {
          body.classList.toggle("sidebar-mini");
          saveMiniState(storageAvailable, body.classList.contains("sidebar-mini"));
        } else {
          body.classList.toggle("sidebar-open");
        }

        setToggleExpanded();
      }

      function addCloseHandlers(items) {
        Array.prototype.forEach.call(items, function (item) {
          item.addEventListener("click", function () {
            if (!isDesktop()) {
              closeMobileSidebar();
            }
          });
        });
      }

      if (getSavedMiniState(storageAvailable) && isDesktop()) {
        body.classList.add("sidebar-mini");
      }

      sidebarToggle.addEventListener("click", toggleSidebar);
      addCloseHandlers(closeButtons);
      addCloseHandlers(sidebarLinks);
      setToggleExpanded();

      function handleBreakpointChange() {
        if (isDesktop()) {
          body.classList.remove("sidebar-open");
          setClass(body, "sidebar-mini", getSavedMiniState(storageAvailable));
        } else {
          body.classList.remove("sidebar-mini");
        }

        setToggleExpanded();
      }

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleBreakpointChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleBreakpointChange);
      }
    }

    // ================= GLOBAL SEARCH (shared navbar) =================
    function initGlobalSearch() {
      var form = document.getElementById("globalSearchForm");
      var input = document.getElementById("globalSearchInput");
      var resultsEl = document.getElementById("globalSearchResults");
      if (!form || !input || !resultsEl || form.dataset.searchWired) return;
      form.dataset.searchWired = "true";

      var debounceTimer = null;

      function closeResults() {
        resultsEl.classList.remove("show");
        resultsEl.innerHTML = "";
      }

      function renderResults(matches) {
        if (!matches.length) {
          resultsEl.innerHTML = '<span class="dropdown-item text-muted small">No matches found.</span>';
          resultsEl.classList.add("show");
          return;
        }

        resultsEl.innerHTML = "";
        matches.slice(0, 8).forEach(function (match) {
          var item = document.createElement("a");
          item.className = "dropdown-item d-flex align-items-center gap-2";
          item.href = match.href;
          item.innerHTML =
            '<i class="bi ' + match.icon + '" aria-hidden="true"></i>' +
            '<span class="flex-grow-1"></span>' +
            '<span class="badge text-bg-secondary"></span>';
          item.querySelector("span.flex-grow-1").textContent = match.label;
          item.querySelector(".badge").textContent = match.type;
          resultsEl.appendChild(item);
        });
        resultsEl.classList.add("show");
      }

      function runSearch(term) {
        Promise.all([
          window.authorizedFetch("/api/users"),
          window.authorizedFetch("/api/products"),
          window.authorizedFetch("/api/categories")
        ]).then(function (responses) {
          if (!responses[0] || !responses[1] || !responses[2]) return null;
          return Promise.all(responses.map(function (r) { return r.json(); }));
        }).then(function (jsons) {
          if (!jsons) return;
          var query = term.toLowerCase();
          var matches = [];

          (jsons[0].data || []).forEach(function (user) {
            if (user.name.toLowerCase().indexOf(query) !== -1 || user.email.toLowerCase().indexOf(query) !== -1) {
              matches.push({ label: user.name + " (" + user.email + ")", type: "User", icon: "bi-person", href: "/users" });
            }
          });

          (jsons[1].data || []).forEach(function (product) {
            if (product.name.toLowerCase().indexOf(query) !== -1) {
              matches.push({ label: product.name, type: "Product", icon: "bi-box-seam", href: "/product" });
            }
          });

          (jsons[2].data || []).forEach(function (category) {
            if (category.name.toLowerCase().indexOf(query) !== -1) {
              matches.push({ label: category.name, type: "Category", icon: "bi-grid", href: "/category" });
            }
          });

          renderResults(matches);
        }).catch(function (error) {
          console.error("Search failed:", error);
        });
      }

      input.addEventListener("input", function () {
        var term = input.value.trim();
        clearTimeout(debounceTimer);

        if (term.length < 2) {
          closeResults();
          return;
        }

        debounceTimer = setTimeout(function () { runSearch(term); }, 300);
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
      });

      document.addEventListener("click", function (event) {
        if (!form.contains(event.target)) {
          closeResults();
        }
      });
    }

    // ================= NOTIFICATIONS (shared navbar) =================
    function timeAgoShort(value) {
      var diffMs = Date.now() - new Date(value).getTime();
      var minutes = Math.floor(diffMs / 60000);
      if (minutes < 1) return "just now";
      if (minutes < 60) return minutes + " minute" + (minutes === 1 ? "" : "s") + " ago";
      var hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
      var days = Math.floor(hours / 24);
      return days + " day" + (days === 1 ? "" : "s") + " ago";
    }

    function loadNotifications() {
      var list = document.getElementById("notificationList");
      if (!list) return;

      window.authorizedFetch("/api/dashboard/summary")
        .then(function (response) { return response ? response.json() : null; })
        .then(function (result) {
          if (!result || !result.success) return;
          var activity = result.data.recentActivity || [];

          if (!activity.length) {
            list.innerHTML = '<span class="dropdown-item text-muted small">No notifications yet.</span>';
            return;
          }

          list.innerHTML = "";
          activity.slice(0, 5).forEach(function (item) {
            var link = document.createElement("a");
            link.className = "dropdown-item";
            link.href = "/users";
            link.innerHTML = '<span class="notification-title"></span><span class="notification-time"></span>';
            link.querySelector(".notification-title").textContent = item.title;
            link.querySelector(".notification-time").textContent = timeAgoShort(item.date);
            list.appendChild(link);
          });
        })
        .catch(function (error) {
          console.log("Notifications load failed:", error);
        });
    }

    // ================= SIGN OUT (clears token before navigating) =================
    function initSignOut() {
      var signOutLinks = document.querySelectorAll('a[href="/"]');
      Array.prototype.forEach.call(signOutLinks, function (link) {
        if (link.dataset.signOutWired) return;
        if (link.textContent.trim().toLowerCase().indexOf("sign out") !== -1) {
          link.dataset.signOutWired = "true";
          link.addEventListener("click", function () {
            window.clearAuthToken();
          });
        }
      });
    }

    function runShellDependentInit() {
      themeToggles = document.querySelectorAll("[data-theme-toggle]");
      themeIcons = document.querySelectorAll("[data-theme-icon]");
      initThemeToggle();
      initUserProfile();
      initSidebarToggle();
      initGlobalSearch();
      loadNotifications();
      initSignOut();
    }

    loadShellPartials(runShellDependentInit);
  });
})();

// ================= TOAST NOTIFICATIONS =================
(function () {
  var containerClass = "app-toast-container";

  function getContainer() {
    var container = document.querySelector("." + containerClass);

    if (!container) {
      container = document.createElement("div");
      container.className = containerClass + " toast-container position-fixed top-0 end-0 p-3";
      container.style.zIndex = "1090";
      document.body.appendChild(container);
    }

    return container;
  }

  function showToast(message, type) {
    var variant = type === "error" ? "danger" : type === "info" ? "primary" : type === "warning" ? "warning" : "success";
    var icon = variant === "danger" ? "bi-x-circle" : variant === "primary" ? "bi-info-circle" : variant === "warning" ? "bi-exclamation-triangle" : "bi-check-circle";

    var container = getContainer();
    var toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center border-0 text-bg-" + variant;
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");

    var flexEl = document.createElement("div");
    flexEl.className = "d-flex";

    var bodyEl = document.createElement("div");
    bodyEl.className = "toast-body";
    bodyEl.innerHTML = '<i class="bi ' + icon + ' me-2" aria-hidden="true"></i>';
    bodyEl.appendChild(document.createTextNode(String(message)));

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-close btn-close-white me-2 m-auto";
    closeBtn.setAttribute("data-bs-dismiss", "toast");
    closeBtn.setAttribute("aria-label", "Close");

    flexEl.appendChild(bodyEl);
    flexEl.appendChild(closeBtn);
    toastEl.appendChild(flexEl);
    container.appendChild(toastEl);

    if (window.bootstrap && window.bootstrap.Toast) {
      var toast = new window.bootstrap.Toast(toastEl, { delay: 3500 });
      toastEl.addEventListener("hidden.bs.toast", function () {
        toastEl.remove();
      });
      toast.show();
    } else {
      setTimeout(function () {
        toastEl.remove();
      }, 3500);
    }
  }

  window.showToast = showToast;
})();

// ================= CONFIRM DIALOG (replaces window.confirm) =================
window.confirmDialog = function confirmDialog(message, options) {
  options = options || {};

  return new Promise(function (resolve) {
    var modalEl = document.createElement("div");
    modalEl.className = "modal fade";
    modalEl.tabIndex = -1;
    modalEl.innerHTML =
      '<div class="modal-dialog modal-dialog-centered">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title"></h5>' +
            '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
          '</div>' +
          '<div class="modal-body"><p class="mb-0"></p></div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-outline-secondary" data-action="cancel">Cancel</button>' +
            '<button type="button" class="btn btn-danger" data-action="confirm"></button>' +
          '</div>' +
        '</div>' +
      '</div>';

    modalEl.querySelector(".modal-title").textContent = options.title || "Please confirm";
    modalEl.querySelector(".modal-body p").textContent = message;
    modalEl.querySelector('[data-action="confirm"]').textContent = options.confirmText || "Delete";

    document.body.appendChild(modalEl);
    var modal = new window.bootstrap.Modal(modalEl);
    var resolved = false;

    modalEl.querySelector('[data-action="confirm"]').addEventListener("click", function () {
      resolved = true;
      resolve(true);
      modal.hide();
    });

    modalEl.addEventListener("hidden.bs.modal", function () {
      if (!resolved) resolve(false);
      modalEl.remove();
    });

    modal.show();
  });
};

// ================= EDIT DIALOG (dynamic form modal) =================
window.editDialog = function editDialog(options) {
  options = options || {};
  var fields = options.fields || [];
  var values = options.values || {};

  return new Promise(function (resolve) {
    var modalEl = document.createElement("div");
    modalEl.className = "modal fade";
    modalEl.tabIndex = -1;

    var fieldsHtml = fields.map(function (field) {
      if (field.type === "select") {
        var optionsHtml = (field.options || []).map(function (opt) {
          return '<option value="' + opt + '">' + opt + '</option>';
        }).join("");
        return (
          '<div class="mb-3">' +
            '<label class="form-label">' + field.label + '</label>' +
            '<select class="form-select" data-field="' + field.key + '">' + optionsHtml + '</select>' +
          '</div>'
        );
      }
      if (field.type === "textarea") {
        return (
          '<div class="mb-3">' +
            '<label class="form-label">' + field.label + '</label>' +
            '<textarea class="form-control" rows="3" data-field="' + field.key + '"></textarea>' +
          '</div>'
        );
      }
      if (field.type === "file") {
        return (
          '<div class="mb-3">' +
            '<label class="form-label">' + field.label + '</label>' +
            '<input class="form-control" type="file" accept="image/*" data-field="' + field.key + '">' +
          '</div>'
        );
      }
      return (
        '<div class="mb-3">' +
          '<label class="form-label">' + field.label + '</label>' +
          '<input class="form-control" type="' + (field.type || "text") + '" data-field="' + field.key + '"' + (field.required ? " required" : "") + '>' +
        '</div>'
      );
    }).join("");

    modalEl.innerHTML =
      '<div class="modal-dialog modal-dialog-centered">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title"></h5>' +
            '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
          '</div>' +
          '<form novalidate>' +
            '<div class="modal-body">' + fieldsHtml + '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>' +
              '<button type="submit" class="btn btn-primary">Save Changes</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

    modalEl.querySelector(".modal-title").textContent = options.title || "Edit";

    fields.forEach(function (field) {
      var el = modalEl.querySelector('[data-field="' + field.key + '"]');
      if (!el || field.type === "file") return;
      el.value = values[field.key] != null ? values[field.key] : "";
    });

    document.body.appendChild(modalEl);
    var modal = new window.bootstrap.Modal(modalEl);
    var resolved = false;

    modalEl.querySelector("form").addEventListener("submit", function (event) {
      event.preventDefault();
      var result = {};
      fields.forEach(function (field) {
        var el = modalEl.querySelector('[data-field="' + field.key + '"]');
        if (!el) return;
        result[field.key] = field.type === "file" ? el.files[0] || null : el.value.trim();
      });
      resolved = true;
      resolve(result);
      modal.hide();
    });

    modalEl.addEventListener("hidden.bs.modal", function () {
      if (!resolved) resolve(null);
      modalEl.remove();
    });

    modal.show();
  });
};
