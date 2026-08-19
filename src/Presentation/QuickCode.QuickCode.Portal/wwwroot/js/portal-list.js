/**
 * Portal list grid — column resize + live reorder (localStorage).
 * Toolbar lives in the pager row; ghosts are always cleaned up.
 */
(function () {
  "use strict";

  var STORAGE_PREFIX = "qc.portal.list.layout:";
  var MIN_COL_PX = 64;
  var OPS_KEY = "ops";
  var EDGE_SCROLL_PX = 48;
  var EDGE_SCROLL_SPEED = 18;
  var LONG_PRESS_MS = 320;
  var HOLD_CANCEL_PX = 8;
  var activeGhost = null;
  var edgeScrollRaf = 0;

  function storageKey() {
    return STORAGE_PREFIX + (window.location.pathname.replace(/\/$/, "") || "/");
  }

  function loadPrefs() {
    try {
      var raw = window.localStorage.getItem(storageKey());
      if (!raw) return { widths: {}, order: null };
      var parsed = JSON.parse(raw);
      return {
        widths: parsed && parsed.widths && typeof parsed.widths === "object" ? parsed.widths : {},
        order: Array.isArray(parsed && parsed.order) ? parsed.order : null
      };
    } catch (e) {
      return { widths: {}, order: null };
    }
  }

  function savePrefs(prefs) {
    try {
      var payload = {
        widths: prefs.widths || {},
        order: prefs.order || null
      };
      var hasWidths = Object.keys(payload.widths).length > 0;
      var hasOrder = Array.isArray(payload.order) && payload.order.length > 0;
      if (!hasWidths && !hasOrder) {
        window.localStorage.removeItem(storageKey());
        return;
      }
      window.localStorage.setItem(storageKey(), JSON.stringify(payload));
    } catch (e) {
      /* ignore */
    }
  }

  function clearPrefs() {
    try {
      window.localStorage.removeItem(storageKey());
    } catch (e) {
      /* ignore */
    }
  }

  function removeAllGhosts() {
    document.querySelectorAll(".portal-col-ghost").forEach(function (el) {
      el.remove();
    });
    activeGhost = null;
  }

  function stopEdgeScroll() {
    if (edgeScrollRaf) {
      cancelAnimationFrame(edgeScrollRaf);
      edgeScrollRaf = 0;
    }
  }

  function slugKey(text, index) {
    var base = String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    return base || "col_" + index;
  }

  function headerCells(table) {
    var row = table.querySelector("thead tr");
    return row ? Array.prototype.slice.call(row.children) : [];
  }

  function headerLabel(th) {
    var label = "";
    th.childNodes.forEach(function (node) {
      if (node.nodeType === 3) label += node.textContent;
      else if (
        node.nodeType === 1 &&
        !node.classList.contains("portal-col-resize")
      ) {
        label += node.textContent || "";
      }
    });
    return label.replace(/\s+/g, " ").trim();
  }

  function isOpsHeader(th) {
    if (!th) return false;
    return (
      th.dataset.colKey === OPS_KEY ||
      th.dataset.colType === "ops" ||
      th.classList.contains("portal-ops-cell")
    );
  }

  function opsCells(table) {
    var keyed = cellsForKey(table, OPS_KEY);
    if (keyed.length) return keyed;
    return table.querySelectorAll(
      "th.portal-ops-cell, td.portal-ops-cell, thead th:first-child, tbody td:first-child"
    );
  }

  /** Size the actions column to the visible button group (stops leftover table width inflating it). */
  function fitOpsColumn(table) {
    var sample =
      table.querySelector("td.portal-ops-cell, td[data-col-key='ops']") ||
      table.querySelector("tbody td:has(.opButtonDetail), tbody td:has(.opButtonUpdate), tbody td:has(.opButtonDelete)");
    if (!sample) return;

    var group =
      sample.querySelector(".portal-ops-group, .btn-group, button-group, [class*='btn-group']") ||
      sample;
    var cs = window.getComputedStyle(sample);
    var pad =
      (parseFloat(cs.paddingLeft) || 0) +
      (parseFloat(cs.paddingRight) || 0) +
      (parseFloat(cs.borderLeftWidth) || 0) +
      (parseFloat(cs.borderRightWidth) || 0);
    var content = Math.ceil(group.scrollWidth || group.getBoundingClientRect().width);
    if (!(content > 0)) return;

    var px = Math.max(MIN_COL_PX, content + Math.ceil(pad));
    var pxValue = px + "px";

    Array.prototype.forEach.call(opsCells(table), function (cell) {
      cell.classList.add("portal-ops-cell");
      if (!cell.dataset.colKey) cell.dataset.colKey = OPS_KEY;
      if (!cell.dataset.colType) cell.dataset.colType = "ops";
      cell.style.setProperty("width", pxValue, "important");
      cell.style.setProperty("min-width", pxValue, "important");
      cell.style.setProperty("max-width", pxValue, "important");
    });
  }

  function ensureColumnKeys(table) {
    var headers = headerCells(table);
    headers.forEach(function (th, index) {
      if (th.classList.contains("portal-ops-cell") || th.dataset.colType === "ops") {
        th.dataset.colKey = OPS_KEY;
        th.dataset.colType = "ops";
        return;
      }
      if (th.dataset.colKey) return;
      th.dataset.colKey = slugKey(headerLabel(th) || th.textContent, index);
    });

    // Body cells that hold action buttons are always ops.
    table.querySelectorAll("tbody td").forEach(function (td, index) {
      if (
        td.classList.contains("portal-ops-cell") ||
        td.querySelector(".opButtonDetail, .opButtonUpdate, .opButtonDelete")
      ) {
        td.classList.add("portal-ops-cell");
        td.dataset.colKey = OPS_KEY;
        td.dataset.colType = "ops";
        if (!td.dataset.opsCount) {
          td.dataset.opsCount = String(
            td.querySelectorAll(".opButtonDetail, .opButtonUpdate, .opButtonDelete").length
          );
        }
        var th = headers[index];
        if (th && !th.dataset.colKey) {
          th.classList.add("portal-ops-cell");
          th.dataset.colKey = OPS_KEY;
          th.dataset.colType = "ops";
          if (!th.dataset.opsCount) th.dataset.opsCount = td.dataset.opsCount;
        }
      }
    });

    syncBodyKeys(table);

    if (!table.dataset.defaultOrder) {
      table.dataset.defaultOrder = JSON.stringify(
        headers.map(function (th) {
          return th.dataset.colKey;
        })
      );
    }
  }

  function syncBodyKeys(table) {
    var headers = headerCells(table);
    table.querySelectorAll("tbody tr").forEach(function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, index) {
        var key = headers[index] && headers[index].dataset.colKey;
        if (key) td.dataset.colKey = key;
      });
    });
  }

  function currentOrder(table) {
    return headerCells(table).map(function (th) {
      return th.dataset.colKey;
    });
  }

  function defaultOrder(table) {
    try {
      var parsed = JSON.parse(table.dataset.defaultOrder || "[]");
      return Array.isArray(parsed) ? parsed : currentOrder(table);
    } catch (e) {
      return currentOrder(table);
    }
  }

  function cellMapForRow(row) {
    var map = {};
    Array.prototype.forEach.call(row.children, function (cell) {
      var key = cell.dataset.colKey;
      if (key) map[key] = cell;
    });
    return map;
  }

  function normalizeOrder(known, order) {
    var next = [];
    if (known.indexOf(OPS_KEY) !== -1) next.push(OPS_KEY);
    (order || []).forEach(function (key) {
      if (key === OPS_KEY) return;
      if (known.indexOf(key) !== -1 && next.indexOf(key) === -1) next.push(key);
    });
    known.forEach(function (key) {
      if (next.indexOf(key) === -1) next.push(key);
    });
    return next;
  }

  function applyOrder(table, order) {
    if (!Array.isArray(order) || !order.length) return false;

    var headers = headerCells(table);
    var known = headers.map(function (th) {
      return th.dataset.colKey;
    });
    var next = normalizeOrder(known, order);
    var same =
      next.length === known.length &&
      next.every(function (key, i) {
        return key === known[i];
      });
    if (same) return false;

    var rows = [table.querySelector("thead tr")].concat(
      Array.prototype.slice.call(table.querySelectorAll("tbody tr"))
    );

    rows.forEach(function (row) {
      if (!row) return;
      var map = cellMapForRow(row);
      next.forEach(function (key) {
        if (map[key]) row.appendChild(map[key]);
      });
    });

    syncBodyKeys(table);
    ensureChrome(table);
    fitOpsColumn(table);
    return true;
  }

  function cellsForKey(table, key) {
    return table.querySelectorAll('[data-col-key="' + String(key).replace(/"/g, '\\"') + '"]');
  }

  function measureColumnWidths(table) {
    var widths = {};
    headerCells(table).forEach(function (th) {
      var key = th.dataset.colKey;
      if (!key) return;
      widths[key] = Math.max(MIN_COL_PX, Math.round(th.getBoundingClientRect().width));
    });
    return widths;
  }

  function syncTableWidth(table, widths) {
    var scroll = table.closest(".portal-table-scroll");
    // Topic Workflows (and similar): fill available width instead of hugging content.
    if (scroll && scroll.classList.contains("portal-table-scroll--fill")) {
      table.style.setProperty("width", "100%", "important");
      table.style.setProperty("min-width", "100%", "important");
      table.style.setProperty("max-width", "none", "important");
      table.style.setProperty("table-layout", "fixed", "important");
      return;
    }

    var sum = 0;
    var count = 0;
    var hasPrefs = !!(widths && Object.keys(widths).length);

    if (hasPrefs) {
      headerCells(table).forEach(function (th) {
        var key = th.dataset.colKey;
        if (!key || key === OPS_KEY) return;
        var w = Number(widths[key]);
        if (w > 0) {
          sum += Math.round(w);
          count++;
        }
      });

      var opsTh = table.querySelector("th.portal-ops-cell, th[data-col-key='ops']");
      if (opsTh) {
        var opsW = parseFloat(opsTh.style.width);
        if (!(opsW > 0)) opsW = opsTh.getBoundingClientRect().width;
        if (opsW > 0) sum += Math.round(opsW);
      }
    }

    if (hasPrefs && count > 0 && sum > 0) {
      table.style.setProperty("width", sum + "px", "important");
      table.style.setProperty("min-width", sum + "px", "important");
      table.style.setProperty("max-width", "none", "important");
      return;
    }

    table.style.setProperty("width", "max-content", "important");
    table.style.setProperty("min-width", "max-content", "important");
    table.style.setProperty("max-width", "none", "important");
  }

  function applyWidths(table, widths) {
    headerCells(table).forEach(function (th) {
      var key = th.dataset.colKey;
      if (!key || key === OPS_KEY) return; // ops width is fitted to buttons
      var w = widths && widths[key];
      var px = w && Number(w) > 0 ? Math.round(Number(w)) + "px" : "";
      cellsForKey(table, key).forEach(function (cell) {
        if (px) {
          cell.style.setProperty("width", px, "important");
          cell.style.setProperty("min-width", px, "important");
          cell.style.setProperty("max-width", px, "important");
        } else {
          cell.style.removeProperty("width");
          cell.style.removeProperty("min-width");
          cell.style.removeProperty("max-width");
        }
      });
    });
    fitOpsColumn(table);
    syncTableWidth(table, widths);
  }

  /** Lock every column to its current painted width so one resize cannot redistribute others. */
  function lockCurrentWidths(table, prefs, overrideKey, overridePx) {
    var locked = measureColumnWidths(table);
    if (overrideKey && Number(overridePx) > 0) {
      locked[overrideKey] = Math.max(MIN_COL_PX, Math.round(Number(overridePx)));
    }
    prefs.widths = locked;
    applyWidths(table, prefs.widths);
    return prefs;
  }

  function prefsDifferFromDefault(table, prefs) {
    if (prefs.widths && Object.keys(prefs.widths).length > 0) return true;
    if (!prefs.order || !prefs.order.length) return false;
    var def = defaultOrder(table);
    if (prefs.order.length !== def.length) return true;
    return prefs.order.some(function (key, i) {
      return key !== def[i];
    });
  }

  function updateResetState(toolbar, table, prefs) {
    var btn = toolbar.querySelector("[data-portal-list-reset]");
    if (!btn) return;
    var dirty = prefsDifferFromDefault(table, prefs);
    btn.disabled = !dirty;
    btn.classList.toggle("is-active", dirty);
    btn.setAttribute("aria-hidden", dirty ? "false" : "true");
  }

  function findPager(form) {
    return form.querySelector(".portal-list-pager");
  }

  function ensurePagerLayout(pager) {
    if (!pager) return null;

    pager.classList.add("portal-list-pager");

    var meta =
      pager.querySelector(".portal-list-pager__cluster") ||
      pager.querySelector(".portal-list-pager__meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "portal-list-pager__cluster";

      var summary =
        pager.querySelector(".portal-list-pager__range") ||
        pager.querySelector(".portal-list-pager__summary") ||
        pager.querySelector(":scope > .p-2.ps-0, :scope > .p-2");
      if (summary && !summary.querySelector("nav, .pagination, .portal-pager")) {
        summary.classList.remove("p-2", "ps-0");
        meta.appendChild(summary);
      } else {
        var kids = Array.prototype.slice.call(pager.children);
        for (var i = 0; i < kids.length; i++) {
          var kid = kids[i];
          if (kid.querySelector && kid.querySelector("nav, .pagination, .portal-pager")) continue;
          if (kid.classList.contains("portal-list-toolbar")) continue;
          meta.appendChild(kid);
          break;
        }
      }
      pager.insertBefore(meta, pager.firstChild);
    }

    var nav =
      pager.querySelector(".portal-list-pager__nav") ||
      (function () {
        var navHost = null;
        Array.prototype.some.call(pager.children, function (child) {
          if (child === meta) return false;
          if (child.classList.contains("portal-list-toolbar")) return false;
          if (child.querySelector && child.querySelector("nav, .pagination, .portal-pager")) {
            navHost = child;
            return true;
          }
          return false;
        });
        if (!navHost) return null;
        navHost.classList.add("portal-list-pager__nav");
        navHost.classList.remove("p-2");
        return navHost;
      })();

    if (nav && nav.parentElement === pager) {
      pager.appendChild(nav);
    }

    return meta;
  }

  function ensureToolbar(form, scroll) {
    // Remove legacy in-table / misplaced toolbars.
    scroll.querySelectorAll(".portal-list-toolbar").forEach(function (el) {
      el.remove();
    });
    scroll.classList.remove("portal-table-scroll--layout");
    form.querySelectorAll(".portal-list-pager > .portal-list-toolbar").forEach(function (el) {
      el.remove();
    });

    var pager = findPager(form);
    var meta = ensurePagerLayout(pager);
    if (meta) {
      var existing = meta.querySelector(".portal-list-toolbar");
      if (existing) return existing;

      var actions = document.createElement("div");
      actions.className = "portal-list-toolbar";
      actions.innerHTML =
        '<button type="button" class="portal-list-reset" data-portal-list-reset disabled' +
        ' title="Reset column layout" aria-label="Reset column layout" aria-hidden="true">' +
        '<i class="fas fa-undo-alt" aria-hidden="true"></i>' +
        "<span>Reset layout</span>" +
        "</button>";
      meta.appendChild(actions);
      return actions;
    }

    var prev = scroll.previousElementSibling;
    if (prev && prev.classList.contains("portal-list-toolbar")) return prev;
    var solo = document.createElement("div");
    solo.className = "portal-list-toolbar portal-list-toolbar--solo";
    solo.innerHTML =
      '<button type="button" class="portal-list-reset" data-portal-list-reset disabled' +
      ' title="Reset column layout" aria-label="Reset column layout" aria-hidden="true">' +
      '<i class="fas fa-undo-alt" aria-hidden="true"></i>' +
      "<span>Reset layout</span>" +
      "</button>";
    scroll.parentElement.insertBefore(solo, scroll);
    return solo;
  }

  function ensureChrome(table) {
    headerCells(table).forEach(function (th) {
      th.classList.add("portal-col-head");

      // Remove legacy grip icons — reorder is press-and-hold on the header itself.
      var oldGrip = th.querySelector(".portal-col-grip");
      if (oldGrip) oldGrip.remove();

      if (isOpsHeader(th)) {
        th.classList.add("portal-ops-cell");
        th.dataset.colKey = OPS_KEY;
        th.dataset.colType = "ops";
        th.classList.remove("portal-col-draggable");
        var oldResize = th.querySelector(".portal-col-resize");
        if (oldResize) oldResize.remove();
        return;
      }

      if (!th.querySelector(".portal-col-resize")) {
        var handle = document.createElement("span");
        handle.className = "portal-col-resize";
        handle.title = "Drag to resize";
        handle.setAttribute("role", "separator");
        handle.setAttribute("aria-orientation", "vertical");
        th.appendChild(handle);
      }

      th.classList.add("portal-col-draggable");
      th.title = th.title || "Press and hold to move column";
    });
  }

  function autoScrollNearEdge(scroll, clientX) {
    if (!scroll) return;
    var rect = scroll.getBoundingClientRect();
    var dx = 0;
    if (clientX < rect.left + EDGE_SCROLL_PX) dx = -EDGE_SCROLL_SPEED;
    else if (clientX > rect.right - EDGE_SCROLL_PX) dx = EDGE_SCROLL_SPEED;
    if (!dx) {
      stopEdgeScroll();
      return;
    }
    stopEdgeScroll();
    function tick() {
      scroll.scrollLeft += dx;
      edgeScrollRaf = requestAnimationFrame(tick);
    }
    edgeScrollRaf = requestAnimationFrame(tick);
  }

  function bindResize(table, scroll, getPrefs, setPrefs, toolbar) {
    table.addEventListener("pointerdown", function (event) {
      var handle = event.target.closest(".portal-col-resize");
      if (!handle || !table.contains(handle)) return;

      event.preventDefault();
      event.stopPropagation();

      var th = handle.closest("th");
      var key = th && th.dataset.colKey;
      if (!key) return;

      var startX = event.clientX;
      var startW = th.getBoundingClientRect().width;
      var pointerId = event.pointerId;

      // Freeze all columns at current painted widths before this one changes.
      var prefs0 = getPrefs();
      lockCurrentWidths(table, prefs0, key, startW);
      setPrefs(prefs0);

      try {
        handle.setPointerCapture(pointerId);
      } catch (e) {
        /* ignore */
      }
      table.classList.add("is-col-resizing");
      document.body.classList.add("portal-list-resizing");

      function onMove(ev) {
        var next = Math.max(MIN_COL_PX, Math.round(startW + (ev.clientX - startX)));
        var prefs = getPrefs();
        prefs.widths = prefs.widths || {};
        prefs.widths[key] = next;
        applyWidths(table, prefs.widths);
        autoScrollNearEdge(scroll, ev.clientX);
      }

      function onUp() {
        stopEdgeScroll();
        try {
          handle.releasePointerCapture(pointerId);
        } catch (e) {
          /* ignore */
        }
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
        handle.removeEventListener("lostpointercapture", onUp);
        table.classList.remove("is-col-resizing");
        document.body.classList.remove("portal-list-resizing");

        var prefs = getPrefs();
        prefs.widths = prefs.widths || measureColumnWidths(table);
        prefs.widths[key] = Math.max(MIN_COL_PX, Math.round(th.getBoundingClientRect().width));
        applyWidths(table, prefs.widths);
        setPrefs(prefs);
        updateResetState(toolbar, table, prefs);
      }

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
      handle.addEventListener("lostpointercapture", onUp);
    });
  }

  function bindReorder(table, scroll, getPrefs, setPrefs, toolbar) {
    var dragKey = null;
    var dragActive = false;
    var startClientX = 0;
    var startClientY = 0;
    var grabOffsetX = 16;
    var grabOffsetY = 12;
    var pendingTargetIndex = null;
    var sourceIndex = -1;
    var inserter = null;
    var DRAG_THRESHOLD_PX = 5;

    function ensureInserter() {
      if (!inserter || !inserter.isConnected) {
        inserter = scroll.querySelector(":scope > .portal-col-inserter");
        if (!inserter) {
          inserter = document.createElement("div");
          inserter.className = "portal-col-inserter";
          inserter.setAttribute("aria-hidden", "true");
          scroll.appendChild(inserter);
        }
      }
      return inserter;
    }

    function hideInserter() {
      if (inserter) {
        inserter.classList.remove("is-visible");
        inserter.style.height = "";
        inserter.style.left = "";
        inserter.style.top = "";
      }
    }

    function clearLift() {
      table.querySelectorAll(".is-col-lifted, .is-dragging").forEach(function (el) {
        el.classList.remove("is-col-lifted", "is-dragging");
      });
    }

    function setLift(key) {
      clearLift();
      if (!key) return;
      cellsForKey(table, key).forEach(function (cell) {
        cell.classList.add("is-col-lifted");
        if (cell.tagName === "TH") cell.classList.add("is-dragging");
      });
    }

    function cleanupUi() {
      stopEdgeScroll();
      removeAllGhosts();
      hideInserter();
      clearLift();
      table.classList.remove("is-col-reordering");
      document.body.classList.remove("portal-list-reordering");
      dragKey = null;
      dragActive = false;
      pendingTargetIndex = null;
      sourceIndex = -1;
    }

    /** Insert-before index in the live header list (0..n), ignoring the dragged column's body. */
    function resolveInsertBeforeIndex(clientX) {
      var headers = headerCells(table);
      var insertBefore = headers.length;

      for (var i = 0; i < headers.length; i++) {
        var key = headers[i].dataset.colKey;
        if (!key || key === dragKey) continue;
        var rect = headers[i].getBoundingClientRect();
        var mid = rect.left + rect.width / 2;
        if (clientX < mid) {
          insertBefore = i;
          break;
        }
      }

      // Never insert before pinned ops column.
      if (headers[0] && headers[0].dataset.colKey === OPS_KEY && insertBefore < 1) {
        insertBefore = 1;
      }
      return insertBefore;
    }

    /** Convert DOM insert-before index → index after removing the dragged column. */
    function toTargetIndex(insertBefore) {
      var order = currentOrder(table);
      var from = order.indexOf(dragKey);
      if (from < 0) return null;
      var target = insertBefore;
      if (from < insertBefore) target -= 1;
      if (order[0] === OPS_KEY && target < 1) target = 1;
      if (target < 0) target = 0;
      if (target > order.length - 1) target = order.length - 1;
      return target;
    }

    function placeInserter(insertBefore) {
      var el = ensureInserter();
      var headers = headerCells(table);
      var scrollRect = scroll.getBoundingClientRect();
      var tableRect = table.getBoundingClientRect();
      var x;

      if (!headers.length) return;

      if (insertBefore >= headers.length) {
        x = headers[headers.length - 1].getBoundingClientRect().right;
      } else {
        x = headers[insertBefore].getBoundingClientRect().left;
      }

      var left = x - scrollRect.left + scroll.scrollLeft;
      var top = tableRect.top - scrollRect.top + scroll.scrollTop;
      var height = Math.max(tableRect.height, scroll.clientHeight - 2);

      el.style.left = Math.round(left) + "px";
      el.style.top = Math.round(top) + "px";
      el.style.height = Math.round(height) + "px";
      el.classList.add("is-visible");
    }

    function updatePreview(clientX) {
      var insertBefore = resolveInsertBeforeIndex(clientX);
      var target = toTargetIndex(insertBefore);
      pendingTargetIndex = target;
      placeInserter(insertBefore);
    }

    function commitReorder() {
      if (dragKey == null || pendingTargetIndex == null || sourceIndex < 0) return false;
      if (pendingTargetIndex === sourceIndex) return false;

      var order = currentOrder(table).slice();
      var from = order.indexOf(dragKey);
      if (from < 0) return false;

      order.splice(from, 1);
      order.splice(pendingTargetIndex, 0, dragKey);
      applyOrder(table, order);
      return true;
    }

    function activateDrag(th, clientX, clientY) {
      if (dragActive) return;
      dragActive = true;
      sourceIndex = currentOrder(table).indexOf(dragKey);
      pendingTargetIndex = sourceIndex;

      setLift(dragKey);
      table.classList.add("is-col-reordering");
      document.body.classList.add("portal-list-reordering");

      var label = headerLabel(th) || th.dataset.colKey;
      activeGhost = document.createElement("div");
      activeGhost.className = "portal-col-ghost";
      activeGhost.innerHTML =
        '<span class="portal-col-ghost__label"></span>' +
        '<span class="portal-col-ghost__hint">Drop to place</span>';
      activeGhost.querySelector(".portal-col-ghost__label").textContent = label;
      document.body.appendChild(activeGhost);

      var thRect = th.getBoundingClientRect();
      grabOffsetX = Math.min(Math.max(clientX - thRect.left, 12), Math.max(thRect.width - 12, 12));
      grabOffsetY = Math.min(Math.max(clientY - thRect.top, 8), 28);
      activeGhost.style.transform =
        "translate(" + (clientX - grabOffsetX) + "px, " + (clientY - grabOffsetY) + "px)";

      updatePreview(clientX);
    }

    function onGlobalKey(ev) {
      if (ev.key === "Escape" && dragKey) {
        cleanupUi();
      }
    }

    document.addEventListener("keydown", onGlobalKey);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) cleanupUi();
    });

    table.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      if (event.target.closest(".portal-col-resize")) return;

      var th = event.target.closest("thead th.portal-col-draggable");
      if (!th || !table.contains(th) || th.dataset.colKey === OPS_KEY) return;

      var isTouch = event.pointerType === "touch" || event.pointerType === "pen";
      var holdMs = isTouch ? 450 : LONG_PRESS_MS;
      var cancelPx = isTouch ? 16 : HOLD_CANCEL_PX;

      cleanupUi();

      dragKey = th.dataset.colKey;
      dragActive = false;
      var holdReady = false;
      startClientX = event.clientX;
      startClientY = event.clientY;

      var pointerId = event.pointerId;

      // Desktop: capture immediately. Touch: wait until long-press so table can still scroll.
      if (!isTouch) {
        event.preventDefault();
        try {
          th.setPointerCapture(pointerId);
        } catch (e) {
          /* ignore */
        }
      }

      th.classList.add("is-hold-pending");
      var holdTimer = window.setTimeout(function () {
        holdTimer = 0;
        if (!dragKey) return;
        holdReady = true;
        th.classList.remove("is-hold-pending");
        th.classList.add("is-hold-ready");
        try {
          th.setPointerCapture(pointerId);
        } catch (e) {
          /* ignore */
        }
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          try {
            navigator.vibrate(12);
          } catch (e) {
            /* ignore */
          }
        }
      }, holdMs);

      function clearHoldTimer() {
        if (holdTimer) {
          window.clearTimeout(holdTimer);
          holdTimer = 0;
        }
        th.classList.remove("is-hold-pending");
        th.classList.remove("is-hold-ready");
      }

      function detach() {
        th.removeEventListener("pointermove", onMove);
        th.removeEventListener("pointerup", onUp);
        th.removeEventListener("pointercancel", onUp);
        th.removeEventListener("lostpointercapture", onUp);
      }

      function onMove(ev) {
        if (!dragKey) return;

        var dx = ev.clientX - startClientX;
        var dy = ev.clientY - startClientY;

        if (!holdReady) {
          if (dx * dx + dy * dy > cancelPx * cancelPx) {
            clearHoldTimer();
            dragKey = null;
            try {
              th.releasePointerCapture(pointerId);
            } catch (e) {
              /* ignore */
            }
            detach();
          }
          return;
        }

        ev.preventDefault();

        if (!dragActive) {
          if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
          activateDrag(th, ev.clientX, ev.clientY);
        }

        if (activeGhost) {
          activeGhost.style.transform =
            "translate(" + (ev.clientX - grabOffsetX) + "px, " + (ev.clientY - grabOffsetY) + "px)";
        }
        autoScrollNearEdge(scroll, ev.clientX);
        updatePreview(ev.clientX);
      }

      function onUp() {
        clearHoldTimer();
        try {
          th.releasePointerCapture(pointerId);
        } catch (e) {
          /* ignore */
        }
        detach();

        if (dragActive && dragKey) {
          commitReorder();
          var prefs = getPrefs();
          var cur = currentOrder(table);
          var def = defaultOrder(table);
          var changed = cur.some(function (k, i) {
            return k !== def[i];
          });
          prefs.order = changed ? cur : null;
          setPrefs(prefs);
          updateResetState(toolbar, table, prefs);
        }
        cleanupUi();
      }

      th.addEventListener("pointermove", onMove);
      th.addEventListener("pointerup", onUp);
      th.addEventListener("pointercancel", onUp);
      th.addEventListener("lostpointercapture", onUp);
    });
  }

  function initTable(table) {
    var scroll = table.closest(".portal-table-scroll");
    var form = table.closest("form#formList");
    if (!scroll || !form) return;

    removeAllGhosts();
    ensureColumnKeys(table);
    var toolbar = ensureToolbar(form, scroll);
    ensureChrome(table);

    var prefsState = loadPrefs();

    function getPrefs() {
      return prefsState;
    }

    function setPrefs(next) {
      prefsState = {
        widths: next.widths || {},
        order: next.order || null
      };
      savePrefs(prefsState);
    }

    if (scroll.classList.contains("portal-table-scroll--fill")) {
      // Full-bleed tables (Topic Workflows): skip saved column px widths.
      fitOpsColumn(table);
      syncTableWidth(table, {});
    } else {
      if (prefsState.order) applyOrder(table, prefsState.order);
      if (prefsState.widths && Object.keys(prefsState.widths).length) {
        // Older prefs may only store the resized column — fill the rest from paint.
        var measured = measureColumnWidths(table);
        Object.keys(measured).forEach(function (k) {
          if (k === OPS_KEY) return;
          if (!(Number(prefsState.widths[k]) > 0)) prefsState.widths[k] = measured[k];
        });
        delete prefsState.widths[OPS_KEY];
        applyWidths(table, prefsState.widths);
        savePrefs(prefsState);
      } else {
        fitOpsColumn(table);
      }

      bindResize(table, scroll, getPrefs, setPrefs, toolbar);
      bindReorder(table, scroll, getPrefs, setPrefs, toolbar);
      updateResetState(toolbar, table, prefsState);
    }

    var resetBtn = toolbar.querySelector("[data-portal-list-reset]");
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = "1";
      resetBtn.addEventListener("click", function () {
        clearPrefs();
        prefsState = { widths: {}, order: null };
        applyOrder(table, defaultOrder(table));
        applyWidths(table, {});
        ensureChrome(table);
        fitOpsColumn(table);
        updateResetState(toolbar, table, prefsState);
        removeAllGhosts();
      });
    }
  }

  function bindTableScrollChain(scrollEl) {
    if (!scrollEl || scrollEl.dataset.portalScrollChainBound === "1") return;
    scrollEl.dataset.portalScrollChainBound = "1";

    // Nested scroll: consume wheel inside the table until edges, then let the page scroll.
    scrollEl.addEventListener(
      "wheel",
      function (event) {
        if (event.ctrlKey) return;

        var maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
        if (maxScroll <= 1) return;

        var dy = event.deltaY;
        if (event.deltaMode === 1) dy *= 16;
        if (event.deltaMode === 2) dy *= scrollEl.clientHeight;
        if (!dy) return;

        var top = scrollEl.scrollTop;
        var atTop = top <= 0;
        var atBottom = top >= maxScroll - 1;

        if ((dy < 0 && atTop) || (dy > 0 && atBottom)) {
          return;
        }

        event.preventDefault();
        scrollEl.scrollTop = Math.min(maxScroll, Math.max(0, top + dy));
      },
      { passive: false }
    );
  }

  function init() {
    removeAllGhosts();
    document.querySelectorAll("form#formList .portal-table-scroll").forEach(function (scroll) {
      var table = scroll.querySelector("table");
      if (table) initTable(table);
      bindTableScrollChain(scroll);
    });
    bindPageSizeControls();
    bindPageJumpControls();
  }

  function ensureHidden(form, id, name) {
    var input = form.querySelector("#" + id) || form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.id = id;
      input.name = name;
      form.appendChild(input);
    }
    return input;
  }

  function submitPageSize(pageSize) {
    var form = document.querySelector("form#formList");
    if (!form) return;
    var size = parseInt(pageSize, 10);
    if (!size || size < 1) return;

    var pageSizeInput = ensureHidden(form, "PageSize", "PageSize");
    var currentPage = ensureHidden(form, "CurrentPage", "CurrentPage");
    pageSizeInput.value = String(size);
    currentPage.value = "1";
    if (document.getElementById("list-region") && typeof window.refreshListRegion === "function") {
      window.refreshListRegion();
      return;
    }
    form.submit();
  }

  // Always expose — site.js may be browser-cached without setPageSize (no asp-append-version).
  window.setPageSize = submitPageSize;

  function bindPageSizeControls() {
    if (document.documentElement.dataset.portalPageSizeBound === "1") return;
    document.documentElement.dataset.portalPageSizeBound = "1";

    document.addEventListener("change", function (event) {
      var select = event.target && event.target.closest
        ? event.target.closest(".portal-list-pagesize__select")
        : null;
      if (!select || !document.querySelector("form#formList")) return;
      submitPageSize(select.value);
    });
  }

  function bindPageJumpControls() {
    if (document.documentElement.dataset.portalPageJumpBound === "1") return;
    document.documentElement.dataset.portalPageJumpBound = "1";

    document.addEventListener("click", function (event) {
      var gap = event.target && event.target.closest
        ? event.target.closest("[data-portal-page-jump]")
        : null;
      if (!gap) return;

      var item = gap.closest(".portal-pager__item");
      var nav = gap.closest(".portal-list-pager__nav");
      if (!item || !nav) return;

      var total = parseInt(nav.getAttribute("data-total-pages") || "0", 10);
      if (!(total > 1)) return;

      event.preventDefault();
      event.stopPropagation();

      // Close any other open jump fields first.
      document.querySelectorAll(".portal-pager__item.is-jump").forEach(function (open) {
        if (open === item) return;
        restoreGapItem(open);
      });

      item.classList.remove("is-gap");
      item.classList.add("is-jump");
      item.innerHTML =
        '<input class="portal-pager__jump" type="number" min="1" max="' +
        total +
        '" inputmode="numeric" aria-label="Go to page" placeholder="#">';

      var input = item.querySelector(".portal-pager__jump");
      if (!input) return;
      input.focus();
      input.select();

      function commit() {
        var page = parseInt(input.value, 10);
        if (!page || page < 1 || page > total) {
          restoreGapItem(item);
          return;
        }
        if (typeof window.setPage === "function") window.setPage(page);
      }

      function onKey(ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          commit();
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          restoreGapItem(item);
        }
      }

      function onBlur() {
        // Delay so Enter can commit before restore.
        setTimeout(function () {
          if (!item.classList.contains("is-jump")) return;
          if (document.activeElement === input) return;
          if (input.value) commit();
          else restoreGapItem(item);
        }, 120);
      }

      input.addEventListener("keydown", onKey);
      input.addEventListener("blur", onBlur);
    });
  }

  function restoreGapItem(item) {
    if (!item) return;
    item.classList.remove("is-jump");
    item.classList.add("is-gap");
    item.innerHTML =
      '<button type="button" class="portal-pager__gap" data-portal-page-jump aria-label="Go to page">…</button>';
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.portalListInit = init;
})();
