$(function () {
    // Send antiforgery token on all jQuery AJAX mutating requests (forms + JSON-style payloads).
    var antiforgeryToken = $('meta[name="request-verification-token"]').attr('content')
        || $('input[name="__RequestVerificationToken"]').first().val();
    if (antiforgeryToken) {
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                var method = (settings.type || settings.method || 'GET').toUpperCase();
                if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'TRACE') {
                    return;
                }
                xhr.setRequestHeader('RequestVerificationToken', antiforgeryToken);
            }
        });
    }

    init();
    bindPortalListCrudButtons();
    bindPortalQueryPrint();
    bindPortalQueryEndpointDetails();
    bindPortalApiMethodEndpointDetails();
    enhancePortalDateTimeCells();
    enhancePortalNumberCells();
    enhancePortalQueryImageCells();
    var listRegion = document.getElementById('list-region');
    if (listRegion) {
        listRegion.querySelectorAll('td[data-col-type="thumb"] img, a.portal-list-thumb-link img').forEach(applyPortalThumbLoadingPlaceholder);
        initPortalThumbLazyload(listRegion);
    }
    syncPortalQueryPrintState();
});

var portalListRefreshSeq = 0;

function bindPortalListCrudButtons() {
    if (document.documentElement.dataset.portalListCrudBound === '1') {
        return;
    }
    document.documentElement.dataset.portalListCrudBound = '1';

    $(document).on('click', '.opButtonDetail', function () {
        var selectedKey = this.id.replace('DetailItem_', '');
        $('#SelectedKey').val(selectedKey);
        $('#formList').data('SelectedKey', selectedKey);
        openModalPopup($(this).data('module-name'), 'DetailItem', this);
    });

    $(document).on('click', '.opButtonInsert', function (e) {
        // Query Run buttons must not open the Insert modal (they only submit #formList via AJAX).
        if (this.classList && this.classList.contains('portal-query-run')) {
            return;
        }
        if (this.closest && this.closest('form[data-portal-query="true"]')) {
            return;
        }
        // Local Bootstrap modals (e.g. API Keys create) — do not call InsertItem.
        if (this.getAttribute && this.getAttribute('data-portal-local-modal') === 'true') {
            return;
        }
        openModalPopup($(this).data('module-name'), 'InsertItem', this);
    });

    $(document).on('click', '.opButtonDelete', function () {
        var selectedKey = this.id.replace('DeleteItem_', '');
        $('#SelectedKey').val(selectedKey);
        $('#formList').data('SelectedKey', selectedKey);
        openModalPopup($(this).data('module-name'), 'DeleteItem', this);
    });

    $(document).on('click', '.opButtonUpdate', function () {
        var selectedKey = this.id.replace('UpdateItem_', '');
        $('#SelectedKey').val(selectedKey);
        $('#formList').data('SelectedKey', selectedKey);
        openModalPopup($(this).data('module-name'), 'UpdateItem', this);
    });
}

function openModalPopup(moduleName, actionName, triggerBtn) {
    var popupUrl = '/' + moduleName + '/' + actionName;

    $.ajax({
        type: 'POST',
        url: popupUrl,
        processData: false,
        data: $('#formList').serialize(),
        beforeSend: function () {
            showPortalCrudBusy(triggerBtn);
        },
        success: function (data) {
            // Cookie auth may follow a 302 and return the login page as HTML with 200.
            if (isPortalLoginHtml(data)) {
                window.location = '/Login/Index';
                return;
            }

            $('#itemDetailsContainer').html(data);
            $('#itemDetailsContainer .modal-content').addClass('portal-entity-modal');
            enhancePortalEntityForm(document.getElementById('itemDetailsContainer'));
            var modalElement = document.getElementById('itemDetailsModal');
            var detailsRoot = document.getElementById('itemDetailsContainer');

            function initModalEditors() {
                loadJsonAllEditors();
                loadYamlAllEditors(detailsRoot);
                loadUmlAllEditors();
                initDatePickers(detailsRoot);
                initSearchableSelects(detailsRoot);
            }

            function resizeYamlEditors() {
                if (!detailsRoot) {
                    return;
                }
                $(detailsRoot).find('.yamleditor-class').each(function () {
                    if (this.env && this.env.editor) {
                        this.env.editor.resize(true);
                    }
                });
            }

            initModalEditors();

            if (modalElement && typeof bootstrap !== 'undefined') {
                var modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                $(modalElement).one('shown.bs.modal', resizeYamlEditors);
                modal.show();
            } else {
                $('#itemDetailsModal').one('shown.bs.modal', resizeYamlEditors).modal('show');
            }
        },
        error: function (xhr, textStatus, error) {
            handlePortalAjaxError(xhr, {
                reload: true,
                fallbackMessage: error || textStatus || 'Request failed'
            });
        },
        complete: function () {
            hidePortalCrudBusy(triggerBtn);
        }
    });
}

function getListPartialUrl() {
    var form = document.getElementById('formList');
    if (form && form.dataset.listPartialUrl) {
        return form.dataset.listPartialUrl;
    }

    var path = window.location.pathname.replace(/\/?$/, '');
    if (/\/List$/i.test(path)) {
        return path.replace(/\/List$/i, '/ListPartial');
    }

    return path + '/ListPartial';
}

function setPortalListRegionLoading(region, loading) {
    if (!region) {
        return;
    }

    var overlay = region.querySelector(':scope > .portal-list-region__loading');
    if (loading) {
        region.classList.add('is-loading');
        region.setAttribute('aria-busy', 'true');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'portal-list-region__loading';
            overlay.setAttribute('role', 'status');
            overlay.setAttribute('aria-live', 'polite');
            overlay.innerHTML =
                '<div class="portal-list-region__loading-panel">' +
                '<span class="portal-list-region__loading-spinner" aria-hidden="true"></span>' +
                '<span class="portal-list-region__loading-label">Loading…</span>' +
                '</div>';
            region.appendChild(overlay);
        }
        return;
    }

    region.classList.remove('is-loading');
    region.removeAttribute('aria-busy');
    if (overlay) {
        overlay.remove();
    }
}

function hidePortalEntityModal() {
    var modalElement = document.getElementById('itemDetailsModal');
    if (modalElement && typeof bootstrap !== 'undefined') {
        var modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    } else if (typeof $ !== 'undefined') {
        $('#itemDetailsModal').modal('hide');
    }
}

/**
 * After Insert/Update/Delete: close modal, toast, refresh list region (no full reload).
 */
function finishPortalCrudSuccess(successMessage, operation) {
    hidePortalEntityModal();

    if (typeof showPortalToast === 'function' && successMessage) {
        showPortalToast(successMessage, 'success');
    }

    // Delete on last row of a page — PrepareModel clamps CurrentPage on refresh.
    var op = (operation || '').toLowerCase();
    if (op === 'insert') {
        var currentPage = document.getElementById('CurrentPage');
        if (currentPage) {
            currentPage.value = '1';
        }
    }

    if (document.getElementById('list-region') && typeof refreshListRegion === 'function') {
        refreshListRegion();
        return;
    }

    if (typeof queuePortalToast === 'function' && successMessage) {
        queuePortalToast(successMessage, 'success');
    }
    document.location.reload(true);
}

/** Swap #list-region (or #grants-region) HTML via AJAX without full page reload. */
function refreshListRegion(options) {
    options = options || {};
    var form = document.getElementById('formList');
    var region = document.getElementById(options.regionId || 'list-region')
        || document.getElementById('grants-region')
        || document.getElementById('list-region');
    if (!form || !region) {
        if (form && !options.noFallbackSubmit) {
            form.submit();
        }
        return $.Deferred().reject().promise();
    }

    // Caller must close the entity modal first (finishPortalCrudSuccess does).
    if (!options.allowWhileModalOpen && $('#itemDetailsModal').hasClass('show')) {
        return $.Deferred().resolve().promise();
    }

    var url = options.url
        || form.dataset.listPartialUrl
        || form.dataset.pagePartialUrl
        || getListPartialUrl();
    var seq = ++portalListRefreshSeq;
    setPortalListRegionLoading(region, true);

    return $.ajax({
        type: 'POST',
        url: url,
        data: $(form).serialize(),
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).done(function (html) {
        if (seq !== portalListRefreshSeq) {
            return;
        }
        if (typeof html === 'string' && isPortalLoginHtml(html)) {
            window.location = '/Login/Index';
            return;
        }
        region.innerHTML = html;
        if (typeof window.portalListInit === 'function') {
            window.portalListInit();
        }
        if (typeof options.afterSwap === 'function') {
            options.afterSwap(region);
        }
        if (typeof window.onPortalRegionSwapped === 'function') {
            window.onPortalRegionSwapped(region);
        }
        enhancePortalDateTimeCells(region);
        enhancePortalNumberCells(region);
        // Image thumbs: normalize loading.svg placeholders, then wire lazyload.
        enhancePortalQueryImageCells();
        region.querySelectorAll('td[data-col-type="thumb"] img, a.portal-list-thumb-link img').forEach(applyPortalThumbLoadingPlaceholder);
        initPortalThumbLazyload(region);
        enhancePortalApiMethodEndpointChips(region);
        syncPortalQueryPrintState();
    }).fail(function (xhr) {
        // Always surface auth redirect / toast; never fall through to full-page form.submit
        // (that dumps ProblemDetails JSON onto the Error page).
        if (typeof handlePortalAjaxError === 'function') {
            if (handlePortalAjaxError(xhr, { reload: false })) {
                return;
            }
            var friendly = (typeof getPortalAjaxErrorMessage === 'function')
                ? getPortalAjaxErrorMessage(xhr, 'Request failed. Please try again.')
                : 'Request failed. Please try again.';
            region.innerHTML =
                '<div class="alert alert-warning" role="alert">' +
                String(friendly).replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                '</div>';
            syncPortalQueryPrintState();
            return;
        }
        if (options.noFallbackSubmit) {
            var msg = 'Query failed. Please try again.';
            if (xhr && xhr.status === 404) {
                msg = 'No record found for the given parameters.';
            } else if (xhr && xhr.status === 400) {
                msg = 'Invalid query parameters.';
            } else if (xhr && xhr.status >= 500) {
                msg = 'Server error. Please try again.';
            }
            region.innerHTML =
                '<div class="alert alert-warning" role="alert">' +
                String(msg).replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                '</div>';
            syncPortalQueryPrintState();
            return;
        }
        if (!options.noFallbackSubmit) {
            form.submit();
        }
    }).always(function () {
        if (seq === portalListRefreshSeq) {
            setPortalListRegionLoading(region, false);
        }
    });
}

function getPortalQueryForm() {
    return document.querySelector('form#formList[data-portal-query="true"]');
}

function syncPortalQueryPrintState() {
    var form = getPortalQueryForm();
    if (!form) {
        return;
    }
    // Older pages may still have injected CSV/PDF toolbar twins — remove them.
    form.querySelectorAll('.portal-query-download-pdf, .portal-query-download-csv').forEach(function (btn) {
        btn.remove();
    });
    var btn = form.querySelector('.portal-query-print');
    if (!btn) {
        return;
    }
    var hasRows = !!form.querySelector('#list-region table tbody tr');
    btn.disabled = !hasRows;
    btn.setAttribute('aria-disabled', hasRows ? 'false' : 'true');
    btn.title = hasRows
        ? 'Print or download PDF/CSV — choose columns and layout'
        : 'Run the report before printing or exporting';
    var label = btn.querySelector('span');
    if (label && /^(Print|Export)$/i.test((label.textContent || '').trim())) {
        label.textContent = 'Print & export';
    }
    stripPortalQueryHeaderPrintToggles();
    enhancePortalQueryImageCells();
    enhancePortalDateTimeCells();
    enhancePortalNumberCells();
    applyPortalQueryPrintColumnPrefsToTable();
    applyPortalQueryPrintOrientation(loadPortalQueryPrintOrientation());
}

function preparePortalQueryPrintMeta() {
    var form = getPortalQueryForm();
    if (!form) {
        return;
    }
    var meta = form.querySelector('.portal-query-print-meta');
    if (!meta) {
        return;
    }
    var stamp = new Date().toLocaleString();
    var rowCount = form.querySelectorAll('#list-region table tbody tr').length;
    var rowLabel = rowCount === 1 ? '1 row' : (rowCount.toLocaleString() + ' rows');
    var colLabel = '';
    var orientation;
    var checks = document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__check');
    if (checks.length) {
        var checkedCount = document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__check:checked').length;
        colLabel = ' · ' + checkedCount + '/' + checks.length + ' columns';
        orientation = getPortalQueryPrintConfigOrientation();
    } else {
        var table = form.querySelector('#list-region table');
        var colTotal = table ? table.querySelectorAll('thead th').length : 0;
        var colHidden = table ? table.querySelectorAll('thead th[data-print-hide="1"]').length : 0;
        var colShown = Math.max(0, colTotal - colHidden);
        colLabel = colTotal
            ? (' · ' + colShown + '/' + colTotal + ' columns')
            : '';
        orientation = loadPortalQueryPrintOrientation();
    }
    meta.textContent = 'Printed ' + stamp + ' · ' + rowLabel + colLabel + ' · ' + orientation;
    meta.hidden = false;
}

function bindPortalQueryPrint() {
    if (document.documentElement.dataset.portalQueryPrintBound === '1') {
        return;
    }
    document.documentElement.dataset.portalQueryPrintBound = '1';

    $(document).on('click', '.portal-query-print', function (e) {
        e.preventDefault();
        if (this.disabled) {
            return;
        }
        openPortalQueryPrintConfigModal();
    });

    $(document).on('click', '#portalQueryPrintConfigSelectAll', function () {
        setPortalQueryPrintConfigChecks(true);
        refreshPortalQueryPrintPreview();
    });

    $(document).on('click', '#portalQueryPrintConfigSelectNone', function () {
        setPortalQueryPrintConfigChecks(false);
        refreshPortalQueryPrintPreview();
    });

    $(document).on('click', '#portalQueryPrintConfigReset', function () {
        resetPortalQueryPrintConfigOrder();
        resetPortalQueryPrintConfigChecks();
        resetPortalQueryPrintConfigWidths();
        refreshPortalQueryPrintPreview();
    });

    $(document).on('change', '#portalQueryPrintConfigModal input[name="portalQueryPrintOrientation"]', function () {
        refreshPortalQueryPrintPreview();
    });

    $(document).on('change', '#portalQueryPrintConfigList .portal-query-print-config__check', function () {
        refreshPortalQueryPrintPreview();
    });

    $(document).on('change input', '#portalQueryPrintConfigList .portal-query-print-config__width', function () {
        refreshPortalQueryPrintPreview();
    });

    // Width field lives inside the column row; don't toggle the checkbox when editing %.
    $(document).on('click mousedown', '#portalQueryPrintConfigList .portal-query-print-config__width-wrap', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    $(document).on('click', '#portalQueryPrintConfigList .portal-query-print-config__width', function (e) {
        e.stopPropagation();
        this.focus();
    });
    $(document).on('click mousedown', '#portalQueryPrintConfigList .portal-query-print-config__drag', function (e) {
        e.stopPropagation();
    });

    bindPortalQueryPrintColumnDrag();

    window.addEventListener('beforeprint', preparePortalQueryPrintMeta);
    applyPortalQueryPrintOrientation(loadPortalQueryPrintOrientation());
}

function portalQueryPrintStorageKey() {
    return 'qc.portal.query.printCols:' + (window.location.pathname.replace(/\/$/, '') || '/');
}

function portalQueryPrintWidthStorageKey() {
    return 'qc.portal.query.printColWidths:' + (window.location.pathname.replace(/\/$/, '') || '/');
}

function portalQueryPrintOrderStorageKey() {
    return 'qc.portal.query.printColOrder:' + (window.location.pathname.replace(/\/$/, '') || '/');
}

function portalQueryPrintOrientationStorageKey() {
    return 'qc.portal.query.printOrientation:' + (window.location.pathname.replace(/\/$/, '') || '/');
}

function normalizePortalQueryPrintOrientation(value) {
    return value === 'portrait' ? 'portrait' : 'landscape';
}

function loadPortalQueryPrintOrientation() {
    try {
        return normalizePortalQueryPrintOrientation(
            window.localStorage.getItem(portalQueryPrintOrientationStorageKey())
        );
    } catch (e) {
        return 'landscape';
    }
}

function savePortalQueryPrintOrientation(orientation) {
    try {
        window.localStorage.setItem(
            portalQueryPrintOrientationStorageKey(),
            normalizePortalQueryPrintOrientation(orientation)
        );
    } catch (e) {
        /* ignore */
    }
}

function applyPortalQueryPrintOrientation(orientation) {
    var orient = normalizePortalQueryPrintOrientation(orientation);
    document.documentElement.setAttribute('data-portal-print-orientation', orient);
}

function loadPortalQueryPrintScript(src) {
    return new Promise(function (resolve, reject) {
        var existing = document.querySelector('script[data-portal-print-lib="' + src + '"]');
        if (existing) {
            resolve();
            return;
        }
        var script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.portalPrintLib = src;
        script.onload = function () { resolve(); };
        script.onerror = function () { reject(new Error('Failed to load ' + src)); };
        document.head.appendChild(script);
    });
}

function portalQueryJsPdfReady() {
    var JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF) {
        return null;
    }
    // Autotable must be on the prototype before we print.
    if (typeof JsPDF.API.autoTable !== 'function' && typeof JsPDF.prototype.autoTable !== 'function') {
        return null;
    }
    return JsPDF;
}

function ensurePortalQueryPdfLibs() {
    var ready = portalQueryJsPdfReady();
    if (ready) {
        return Promise.resolve(ready);
    }
    return loadPortalQueryPrintScript('/lib/jspdf/jspdf.umd.min.js')
        .then(function () {
            return loadPortalQueryPrintScript('/lib/jspdf/jspdf.plugin.autotable.min.js');
        })
        .then(function () {
            var JsPDF = portalQueryJsPdfReady();
            if (!JsPDF) {
                throw new Error('jsPDF / autoTable unavailable');
            }
            return JsPDF;
        });
}

var portalQueryPdfPreviewState = {
    blobUrl: null,
    blob: null,
    title: 'Report',
    orientation: 'landscape',
    meta: '',
    matrix: null,
    zoomMode: 'fitWidth',
    zoomFactor: 1,
    pageCount: 1,
    renderToken: 0
};

function revokePortalQueryPdfPreviewUrl() {
    if (portalQueryPdfPreviewState.blobUrl) {
        try {
            URL.revokeObjectURL(portalQueryPdfPreviewState.blobUrl);
        } catch (e) {
            /* ignore */
        }
    }
    portalQueryPdfPreviewState.blobUrl = null;
    portalQueryPdfPreviewState.blob = null;
}

function sanitizePortalQueryPdfFilename(title) {
    return (title || 'report').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'report';
}

function getSelectedPortalQueryPrintColumnIndexes() {
    // DOM order in the Columns list = PDF column order (do not sort by table index).
    var indexes = [];
    var items = document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__item');
    if (items.length) {
        items.forEach(function (item) {
            var input = item.querySelector('.portal-query-print-config__check');
            if (!input || !input.checked) {
                return;
            }
            var idx = parseInt(input.getAttribute('data-col-index'), 10);
            if (!isNaN(idx)) {
                indexes.push(idx);
            }
        });
        return indexes;
    }

    // Toolbar export (modal closed): saved visibility + order.
    getPortalQueryPrintColumns().forEach(function (col) {
        if (col.visible) {
            indexes.push(col.index);
        }
    });
    return indexes;
}

/**
 * jsPDF autoTable columnStyles from print-config width % inputs.
 * Empty width = auto. Percents are of printable table width; scaled down if sum &gt; 100.
 */
function buildPortalQueryPdfColumnStyles(selectedIndexes, tableWidthMm) {
    var styles = {};
    var indexes = selectedIndexes || [];
    if (!indexes.length || !(tableWidthMm > 0)) {
        return styles;
    }

    var liveWidths = collectPortalQueryPrintConfigWidthPrefs();
    var storedWidths = loadPortalQueryPrintColumnWidthPrefs();
    var cols = getPortalQueryPrintColumns();
    var byIndex = {};
    cols.forEach(function (col) {
        byIndex[col.index] = col;
    });

    var percents = indexes.map(function (tableIndex) {
        var col = byIndex[tableIndex];
        var key = col && col.key;
        var fromLive = key && Object.prototype.hasOwnProperty.call(liveWidths, key)
            ? liveWidths[key]
            : null;
        var fromStored = key && Object.prototype.hasOwnProperty.call(storedWidths, key)
            ? storedWidths[key]
            : null;
        var fromCol = col && col.width != null ? col.width : null;
        return normalizePortalQueryPrintColumnWidth(fromLive != null ? fromLive : (fromStored != null ? fromStored : fromCol));
    });

    var fixedSum = 0;
    var fixedCount = 0;
    percents.forEach(function (p) {
        if (p != null) {
            fixedSum += p;
            fixedCount++;
        }
    });
    var scale = fixedSum > 100 ? (100 / fixedSum) : 1;

    percents.forEach(function (p, pdfColIndex) {
        if (p == null) {
            return;
        }
        var mm = Math.max(12, tableWidthMm * ((p * scale) / 100));
        styles[pdfColIndex] = { cellWidth: mm };
    });

    return styles;
}

function resolvePortalQueryPrintImageSrc(img) {
    if (!img) {
        return null;
    }
    var dataSrc = (img.getAttribute('data-src') || '').trim();
    var src = (img.currentSrc || img.getAttribute('src') || '').trim();
    var isPlaceholder = function (url) {
        return !url || /loading\.svg(?:$|\?)/i.test(url);
    };
    if (dataSrc && !isPlaceholder(dataSrc)) {
        return dataSrc;
    }
    if (src && !isPlaceholder(src)) {
        return src;
    }
    return dataSrc || src || null;
}

function portalQueryPrintCellFromDom(cell) {
    var img = cell && cell.querySelector ? cell.querySelector('img') : null;
    if (img) {
        var src = resolvePortalQueryPrintImageSrc(img);
        var alt = (img.getAttribute('alt') || '').trim();
        return {
            text: alt || '',
            imageSrc: src || null
        };
    }
    return {
        text: ((cell && cell.textContent) || '').replace(/\s+/g, ' ').trim(),
        imageSrc: null
    };
}

function portalQueryPrintCellText(cell) {
    if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
        return cell.text || '';
    }
    return cell == null ? '' : String(cell);
}

function portalQueryPrintCellHtml(cell) {
    if (cell && typeof cell === 'object' && cell.imageSrc) {
        return '<img class="sheet__thumb portal-query-pdf-preview__thumb" src="' +
            escapePortalHtml(cell.imageSrc) +
            '" alt="' +
            escapePortalHtml(cell.text || '') +
            '" />';
    }
    return escapePortalHtml(portalQueryPrintCellText(cell));
}

function detectPortalQueryPdfImageFormat(dataUrl) {
    if (/^data:image\/png/i.test(dataUrl)) {
        return 'PNG';
    }
    if (/^data:image\/jpeg/i.test(dataUrl) || /^data:image\/jpg/i.test(dataUrl)) {
        return 'JPEG';
    }
    if (/^data:image\/webp/i.test(dataUrl)) {
        return 'WEBP';
    }
    return 'JPEG';
}

/**
 * Load a report thumbnail into a compressed data-URL for jsPDF.addImage.
 */
function loadPortalQueryPdfImageData(src) {
    return new Promise(function (resolve) {
        if (!src) {
            resolve(null);
            return;
        }
        if (/^data:image\//i.test(src)) {
            resolve({
                dataUrl: src,
                format: detectPortalQueryPdfImageFormat(src),
                width: 0,
                height: 0
            });
            return;
        }

        var img = new Image();
        img.decoding = 'async';
        // Same-origin portal thumbs; anonymous helps when CDN allows CORS.
        try {
            img.crossOrigin = 'anonymous';
        } catch (e) {
            /* ignore */
        }

        var finishFromElement = function (el) {
            try {
                var naturalW = el.naturalWidth || el.width || 0;
                var naturalH = el.naturalHeight || el.height || 0;
                if (!naturalW || !naturalH) {
                    resolve(null);
                    return;
                }
                var maxPx = 220;
                var scale = Math.min(1, maxPx / Math.max(naturalW, naturalH));
                var w = Math.max(1, Math.round(naturalW * scale));
                var h = Math.max(1, Math.round(naturalH * scale));
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(el, 0, 0, w, h);
                var dataUrl = canvas.toDataURL('image/jpeg', 0.84);
                resolve({
                    dataUrl: dataUrl,
                    format: 'JPEG',
                    width: w,
                    height: h
                });
            } catch (err) {
                console.warn('PDF thumb encode failed', src, err);
                resolve(null);
            }
        };

        img.onload = function () {
            finishFromElement(img);
        };
        img.onerror = function () {
            // Retry without CORS flag for same-origin assets that reject anonymous.
            if (img.crossOrigin) {
                var retry = new Image();
                retry.onload = function () { finishFromElement(retry); };
                retry.onerror = function () { resolve(null); };
                retry.src = src;
                return;
            }
            resolve(null);
        };
        img.src = src;
    });
}

/**
 * Attach imageData to matrix cells that have imageSrc (used by PDF builder).
 */
function resolvePortalQueryPdfImages(matrix) {
    var jobs = [];
    var cache = {};

    (matrix || []).forEach(function (row) {
        (row || []).forEach(function (cell) {
            if (!cell || !cell.imageSrc || cell.imageData) {
                return;
            }
            var src = cell.imageSrc;
            if (!cache[src]) {
                cache[src] = loadPortalQueryPdfImageData(src);
            }
            jobs.push(
                cache[src].then(function (data) {
                    cell.imageData = data;
                })
            );
        });
    });

    return Promise.all(jobs).then(function () {
        return matrix;
    });
}

function portalQueryPdfBodyCell(cell) {
    if (cell && cell.imageData && cell.imageData.dataUrl) {
        return {
            content: '',
            styles: {
                minCellHeight: 18,
                cellPadding: 1.5,
                halign: 'center',
                valign: 'middle'
            }
        };
    }
    if (cell && cell.imageSrc) {
        return cell.text || '';
    }
    return portalQueryPrintCellText(cell);
}

function collectPortalQueryPrintMatrixForSelection(indexes) {
    var table = getPortalQueryPrintTable();
    if (!table || !indexes || !indexes.length) {
        return [];
    }
    var rows = [];
    table.querySelectorAll('tr').forEach(function (tr) {
        var cells = [];
        indexes.forEach(function (cellIndex) {
            var cell = tr.children[cellIndex];
            if (!cell) {
                return;
            }
            cells.push(portalQueryPrintCellFromDom(cell));
        });
        if (cells.length) {
            rows.push(cells);
        }
    });
    return rows;
}

function collectPortalQueryPrintTableMatrix(table) {
    var rows = [];
    if (!table) {
        return rows;
    }
    table.querySelectorAll('tr').forEach(function (tr) {
        var cells = [];
        var visible = false;
        Array.prototype.forEach.call(tr.children, function (cell) {
            if (cell.getAttribute('data-print-hide') === '1') {
                return;
            }
            visible = true;
            cells.push(portalQueryPrintCellFromDom(cell));
        });
        if (visible && cells.length) {
            rows.push(cells);
        }
    });
    return rows;
}

function collectPortalQueryPdfPayload(orientation) {
    var orient = normalizePortalQueryPrintOrientation(orientation);
    var form = getPortalQueryForm();
    var table = getPortalQueryPrintTable();
    if (!table) {
        return null;
    }

    var title = getPortalQueryReportTitle();

    // Keep stamp on the hidden page meta for legacy window.print fallback only —
    // do not feed it into modal/print HTML (it looked like "Printed …" under the title).
    preparePortalQueryPrintMeta();

    var selected = getSelectedPortalQueryPrintColumnIndexes();
    var matrix = selected.length
        ? collectPortalQueryPrintMatrixForSelection(selected)
        : collectPortalQueryPrintTableMatrix(table);
    if (!matrix.length) {
        return null;
    }

    return {
        title: title,
        meta: '',
        matrix: matrix,
        orientation: orient
    };
}


/**
 * Build oriented temp PDF — single source for preview, print, and download.
 */
function buildPortalQueryPdf(orientation, options) {
    var payload = collectPortalQueryPdfPayload(orientation);
    if (!payload) {
        return Promise.resolve(null);
    }

    var orient = payload.orientation;
    var title = payload.title;
    var autoPrint = !!(options && options.autoPrint);
    var sourceMatrix = payload.matrix || [];

    return ensurePortalQueryPdfLibs()
        .then(function (JsPDF) {
            return resolvePortalQueryPdfImages(sourceMatrix).then(function () {
                return JsPDF;
            });
        })
        .then(function (JsPDF) {
            var headCells = (sourceMatrix[0] || []).map(portalQueryPrintCellText);
            var bodyRows = sourceMatrix.slice(1);
            var body = bodyRows.map(function (row) {
                return (row || []).map(portalQueryPdfBodyCell);
            });

            var doc = new JsPDF({
                orientation: orient === 'portrait' ? 'portrait' : 'landscape',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            var pageWidth = doc.internal.pageSize.getWidth();
            var marginX = 12;
            var y = 16;
            var tableWidthMm = pageWidth - (marginX * 2);
            var columnStyles = buildPortalQueryPdfColumnStyles(
                getSelectedPortalQueryPrintColumnIndexes(),
                tableWidthMm
            );

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            var titleLines = doc.splitTextToSize(title, pageWidth - (marginX * 2));
            doc.text(titleLines, marginX, y);
            y += (titleLines.length * 6) + 3;

            doc.autoTable({
                head: body.length ? [headCells] : undefined,
                body: body.length ? body : [headCells],
                startY: y,
                margin: { left: marginX, right: marginX, top: 12, bottom: 12 },
                styles: {
                    font: 'helvetica',
                    fontSize: 8.5,
                    cellPadding: 2,
                    overflow: 'linebreak',
                    valign: 'middle',
                    minCellWidth: 18
                },
                headStyles: {
                    fillColor: [47, 61, 120],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    cellPadding: 2.2
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: columnStyles,
                tableWidth: tableWidthMm,
                didDrawCell: function (data) {
                    if (data.section !== 'body') {
                        return;
                    }
                    var row = bodyRows[data.row.index];
                    var cell = row && row[data.column.index];
                    var imageData = cell && cell.imageData;
                    if (!imageData || !imageData.dataUrl) {
                        return;
                    }

                    var pad = 1.6;
                    var maxW = Math.max(4, data.cell.width - pad * 2);
                    var maxH = Math.max(4, data.cell.height - pad * 2);
                    var aspect = (imageData.width && imageData.height)
                        ? (imageData.width / imageData.height)
                        : 1;
                    var thumbH = Math.min(14, maxH);
                    var thumbW = thumbH * aspect;
                    if (thumbW > maxW) {
                        thumbW = maxW;
                        thumbH = thumbW / aspect;
                    }
                    var x = data.cell.x + (data.cell.width - thumbW) / 2;
                    var yImg = data.cell.y + (data.cell.height - thumbH) / 2;
                    try {
                        doc.addImage(
                            imageData.dataUrl,
                            imageData.format || 'JPEG',
                            x,
                            yImg,
                            thumbW,
                            thumbH
                        );
                    } catch (err) {
                        console.warn('PDF addImage failed', err);
                    }
                }
            });

            if (autoPrint && typeof doc.autoPrint === 'function') {
                doc.autoPrint();
            }

            var blob = doc.output('blob');
            var blobUrl = URL.createObjectURL(blob);
            return {
                blob: blob,
                blobUrl: blobUrl,
                title: title,
                meta: '',
                matrix: sourceMatrix,
                orientation: orient,
                pageCount: doc.getNumberOfPages ? doc.getNumberOfPages() : 1
            };
        });
}

function ensurePortalQueryPdfJs() {
    if (window.pdfjsLib) {
        if (window.pdfjsLib.GlobalWorkerOptions) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/pdf.worker.min.js';
        }
        return Promise.resolve(window.pdfjsLib);
    }
    return loadPortalQueryPrintScript('/lib/pdfjs/pdf.min.js').then(function () {
        if (!window.pdfjsLib) {
            throw new Error('pdf.js unavailable');
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/pdf.worker.min.js';
        return window.pdfjsLib;
    });
}

function setPortalQueryPrintPreviewLoading(isLoading, title, subtitle) {
    var loading = document.getElementById('portalQueryPrintPreviewLoading');
    var host = document.getElementById('portalQueryPrintPreviewHost');
    if (!loading) {
        return;
    }
    loading.hidden = !isLoading;
    var titleEl = loading.querySelector('[data-loading-title]');
    var subEl = loading.querySelector('[data-loading-sub]');
    if (titleEl && title) {
        titleEl.textContent = title;
    }
    if (subEl) {
        subEl.textContent = subtitle || '';
        subEl.hidden = !subtitle;
    }
    if (host) {
        host.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }
}

function updatePortalQueryPrintPreviewMeta() {
    var metaEl = document.getElementById('portalQueryPrintPreviewMeta');
    if (!metaEl) {
        return;
    }
    var orient = portalQueryPdfPreviewState.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape';
    var pages = Math.max(1, portalQueryPdfPreviewState.pageCount || 1);
    var pageLabel = pages === 1 ? '1 page' : (pages + ' pages');
    var mode = portalQueryPdfPreviewState.zoomMode || 'fitWidth';
    var modeLabel = mode === 'fitPage' ? 'Fit page'
        : mode === 'fit' ? 'Fit all'
        : mode === 'actual' ? '100%'
        : 'Fit width';
    var pct = Math.round((portalQueryPdfPreviewState.zoomFactor || 1) * 100);
    metaEl.textContent = 'PDF · ' + orient + ' · ' + pageLabel + ' · ' + modeLabel + ' · ' + pct + '%';
}

function setPortalQueryPrintPreviewZoomMode(mode) {
    portalQueryPdfPreviewState.zoomMode = mode || 'fitWidth';
    if (mode === 'actual') {
        portalQueryPdfPreviewState.zoomFactor = 1;
    }
    layoutPortalQueryPrintPreview();
}

function nudgePortalQueryPrintPreviewZoom(delta) {
    portalQueryPdfPreviewState.zoomMode = 'actual';
    var next = (portalQueryPdfPreviewState.zoomFactor || 1) + delta;
    portalQueryPdfPreviewState.zoomFactor = Math.max(0.25, Math.min(2.5, Math.round(next * 100) / 100));
    layoutPortalQueryPrintPreview();
}

function layoutPortalQueryPrintPreview() {
    var stage = document.getElementById('portalQueryPrintPreviewStage');
    var host = document.getElementById('portalQueryPrintPreviewHost');
    if (!stage || !host) {
        return;
    }
    var sheets = host.querySelectorAll('.portal-query-print-config__pdf-sheet');
    if (!sheets.length) {
        updatePortalQueryPrintPreviewMeta();
        return;
    }
    if (stage.clientWidth < 48) {
        window.setTimeout(layoutPortalQueryPrintPreview, 60);
        return;
    }

    var firstCanvas = sheets[0].querySelector('canvas');
    if (!firstCanvas) {
        return;
    }
    var naturalW = firstCanvas.width || 1;
    var naturalH = firstCanvas.height || 1;
    var pad = 28;
    var availW = Math.max(80, stage.clientWidth - pad);
    var availH = Math.max(80, stage.clientHeight - pad);

    var mode = portalQueryPdfPreviewState.zoomMode || 'fitWidth';
    var scale;
    if (mode === 'fitPage') {
        scale = Math.min(availW / naturalW, availH / naturalH);
    } else if (mode === 'fit') {
        var totalH = 0;
        sheets.forEach(function (sheet) {
            var c = sheet.querySelector('canvas');
            totalH += (c ? c.height : naturalH) + 28;
        });
        scale = Math.min(availW / naturalW, availH / Math.max(1, totalH));
    } else if (mode === 'actual') {
        scale = portalQueryPdfPreviewState.zoomFactor || 1;
    } else {
        portalQueryPdfPreviewState.zoomMode = 'fitWidth';
        scale = availW / naturalW;
    }

    scale = Math.max(0.15, Math.min(2.5, scale));
    portalQueryPdfPreviewState.zoomFactor = scale;

    sheets.forEach(function (sheet) {
        var canvas = sheet.querySelector('canvas');
        if (!canvas) {
            return;
        }
        var w = Math.ceil(canvas.width * scale);
        var h = Math.ceil(canvas.height * scale);
        sheet.style.width = w + 'px';
        sheet.style.height = h + 'px';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    });

    document.querySelectorAll('[data-print-zoom]').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-print-zoom') === portalQueryPdfPreviewState.zoomMode);
    });
    updatePortalQueryPrintPreviewMeta();
}

function preloadPortalQueryPdfPrintFrame(blobUrl) {
    // Preload the real PDF blob so popup-blocked browsers can still print from iframe.
    var frame = document.getElementById('portalQueryPdfPrintFrame');
    if (!frame || !blobUrl) {
        return;
    }
    if (frame.dataset.blobUrl === blobUrl && frame.dataset.ready === '1') {
        return;
    }
    frame.dataset.blobUrl = blobUrl;
    frame.dataset.ready = '0';
    frame.onload = function () {
        frame.dataset.ready = '1';
    };
    frame.src = blobUrl;
}

function renderPortalQueryPdfToPreview(result, token) {
    var host = document.getElementById('portalQueryPrintPreviewHost');
    if (!host || !result || !result.blob) {
        return Promise.resolve(false);
    }

    setPortalQueryPrintPreviewLoading(true, 'Preparing PDF…', 'Building a print-ready preview');

    return ensurePortalQueryPdfJs()
        .then(function (pdfjsLib) {
            if (token !== portalQueryPdfPreviewState.renderToken) {
                return null;
            }
            setPortalQueryPrintPreviewLoading(true, 'Rendering pages…', 'Almost ready');
            return result.blob.arrayBuffer().then(function (buffer) {
                return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            });
        })
        .then(function (pdf) {
            if (!pdf || token !== portalQueryPdfPreviewState.renderToken) {
                return false;
            }
            portalQueryPdfPreviewState.pageCount = pdf.numPages || 1;
            host.innerHTML = '';

            var renderPage = function (pageNum) {
                return pdf.getPage(pageNum).then(function (page) {
                    if (token !== portalQueryPdfPreviewState.renderToken) {
                        return;
                    }
                    var viewport = page.getViewport({ scale: 1.65 });
                    var canvas = document.createElement('canvas');
                    canvas.className = 'portal-query-print-config__pdf-canvas';
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.setAttribute('data-page', String(pageNum));

                    var sheet = document.createElement('div');
                    sheet.className = 'portal-query-print-config__pdf-sheet';
                    sheet.appendChild(canvas);
                    host.appendChild(sheet);

                    if (pageNum < pdf.numPages) {
                        var gap = document.createElement('div');
                        gap.className = 'portal-query-print-config__pdf-gap';
                        gap.setAttribute('aria-hidden', 'true');
                        gap.innerHTML =
                            '<span class="portal-query-print-config__pdf-gap-rule"></span>' +
                            '<span class="portal-query-print-config__pdf-gap-badge">' +
                            '<span class="portal-query-print-config__pdf-gap-index">' + (pageNum + 1) + '</span>' +
                            '<span class="portal-query-print-config__pdf-gap-sep">/</span>' +
                            '<span class="portal-query-print-config__pdf-gap-total">' + pdf.numPages + '</span>' +
                            '</span>' +
                            '<span class="portal-query-print-config__pdf-gap-rule"></span>';
                        host.appendChild(gap);
                    }

                    return page.render({
                        canvasContext: canvas.getContext('2d', { alpha: false }),
                        viewport: viewport
                    }).promise;
                });
            };

            var chain = Promise.resolve();
            for (var i = 1; i <= pdf.numPages; i++) {
                (function (n) {
                    chain = chain.then(function () { return renderPage(n); });
                })(i);
            }
            return chain.then(function () {
                if (token !== portalQueryPdfPreviewState.renderToken) {
                    return false;
                }
                setPortalQueryPrintPreviewLoading(false);
                layoutPortalQueryPrintPreview();
                preloadPortalQueryPdfPrintFrame(result.blobUrl);
                updatePortalQueryPrintPreviewMeta();
                return true;
            });
        })
        .catch(function (err) {
            if (token !== portalQueryPdfPreviewState.renderToken) {
                return false;
            }
            console.warn('PDF preview render failed', err);
            setPortalQueryPrintPreviewLoading(true, 'Preview unavailable', 'You can still download the PDF');
            return false;
        });
}

var portalQueryPrintInFlight = false;

function releasePortalQueryPrintLock() {
    portalQueryPrintInFlight = false;
    var printBtn = document.getElementById('portalQueryPrintConfigPrint');
    if (printBtn) {
        printBtn.disabled = false;
    }
}

/**
 * Print the exact same PDF bytes as Download, without leaving the page.
 * Uses a hidden iframe (preloaded with the PDF blob) — no blob tab / navigation.
 */
function printPortalQueryPdfFromPreview() {
    if (portalQueryPrintInFlight) {
        return;
    }

    var blobUrl = portalQueryPdfPreviewState.blobUrl;
    if (!blobUrl) {
        window.alert('PDF is still preparing. Please wait a moment.');
        return;
    }

    var frame = document.getElementById('portalQueryPdfPrintFrame');
    if (!frame) {
        window.alert('Print host is missing. Please reopen Print report.');
        return;
    }

    var printBtn = document.getElementById('portalQueryPrintConfigPrint');
    portalQueryPrintInFlight = true;
    if (printBtn) {
        printBtn.disabled = true;
    }

    var unlocked = false;
    var didPrint = false;
    var unlock = function () {
        if (unlocked) {
            return;
        }
        unlocked = true;
        try {
            if (frame.contentWindow) {
                frame.contentWindow.removeEventListener('afterprint', unlock);
            }
        } catch (e) {
            /* ignore */
        }
        window.removeEventListener('afterprint', unlock);
        releasePortalQueryPrintLock();
    };

    var tryFramePrint = function () {
        if (didPrint) {
            return true;
        }
        try {
            var win = frame.contentWindow;
            if (!win) {
                return false;
            }
            win.focus();
            win.print();
            didPrint = true;
            try {
                win.addEventListener('afterprint', unlock);
            } catch (e) {
                /* ignore */
            }
            window.addEventListener('afterprint', unlock);
            window.setTimeout(unlock, 8000);
            return true;
        } catch (e) {
            console.warn('Hidden PDF iframe print failed', e);
            return false;
        }
    };

    var fail = function () {
        unlock();
        window.alert(
            'Could not open the print dialog in this browser. Use Download PDF, then print from your PDF viewer.'
        );
    };

    // Prefer already-preloaded PDF so print() stays inside the user click gesture.
    if (frame.dataset.blobUrl === blobUrl && frame.dataset.ready === '1') {
        if (tryFramePrint()) {
            return;
        }
        fail();
        return;
    }

    frame.dataset.blobUrl = blobUrl;
    frame.dataset.ready = '0';
    frame.onload = function () {
        frame.dataset.ready = '1';
        window.setTimeout(function () {
            if (!tryFramePrint()) {
                fail();
            }
        }, 350);
    };
    frame.src = blobUrl;

    // If onload never fires (some PDF plugins), attempt once then give up — still no new tab.
    window.setTimeout(function () {
        if (didPrint || unlocked) {
            return;
        }
        if (frame.dataset.blobUrl === blobUrl) {
            frame.dataset.ready = '1';
            if (!tryFramePrint()) {
                fail();
            }
        }
    }, 2000);
}


function downloadPortalQueryPdfFromPreview() {
    var run = function (blobUrl) {
        if (!blobUrl) {
            return;
        }
        var a = document.createElement('a');
        a.href = blobUrl;
        a.download = sanitizePortalQueryPdfFilename(portalQueryPdfPreviewState.title) + '.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    if (portalQueryPdfPreviewState.blobUrl) {
        run(portalQueryPdfPreviewState.blobUrl);
        return;
    }

    buildPortalQueryPdf(portalQueryPdfPreviewState.orientation || 'landscape')
        .then(function (result) {
            if (!result) {
                return;
            }
            revokePortalQueryPdfPreviewUrl();
            portalQueryPdfPreviewState.blob = result.blob;
            portalQueryPdfPreviewState.blobUrl = result.blobUrl;
            run(result.blobUrl);
        });
}

function portalQueryCsvCellValue(cell) {
    if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
        if (cell.imageSrc) {
            return cell.imageSrc;
        }
        return cell.text || '';
    }
    return cell == null ? '' : String(cell);
}

function escapePortalQueryCsvValue(value) {
    var text = String(value == null ? '' : value);
    if (/[",\r\n]/.test(text)) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
}

function buildPortalQueryCsvContent(matrix) {
    return (matrix || []).map(function (row) {
        return (row || []).map(function (cell) {
            return escapePortalQueryCsvValue(portalQueryCsvCellValue(cell));
        }).join(',');
    }).join('\r\n');
}

/**
 * Download CSV using the same selected columns + order as the PDF preview.
 */
function downloadPortalQueryCsvFromPreview() {
    var selected = getSelectedPortalQueryPrintColumnIndexes();
    var table = getPortalQueryPrintTable();
    var matrix = selected.length
        ? collectPortalQueryPrintMatrixForSelection(selected)
        : collectPortalQueryPrintTableMatrix(table);

    if (!matrix.length) {
        window.alert('Nothing to export. Select at least one column.');
        return;
    }

    var title = portalQueryPdfPreviewState.title || getPortalQueryReportTitle();
    var csv = buildPortalQueryCsvContent(matrix);
    // UTF-8 BOM helps Excel open non-ASCII correctly.
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blobUrl;
    a.download = sanitizePortalQueryPdfFilename(title) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () {
        try {
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            /* ignore */
        }
    }, 2000);
}

/**
 * Thin wrapper — opens modal preview instead of a new tab.
 */
function printPortalQueryAsPdf(orientation, preOpenedWindow) {
    if (preOpenedWindow) {
        try { preOpenedWindow.close(); } catch (e) { /* ignore */ }
    }
    openPortalQueryPrintConfigModal();
    return Promise.resolve(true);
}


function loadPortalQueryPrintColumnPrefs() {
    try {
        var raw = window.localStorage.getItem(portalQueryPrintStorageKey());
        if (!raw) {
            return {};
        }
        var parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function savePortalQueryPrintColumnPrefs(prefs) {
    try {
        window.localStorage.setItem(portalQueryPrintStorageKey(), JSON.stringify(prefs || {}));
    } catch (e) {
        /* ignore */
    }
}

function normalizePortalQueryPrintColumnWidth(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    var n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    if (!isFinite(n) || n <= 0) {
        return null;
    }
    // Percent of printable table width (jsPDF). Clamp to a usable range.
    return Math.max(5, Math.min(80, Math.round(n)));
}

function loadPortalQueryPrintColumnWidthPrefs() {
    try {
        var raw = window.localStorage.getItem(portalQueryPrintWidthStorageKey());
        if (!raw) {
            return {};
        }
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return {};
        }
        var out = {};
        Object.keys(parsed).forEach(function (key) {
            var w = normalizePortalQueryPrintColumnWidth(parsed[key]);
            if (w != null) {
                out[key] = w;
            }
        });
        return out;
    } catch (e) {
        return {};
    }
}

function savePortalQueryPrintColumnWidthPrefs(prefs) {
    try {
        var clean = {};
        Object.keys(prefs || {}).forEach(function (key) {
            var w = normalizePortalQueryPrintColumnWidth(prefs[key]);
            if (w != null) {
                clean[key] = w;
            }
        });
        if (!Object.keys(clean).length) {
            window.localStorage.removeItem(portalQueryPrintWidthStorageKey());
            return;
        }
        window.localStorage.setItem(portalQueryPrintWidthStorageKey(), JSON.stringify(clean));
    } catch (e) {
        /* ignore */
    }
}

function collectPortalQueryPrintConfigWidthPrefs() {
    var prefs = {};
    document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__width').forEach(function (input) {
        var key = input.getAttribute('data-col-key');
        if (!key) {
            return;
        }
        var w = normalizePortalQueryPrintColumnWidth(input.value);
        if (w != null) {
            prefs[key] = w;
        }
    });
    return prefs;
}

function loadPortalQueryPrintColumnOrder() {
    try {
        var raw = window.localStorage.getItem(portalQueryPrintOrderStorageKey());
        if (!raw) {
            return [];
        }
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.map(function (key) { return String(key); }).filter(Boolean);
    } catch (e) {
        return [];
    }
}

function savePortalQueryPrintColumnOrder(orderKeys) {
    try {
        var clean = (orderKeys || []).map(function (key) { return String(key); }).filter(Boolean);
        if (!clean.length) {
            window.localStorage.removeItem(portalQueryPrintOrderStorageKey());
            return;
        }
        window.localStorage.setItem(portalQueryPrintOrderStorageKey(), JSON.stringify(clean));
    } catch (e) {
        /* ignore */
    }
}

function collectPortalQueryPrintConfigOrder() {
    var keys = [];
    document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__item .portal-query-print-config__check').forEach(function (input) {
        var key = input.getAttribute('data-col-key');
        if (key) {
            keys.push(key);
        }
    });
    return keys;
}

function orderPortalQueryPrintColumns(cols) {
    var list = cols || [];
    var order = loadPortalQueryPrintColumnOrder();
    if (!order.length || !list.length) {
        return list.slice();
    }
    var byKey = {};
    list.forEach(function (col) {
        byKey[col.key] = col;
    });
    var ordered = [];
    var seen = {};
    order.forEach(function (key) {
        if (byKey[key] && !seen[key]) {
            ordered.push(byKey[key]);
            seen[key] = true;
        }
    });
    list.forEach(function (col) {
        if (!seen[col.key]) {
            ordered.push(col);
        }
    });
    return ordered;
}

function getPortalQueryPrintTable() {
    var form = getPortalQueryForm();
    return form ? form.querySelector('#list-region table') : null;
}

function getPortalQueryPrintColumns() {
    var table = getPortalQueryPrintTable();
    if (!table || !table.tHead) {
        return [];
    }
    var prefs = loadPortalQueryPrintColumnPrefs();
    var widthPrefs = loadPortalQueryPrintColumnWidthPrefs();
    var cols = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th, index) {
        if (!th.getAttribute('data-col-key') && !th.getAttribute('data-print-key')) {
            th.setAttribute('data-print-key', 'col_' + index);
        }
        var key = th.getAttribute('data-col-key') || th.getAttribute('data-print-key');
        var labelEl = th.querySelector('.portal-col-head__label');
        var label = ((labelEl ? labelEl.textContent : th.textContent) || '').replace(/\s+/g, ' ').trim() || ('Column ' + (index + 1));
        var visible = Object.prototype.hasOwnProperty.call(prefs, key)
            ? !!prefs[key]
            : defaultPortalQueryColumnPrintVisible(th);
        return {
            index: index,
            key: key,
            label: label,
            visible: visible,
            width: normalizePortalQueryPrintColumnWidth(widthPrefs[key]),
            th: th,
            isMedia: isPortalQueryMediaColumn(th)
        };
    });
    return orderPortalQueryPrintColumns(cols);
}

function buildPortalQueryPrintConfigItemHtml(col) {
    return '<div class="portal-query-print-config__item" data-col-index="' + col.index + '" data-col-key="' +
        escapePortalHtml(col.key) + '">' +
        '<span class="portal-query-print-config__drag" draggable="true" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder ' +
        escapePortalHtml(col.label) + '">' +
        '<span class="portal-query-print-config__drag-dots" aria-hidden="true"></span>' +
        '</span>' +
        '<label class="portal-query-print-config__item-main">' +
        '<input type="checkbox" class="portal-query-print-config__check" data-col-key="' +
        escapePortalHtml(col.key) + '" data-col-index="' + col.index + '"' +
        (col.visible ? ' checked' : '') + ' />' +
        '<span class="portal-query-print-config__label">' + escapePortalHtml(col.label) + '</span>' +
        '</label>' +
        (col.isMedia ? '<span class="portal-query-print-config__badge">Image</span>' : '') +
        '<span class="portal-query-print-config__width-wrap" title="Column width as % of page table">' +
        '<input type="number" class="portal-query-print-config__width" min="5" max="80" step="1" ' +
        'inputmode="numeric" placeholder="Auto" aria-label="Width percent for ' + escapePortalHtml(col.label) + '" ' +
        'data-col-key="' + escapePortalHtml(col.key) + '" data-col-index="' + col.index + '" ' +
        (col.width != null ? 'value="' + col.width + '" ' : '') + '/>' +
        '<span class="portal-query-print-config__width-unit">%</span>' +
        '</span>' +
        '</div>';
}

function renderPortalQueryPrintConfigList(listEl, cols) {
    if (!listEl) {
        return;
    }
    listEl.innerHTML = (cols || []).map(buildPortalQueryPrintConfigItemHtml).join('');
}

var portalQueryPrintDragItem = null;

function bindPortalQueryPrintColumnDrag() {
    if (document.documentElement.dataset.portalQueryPrintDragBound === '1') {
        return;
    }
    document.documentElement.dataset.portalQueryPrintDragBound = '1';

    $(document).on('dragstart', '#portalQueryPrintConfigList .portal-query-print-config__drag', function (e) {
        var item = this.closest('.portal-query-print-config__item');
        if (!item) {
            return;
        }
        portalQueryPrintDragItem = item;
        item.classList.add('is-dragging');
        try {
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            e.originalEvent.dataTransfer.setData('text/plain', item.getAttribute('data-col-key') || '');
            if (e.originalEvent.dataTransfer.setDragImage) {
                e.originalEvent.dataTransfer.setDragImage(item, 16, 16);
            }
        } catch (err) {
            /* ignore */
        }
    });

    $(document).on('dragend', '#portalQueryPrintConfigList .portal-query-print-config__drag', function () {
        document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__item').forEach(function (el) {
            el.classList.remove('is-dragging', 'is-drag-over');
        });
        portalQueryPrintDragItem = null;
        savePortalQueryPrintColumnOrder(collectPortalQueryPrintConfigOrder());
        refreshPortalQueryPrintPreview();
    });

    $(document).on('dragover', '#portalQueryPrintConfigList .portal-query-print-config__item', function (e) {
        e.preventDefault();
        if (!portalQueryPrintDragItem || portalQueryPrintDragItem === this) {
            return;
        }
        try {
            e.originalEvent.dataTransfer.dropEffect = 'move';
        } catch (err) {
            /* ignore */
        }
        var list = this.parentNode;
        if (!list) {
            return;
        }
        var items = Array.prototype.slice.call(list.children);
        var from = items.indexOf(portalQueryPrintDragItem);
        var to = items.indexOf(this);
        if (from < 0 || to < 0 || from === to) {
            return;
        }
        if (from < to) {
            list.insertBefore(portalQueryPrintDragItem, this.nextSibling);
        } else {
            list.insertBefore(portalQueryPrintDragItem, this);
        }
    });

    $(document).on('drop', '#portalQueryPrintConfigList .portal-query-print-config__item', function (e) {
        e.preventDefault();
    });
}

function isPortalQueryMediaColumn(th) {
    if (!th) {
        return false;
    }
    var type = (th.getAttribute('data-col-type') || '').toLowerCase();
    if (type === 'thumb' || type === 'file' || type === 'blob' || type === 'image' || type === 'photo') {
        return true;
    }
    var key = (th.getAttribute('data-col-key') || th.getAttribute('data-print-key') || '').toLowerCase();
    if (/icon|photo|image|blob|avatar|thumbnail/.test(key)) {
        return true;
    }
    var label = (th.textContent || '').toLowerCase();
    return /icon|photo|image|avatar|thumbnail/.test(label);
}

function looksLikePortalQueryImageUrl(value) {
    var url = String(value || '').trim();
    if (!url || url === '-' || /^null$/i.test(url)) {
        return false;
    }
    if (/^data:image\//i.test(url)) {
        return true;
    }
    if (/^https?:\/\//i.test(url) || url.indexOf('//') === 0 || url.charAt(0) === '/') {
        return true;
    }
    return /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?|#|$)/i.test(url);
}

function buildPortalQueryThumbHtml(url) {
    var safe = escapePortalHtml(url || '/images/no_image.png');
    // Same loading pipeline as list grids: placeholder → lazyload swaps data-src.
    return '<a href="' + safe + '" data-toggle="lightbox" data-type="image" class="portal-list-thumb-link">' +
        '<img class="lazyload img-fluid portal-query-thumb" src="/images/loading.svg" data-src="' + safe + '" alt="" ' +
        'bc-thumbnail="true" bc-round="true" ' +
        'style="height:auto;width:auto;max-height:110px;max-width:110px;display:block;margin-left:auto;margin-right:auto;" />' +
        '</a>';
}

/** Align any list/report thumb with the grid loading.svg + data-src lazyload pattern. */
function applyPortalThumbLoadingPlaceholder(img) {
    if (!img || img.getAttribute('data-portal-thumb-ready') === '1') {
        return;
    }

    // Already wired like list grids.
    if (img.classList.contains('lazyload') && img.getAttribute('data-src')) {
        img.setAttribute('data-portal-thumb-ready', '1');
        return;
    }

    var real = img.getAttribute('data-src') || img.getAttribute('src') || '';
    if (!real) {
        return;
    }

    if (/loading\.svg/i.test(real)) {
        img.classList.add('lazyload', 'img-fluid');
        img.setAttribute('data-portal-thumb-ready', '1');
        return;
    }

    img.classList.add('lazyload', 'img-fluid', 'portal-query-thumb');
    img.setAttribute('data-src', real);
    img.setAttribute('src', '/images/loading.svg');
    img.setAttribute('bc-thumbnail', 'true');
    img.setAttribute('bc-round', 'true');
    img.removeAttribute('loading');
    img.style.height = 'auto';
    img.style.width = 'auto';
    img.style.maxHeight = '110px';
    img.style.maxWidth = '110px';
    img.style.display = 'block';
    img.style.marginLeft = 'auto';
    img.style.marginRight = 'auto';
    img.setAttribute('data-portal-thumb-ready', '1');
}

function initPortalThumbLazyload(root) {
    var scope = root || document.getElementById('list-region') || document;
    if (typeof $ === 'undefined' || typeof $.fn.lazyload !== 'function') {
        // Fallback without plugin: promote data-src immediately.
        (scope.querySelectorAll ? scope.querySelectorAll('img.lazyload[data-src]') : []).forEach(function (img) {
            var src = img.getAttribute('data-src');
            if (src) {
                img.src = src;
            }
        });
        return;
    }
    $('img.lazyload', scope).lazyload();
}

/**
 * Portal grid/report datetime display: invariant ISO-style (yyyy-MM-dd HH:mm:ss).
 * Storage/API stay ISO; grids use a readable space-separated form that sorts lexicographically.
 */
function formatPortalGridDateTime(date, dateOnly) {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime()) || d.getFullYear() <= 1) {
        return '';
    }
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if (dateOnly) {
        return day;
    }
    return day + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function parsePortalGridDateTime(text) {
    var raw = String(text || '').trim();
    if (!raw || /^null$/i.test(raw) || raw === '-' || /0001/.test(raw)) {
        return null;
    }

    // Already portal/ISO display
    var iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (iso) {
        var dIso = new Date(
            Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]),
            Number(iso[4] || 0), Number(iso[5] || 0), Number(iso[6] || 0)
        );
        return isNaN(dIso.getTime()) ? null : dIso;
    }

    // Legacy portal form: dd.MM.yyyy HH:mm[:ss]
    var eu = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (eu) {
        var dEu = new Date(
            Number(eu[3]), Number(eu[2]) - 1, Number(eu[1]),
            Number(eu[4] || 0), Number(eu[5] || 0), Number(eu[6] || 0)
        );
        return isNaN(dEu.getTime()) ? null : dEu;
    }

    var parsed = Date.parse(raw);
    if (isNaN(parsed)) {
        return null;
    }
    return new Date(parsed);
}

function isPortalDateTimeColumnMeta(th, td) {
    var type = ((td && td.getAttribute('data-col-type')) || (th && th.getAttribute('data-col-type')) || '').toLowerCase();
    if (type === 'datetime' || type === 'date') {
        return true;
    }
    var key = ((td && td.getAttribute('data-col-key')) || (th && th.getAttribute('data-col-key')) || '').toLowerCase();
    if (!key) {
        return false;
    }
    // Keep heuristics tight — avoid Candidate (*date) / Seat (*at).
    return /(datetime|timestamp)$/.test(key)
        || /^(date|time)$/.test(key)
        || /(?:created|updated|modified|deleted)(?:at|date)$/.test(key)
        || /(?:start|end|birth|due|expiry|expire|published)date$/.test(key)
        || /(?:checkin|checkout|start|end|open|close)time$/.test(key)
        || /checkin|checkout/.test(key);
}

/** Normalize culture-dependent DateTime cell text to ISO-style portal display. */
function enhancePortalDateTimeCells(root) {
    var scope = root || document;
    var tables = [];
    if (scope && scope.nodeType === 1) {
        if (scope.matches && scope.matches('table')) {
            tables = [scope];
        } else if (scope.id === 'list-region' || (scope.classList && scope.classList.contains('portal-table-scroll'))) {
            tables = scope.querySelectorAll('table');
        } else if (scope.querySelectorAll) {
            tables = scope.querySelectorAll('#list-region table, .portal-table-scroll table');
        }
    } else if (document.querySelectorAll) {
        tables = document.querySelectorAll('#list-region table, .portal-table-scroll table');
    }

    Array.prototype.forEach.call(tables, function (table) {
        if (!table || !table.tHead || !table.tHead.rows.length) {
            return;
        }
        var headerCells = table.tHead.rows[0].cells;
        table.querySelectorAll('tbody td').forEach(function (td) {
            if (td.querySelector('input, select, textarea, img, a, .ios-switch-wrapper, time')) {
                return;
            }
            var th = headerCells[td.cellIndex];
            if (!isPortalDateTimeColumnMeta(th, td)) {
                return;
            }

            var raw = (td.textContent || '').trim();
            var parsed = parsePortalGridDateTime(raw);
            if (!parsed) {
                return;
            }

            var key = (td.getAttribute('data-col-key') || (th && th.getAttribute('data-col-key')) || '').toLowerCase();
            var type = (td.getAttribute('data-col-type') || (th && th.getAttribute('data-col-type')) || '').toLowerCase();
            var dateOnly = type === 'date' || (/date$/.test(key) && !/time|datetime|timestamp/.test(key)
                && parsed.getHours() === 0 && parsed.getMinutes() === 0 && parsed.getSeconds() === 0);

            var formatted = formatPortalGridDateTime(parsed, dateOnly);
            if (!formatted || formatted === raw) {
                if (type !== 'datetime' && type !== 'date') {
                    td.setAttribute('data-col-type', dateOnly ? 'date' : 'datetime');
                }
                return;
            }

            td.setAttribute('data-col-type', dateOnly ? 'date' : 'datetime');
            if (!td.getAttribute('data-col-key') && th && th.getAttribute('data-col-key')) {
                td.setAttribute('data-col-key', th.getAttribute('data-col-key'));
            }
            var isoAttr = formatPortalGridDateTime(parsed, false).replace(' ', 'T');
            td.innerHTML = '<time datetime="' + isoAttr + '">' + formatted + '</time>';
        });
    });
}

window.enhancePortalDateTimeCells = enhancePortalDateTimeCells;

function parsePortalGridNumber(text) {
    var raw = String(text || '').trim();
    if (!raw || /^null$/i.test(raw) || raw === '-') {
        return null;
    }
    var hasPercent = /%$/.test(raw);
    raw = raw.replace(/%$/, '').trim();
    // Support both 1,234.56 and 1.234,56
    var normalized = raw;
    if (/^\-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw) || /^\-?\d+,\d+$/.test(raw)) {
        normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = raw.replace(/,/g, '');
    }
    var n = Number(normalized);
    if (!isFinite(n)) {
        return null;
    }
    return { value: n, hadPercent: hasPercent };
}

function formatPortalGridMoney(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPortalGridInt(n) {
    return Math.trunc(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatPortalGridDecimal(n) {
    var s = n.toLocaleString('en-US', { maximumFractionDigits: 8, useGrouping: true });
    if (s.indexOf('.') >= 0) {
        s = s.replace(/\.?0+$/, '');
    }
    return s || '0';
}

function formatPortalGridPercent(n) {
    return formatPortalGridMoney(n) + '%';
}

function isPortalNumberColumnMeta(th, td) {
    var key = ((td && td.getAttribute('data-col-key')) || (th && th.getAttribute('data-col-key')) || '').toLowerCase();
    // Name wins over a mis-tagged money column (e.g. OccupancyPercent).
    if (key && /(percent|percentage)$/.test(key)) {
        return 'percent';
    }

    var type = ((td && td.getAttribute('data-col-type')) || (th && th.getAttribute('data-col-type')) || '').toLowerCase();
    if (type === 'money' || type === 'int' || type === 'decimal' || type === 'percent') {
        return type;
    }
    if (!key) {
        return '';
    }
    if (/(amount|price|fee|cost|revenue|balance|payment|charge|salary|wage|discount|tax|tip|subtotal|rate|fare|transaction|total)$/.test(key)
        || /revenue|amount/.test(key)) {
        return 'money';
    }
    if (/(count|quantity|qty|sessions|vehicles|tickets|rows|items|units)$/.test(key)
        || /^numberof/.test(key)) {
        return 'int';
    }
    return '';
}

/** Normalize money / int / percent / decimal cells to invariant portal display. */
function enhancePortalNumberCells(root) {
    var scope = root || document;
    var tables = [];
    if (scope && scope.nodeType === 1) {
        if (scope.matches && scope.matches('table')) {
            tables = [scope];
        } else if (scope.id === 'list-region' || (scope.classList && scope.classList.contains('portal-table-scroll'))) {
            tables = scope.querySelectorAll('table');
        } else if (scope.querySelectorAll) {
            tables = scope.querySelectorAll('#list-region table, .portal-table-scroll table');
        }
    } else if (document.querySelectorAll) {
        tables = document.querySelectorAll('#list-region table, .portal-table-scroll table');
    }

    Array.prototype.forEach.call(tables, function (table) {
        if (!table || !table.tHead || !table.tHead.rows.length) {
            return;
        }
        var headerCells = table.tHead.rows[0].cells;
        table.querySelectorAll('tbody td').forEach(function (td) {
            if (td.querySelector('input, select, textarea, img, a, .ios-switch-wrapper, time')) {
                return;
            }
            if (td.getAttribute('data-portal-num') === '1') {
                return;
            }
            var th = headerCells[td.cellIndex];
            var kind = isPortalNumberColumnMeta(th, td);
            if (!kind) {
                return;
            }

            var raw = (td.textContent || '').trim();
            var parsed = parsePortalGridNumber(raw);
            if (!parsed) {
                return;
            }

            var formatted;
            if (kind === 'percent' || parsed.hadPercent) {
                kind = 'percent';
                formatted = formatPortalGridPercent(parsed.value);
            } else if (kind === 'int') {
                formatted = formatPortalGridInt(parsed.value);
            } else if (kind === 'decimal') {
                formatted = formatPortalGridDecimal(parsed.value);
            } else {
                kind = 'money';
                formatted = formatPortalGridMoney(parsed.value);
            }

            if (!formatted) {
                return;
            }

            td.setAttribute('data-col-type', kind);
            td.setAttribute('data-portal-num', '1');
            if (!td.getAttribute('data-col-key') && th && th.getAttribute('data-col-key')) {
                td.setAttribute('data-col-key', th.getAttribute('data-col-key'));
            }
            if (formatted !== raw) {
                td.textContent = formatted;
            }
        });
    });
}

window.enhancePortalNumberCells = enhancePortalNumberCells;

/** Turn plain URL text in Live Report image/icon columns into thumbnails. */
function enhancePortalQueryImageCells() {
    var region = document.getElementById('list-region');
    var form = getPortalQueryForm();
    var table = (form && form.querySelector('#list-region table'))
        || (region && region.querySelector('table'));
    if (!table || !table.tHead || !table.tHead.rows.length) {
        // Still normalize any thumbs already in the list region (CRUD grids).
        if (region) {
            region.querySelectorAll('td[data-col-type="thumb"] img, a.portal-list-thumb-link img').forEach(applyPortalThumbLoadingPlaceholder);
            initPortalThumbLazyload(region);
        }
        return;
    }

    var headerCells = table.tHead.rows[0].cells;
    Array.prototype.forEach.call(headerCells, function (th) {
        if (isPortalQueryMediaColumn(th) && th.getAttribute('data-col-type') !== 'thumb') {
            th.setAttribute('data-col-type', 'thumb');
        }
    });

    table.querySelectorAll('tbody td').forEach(function (td) {
        var existingImg = td.querySelector('img');
        if (existingImg || td.querySelector('.portal-list-thumb-link, a[data-type="image"]')) {
            if (td.getAttribute('data-col-type') !== 'thumb') {
                td.setAttribute('data-col-type', 'thumb');
            }
            if (existingImg) {
                applyPortalThumbLoadingPlaceholder(existingImg);
            } else {
                td.querySelectorAll('img').forEach(applyPortalThumbLoadingPlaceholder);
            }
            return;
        }

        var th = headerCells[td.cellIndex];
        var key = (td.getAttribute('data-col-key') || (th && th.getAttribute('data-col-key')) || '').toLowerCase();
        var type = (td.getAttribute('data-col-type') || (th && th.getAttribute('data-col-type')) || '').toLowerCase();
        var isMedia = type === 'thumb' || isPortalQueryMediaColumn(th) || /icon|photo|image|avatar|thumbnail/.test(key);
        if (!isMedia) {
            return;
        }

        var raw = (td.textContent || '').trim();
        var url = (!raw || /^null$/i.test(raw) || raw === '-')
            ? '/images/no_image.png'
            : raw;
        if (url !== '/images/no_image.png' && !looksLikePortalQueryImageUrl(url)) {
            return;
        }

        td.setAttribute('data-col-type', 'thumb');
        if (!td.getAttribute('data-col-key') && th && th.getAttribute('data-col-key')) {
            td.setAttribute('data-col-key', th.getAttribute('data-col-key'));
        }
        td.innerHTML = buildPortalQueryThumbHtml(url);
    });

    initPortalThumbLazyload(region || table);
}

function defaultPortalQueryColumnPrintVisible(th) {
    // Images/files rarely belong on a compact landscape print by default.
    return !isPortalQueryMediaColumn(th);
}

function setPortalQueryColumnPrintVisible(table, colIndex, visible) {
    if (!table || colIndex < 0) {
        return;
    }
    table.querySelectorAll('tr').forEach(function (row) {
        var cell = row.children[colIndex];
        if (!cell) {
            return;
        }
        if (visible) {
            cell.removeAttribute('data-print-hide');
        } else {
            cell.setAttribute('data-print-hide', '1');
        }
    });
}

function applyPortalQueryPrintColumnPrefsToTable() {
    var table = getPortalQueryPrintTable();
    if (!table) {
        return;
    }
    getPortalQueryPrintColumns().forEach(function (col) {
        setPortalQueryColumnPrintVisible(table, col.index, col.visible);
    });
}

function stripPortalQueryHeaderPrintToggles() {
    document.querySelectorAll('#list-region table thead .portal-print-col').forEach(function (el) {
        var row = el.closest('.portal-col-head__print-row');
        var th = el.closest('th');
        if (row && th) {
            var label = row.querySelector('.portal-col-head__label');
            if (label) {
                while (label.firstChild) {
                    th.insertBefore(label.firstChild, row);
                }
            }
            row.remove();
        } else {
            el.remove();
        }
    });
}

function ensurePortalQueryPrintConfigModal() {
    var existing = document.getElementById('portalQueryPrintConfigModal');
    if (existing &&
        existing.querySelector('#portalQueryPrintPreviewHost') &&
        existing.querySelector('[data-print-zoom]') &&
        existing.querySelector('#portalQueryPrintConfigSubtitle') &&
        existing.querySelector('.portal-query-print-config__btn-download') &&
        existing.querySelector('#portalQueryPrintConfigDownloadCsv') &&
        existing.querySelector('.portal-query-print-config__footer-actions') &&
        existing.querySelector('.portal-query-print-config__drag')) {
        return existing;
    }
    if (existing) {
        existing.remove();
    }
    var stalePreview = document.getElementById('portalQueryPdfPreviewModal');
    if (stalePreview) {
        stalePreview.remove();
    }

    var wrap = document.createElement('div');
    wrap.innerHTML =
        '<div class="modal fade portal-query-print-config" id="portalQueryPrintConfigModal" tabindex="-1" role="dialog" aria-labelledby="portalQueryPrintConfigTitle" aria-hidden="true">' +
        '  <div class="modal-dialog modal-dialog-centered modal-xl portal-query-print-config__dialog" role="document">' +
        '    <div class="modal-content portal-query-print-config__content portal-query-print-config__content--split">' +
        '      <div class="modal-header portal-query-print-config__header">' +
        '        <div class="portal-query-print-config__heading">' +
        '          <p class="portal-query-print-config__kicker">Print report</p>' +
        '          <h5 class="modal-title" id="portalQueryPrintConfigTitle">Report</h5>' +
        '          <p class="portal-query-print-config__subtitle" id="portalQueryPrintConfigSubtitle">Choose layout, preview, then print or download</p>' +
        '        </div>' +
        '        <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>' +
        '      </div>' +
        '      <div class="modal-body portal-query-print-config__body portal-query-print-config__body--split">' +
        '        <aside class="portal-query-print-config__controls">' +
        '          <p class="portal-query-print-config__intro">Orientation, columns, order, and widths rebuild a temporary PDF preview. Choices are saved for this report.</p>' +
        '          <fieldset class="portal-query-print-config__orientation" id="portalQueryPrintConfigOrientation">' +
        '            <legend class="portal-query-print-config__orientation-legend">Page orientation</legend>' +
        '            <div class="portal-query-print-config__orientation-options" role="radiogroup" aria-label="Page orientation">' +
        '              <label class="portal-query-print-config__orientation-option">' +
        '                <input type="radio" name="portalQueryPrintOrientation" value="landscape" checked />' +
        '                <span class="portal-query-print-config__orientation-card">' +
        '                  <i class="fas fa-file-alt portal-query-print-config__orientation-icon portal-query-print-config__orientation-icon--landscape" aria-hidden="true"></i>' +
        '                  <span class="portal-query-print-config__orientation-label">Landscape</span>' +
        '                  <span class="portal-query-print-config__orientation-hint">Default · wider tables</span>' +
        '                </span>' +
        '              </label>' +
        '              <label class="portal-query-print-config__orientation-option">' +
        '                <input type="radio" name="portalQueryPrintOrientation" value="portrait" />' +
        '                <span class="portal-query-print-config__orientation-card">' +
        '                  <i class="fas fa-file-alt portal-query-print-config__orientation-icon portal-query-print-config__orientation-icon--portrait" aria-hidden="true"></i>' +
        '                  <span class="portal-query-print-config__orientation-label">Portrait</span>' +
        '                  <span class="portal-query-print-config__orientation-hint">Tall pages</span>' +
        '                </span>' +
        '              </label>' +
        '            </div>' +
        '          </fieldset>' +
        '          <div class="portal-query-print-config__section-label">Columns <span class="portal-query-print-config__section-hint">drag to reorder · width % · empty = auto</span></div>' +
        '          <div class="portal-query-print-config__toolbar">' +
        '            <button type="button" class="btn btn-sm btn-outline-secondary" id="portalQueryPrintConfigSelectAll">Select all</button>' +
        '            <button type="button" class="btn btn-sm btn-outline-secondary" id="portalQueryPrintConfigSelectNone">Select none</button>' +
        '            <button type="button" class="btn btn-sm btn-link" id="portalQueryPrintConfigReset">Reset</button>' +
        '          </div>' +
        '          <div class="portal-query-print-config__list" id="portalQueryPrintConfigList" role="group" aria-label="Print columns"></div>' +
        '        </aside>' +
        '        <section class="portal-query-print-config__preview" aria-label="Print preview">' +
        '          <div class="portal-query-print-config__preview-head">' +
        '            <div class="portal-query-print-config__preview-head-main">' +
        '              <span class="portal-query-print-config__preview-label">Preview</span>' +
        '              <span class="portal-query-print-config__preview-meta" id="portalQueryPrintPreviewMeta"></span>' +
        '            </div>' +
        '            <div class="portal-query-print-config__zoom" role="group" aria-label="Preview zoom">' +
        '              <button type="button" class="btn btn-sm btn-outline-secondary" data-print-zoom="fitWidth" title="Fit page width">Fit width</button>' +
        '              <button type="button" class="btn btn-sm btn-outline-secondary" data-print-zoom="fitPage" title="Fit one page in view">Fit page</button>' +
        '              <button type="button" class="btn btn-sm btn-outline-secondary" data-print-zoom="fit" title="Fit all pages in view">Fit all</button>' +
        '              <button type="button" class="btn btn-sm btn-outline-secondary" data-print-zoom-nudge="-0.1" title="Zoom out">−</button>' +
        '              <button type="button" class="btn btn-sm btn-outline-secondary" data-print-zoom="actual" title="Actual size">100%</button>' +
        '              <button type="button" class="btn btn-sm btn-outline-secondary" data-print-zoom-nudge="0.1" title="Zoom in">+</button>' +
        '            </div>' +
        '          </div>' +
        '          <div class="portal-query-print-config__preview-stage" id="portalQueryPrintPreviewStage">' +
        '            <div class="portal-query-print-config__preview-loading" id="portalQueryPrintPreviewLoading" hidden>' +
        '              <div class="portal-query-print-config__preview-spinner" aria-hidden="true"></div>' +
        '              <p class="portal-query-print-config__preview-loading-title" data-loading-title>Preparing PDF…</p>' +
        '              <p class="portal-query-print-config__preview-loading-sub" data-loading-sub>Building a print-ready preview</p>' +
        '            </div>' +
        '            <div class="portal-query-print-config__preview-scroll">' +
        '              <div class="portal-query-print-config__preview-host" id="portalQueryPrintPreviewHost" aria-busy="false"></div>' +
        '            </div>' +
        '            <iframe class="portal-query-pdf-preview__print-frame" id="portalQueryPdfPrintFrame" title="Print PDF" aria-hidden="true"></iframe>' +
        '          </div>' +
        '        </section>' +
        '      </div>' +
        '      <div class="modal-footer portal-query-print-config__footer">' +
        '        <button type="button" class="btn btn-outline-secondary portal-query-print-config__btn-close" data-bs-dismiss="modal">Close</button>' +
        '        <div class="portal-query-print-config__footer-actions">' +
        '          <button type="button" class="btn portal-query-print-config__btn-download-csv" id="portalQueryPrintConfigDownloadCsv">' +
        '            <i class="fas fa-file-csv" aria-hidden="true"></i> Download CSV' +
        '          </button>' +
        '          <button type="button" class="btn portal-query-print-config__btn-download" id="portalQueryPrintConfigDownload">' +
        '            <i class="fas fa-file-pdf" aria-hidden="true"></i> Download PDF' +
        '          </button>' +
        '          <button type="button" class="btn btn-primary portal-query-print-config__btn-print" id="portalQueryPrintConfigPrint">' +
        '            <i class="fas fa-print" aria-hidden="true"></i> Print' +
        '          </button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

    var modalEl = wrap.firstElementChild;
    document.body.appendChild(modalEl);

    modalEl.addEventListener('hidden.bs.modal', function () {
        var host = document.getElementById('portalQueryPrintPreviewHost');
        if (host) {
            host.innerHTML = '';
        }
        var frame = document.getElementById('portalQueryPdfPrintFrame');
        if (frame) {
            frame.removeAttribute('src');
            delete frame.dataset.blobUrl;
            delete frame.dataset.ready;
        }
        portalQueryPdfPreviewState.renderToken += 1;
        revokePortalQueryPdfPreviewUrl();
    });

    var printBtn = modalEl.querySelector('#portalQueryPrintConfigPrint');
    if (printBtn) {
        printBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            commitPortalQueryPrintConfigAndPrint();
        }, true);
    }

    var downloadBtn = modalEl.querySelector('#portalQueryPrintConfigDownload');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            commitPortalQueryPrintConfigAndDownload();
        }, true);
    }

    var downloadCsvBtn = modalEl.querySelector('#portalQueryPrintConfigDownloadCsv');
    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            commitPortalQueryPrintConfigAndDownloadCsv();
        }, true);
    }

    modalEl.querySelectorAll('[data-print-zoom]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            setPortalQueryPrintPreviewZoomMode(btn.getAttribute('data-print-zoom'));
        });
    });
    modalEl.querySelectorAll('[data-print-zoom-nudge]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            nudgePortalQueryPrintPreviewZoom(parseFloat(btn.getAttribute('data-print-zoom-nudge')) || 0);
        });
    });

    window.addEventListener('resize', function () {
        if (document.getElementById('portalQueryPrintConfigModal') &&
            document.getElementById('portalQueryPrintConfigModal').classList.contains('show')) {
            layoutPortalQueryPrintPreview();
        }
    });

    return modalEl;
}

function refreshPortalQueryPrintPreview() {
    var host = document.getElementById('portalQueryPrintPreviewHost');
    if (!host) {
        return;
    }

    var orientation = getPortalQueryPrintConfigOrientation();
    applyPortalQueryPrintOrientation(orientation);
    var payload = collectPortalQueryPdfPayload(orientation);
    var token = ++portalQueryPdfPreviewState.renderToken;

    if (!payload) {
        host.innerHTML = '<p class="portal-query-print-config__preview-empty">Select at least one column to preview.</p>';
        setPortalQueryPrintPreviewLoading(false);
        portalQueryPdfPreviewState.matrix = null;
        revokePortalQueryPdfPreviewUrl();
        updatePortalQueryPrintPreviewMeta();
        return;
    }

    portalQueryPdfPreviewState.title = payload.title;
    portalQueryPdfPreviewState.meta = payload.meta || '';
    portalQueryPdfPreviewState.matrix = payload.matrix;
    portalQueryPdfPreviewState.orientation = payload.orientation;
    if (!portalQueryPdfPreviewState.zoomMode) {
        portalQueryPdfPreviewState.zoomMode = 'fitWidth';
    }

    setPortalQueryPrintPreviewLoading(true, 'Preparing PDF…', 'Building a print-ready preview');
    host.innerHTML = '';
    updatePortalQueryPrintPreviewMeta();

    buildPortalQueryPdf(orientation)
        .then(function (result) {
            if (token !== portalQueryPdfPreviewState.renderToken) {
                if (result && result.blobUrl) {
                    try { URL.revokeObjectURL(result.blobUrl); } catch (e) { /* ignore */ }
                }
                return;
            }
            if (!result) {
                setPortalQueryPrintPreviewLoading(true, 'Nothing to preview', 'Select columns and try again');
                return;
            }
            revokePortalQueryPdfPreviewUrl();
            portalQueryPdfPreviewState.blob = result.blob;
            portalQueryPdfPreviewState.blobUrl = result.blobUrl;
            portalQueryPdfPreviewState.pageCount = result.pageCount || 1;
            return renderPortalQueryPdfToPreview(result, token);
        })
        .catch(function (err) {
            if (token !== portalQueryPdfPreviewState.renderToken) {
                return;
            }
            console.warn(err);
            setPortalQueryPrintPreviewLoading(true, 'Could not build PDF', 'Please try again');
        });
}

function getPortalQueryReportTitle() {
    var form = getPortalQueryForm();
    var titleEl = form && form.querySelector('.portal-query-title');
    var title = (titleEl && titleEl.textContent || '').replace(/\s+/g, ' ').trim();
    return title || (document.title || 'Report').trim() || 'Report';
}

function focusPortalQueryPrintConfigAction(modalEl, action) {
    if (!modalEl) {
        return;
    }
    modalEl.querySelectorAll(
        '#portalQueryPrintConfigDownload, #portalQueryPrintConfigDownloadCsv, #portalQueryPrintConfigPrint'
    ).forEach(function (btn) {
        btn.classList.remove('is-export-focus');
    });
    var targetId = action === 'csv'
        ? 'portalQueryPrintConfigDownloadCsv'
        : (action === 'pdf' ? 'portalQueryPrintConfigDownload' : null);
    if (!targetId) {
        return;
    }
    var target = modalEl.querySelector('#' + targetId);
    if (!target) {
        return;
    }
    target.classList.add('is-export-focus');
    try {
        target.focus({ preventScroll: true });
    } catch (e) {
        try { target.focus(); } catch (err) { /* ignore */ }
    }
    window.setTimeout(function () {
        target.classList.remove('is-export-focus');
    }, 2200);
}

function openPortalQueryPrintConfigModal(options) {
    var opts = options || {};
    var cols = getPortalQueryPrintColumns();
    if (!cols.length) {
        return;
    }
    var modalEl = ensurePortalQueryPrintConfigModal();
    var reportTitle = getPortalQueryReportTitle();
    var titleEl = modalEl.querySelector('#portalQueryPrintConfigTitle');
    if (titleEl) {
        titleEl.textContent = reportTitle;
    }
    var subtitleEl = modalEl.querySelector('#portalQueryPrintConfigSubtitle');
    if (subtitleEl) {
        if (opts.focusAction === 'csv') {
            subtitleEl.textContent = 'Review columns, then download CSV';
        } else if (opts.focusAction === 'pdf') {
            subtitleEl.textContent = 'Review columns and preview, then download PDF';
        } else {
            subtitleEl.textContent = 'Preview, download PDF/CSV, or print this report';
        }
    }

    var list = modalEl.querySelector('#portalQueryPrintConfigList');
    renderPortalQueryPrintConfigList(list, cols);

    var orientation = loadPortalQueryPrintOrientation();
    modalEl.querySelectorAll('input[name="portalQueryPrintOrientation"]').forEach(function (input) {
        input.checked = input.value === orientation;
    });

    // Always open in Fit width once the modal has a real size.
    portalQueryPdfPreviewState.zoomMode = 'fitWidth';
    portalQueryPdfPreviewState.zoomFactor = 1;

    ensurePortalQueryPdfLibs().catch(function () { /* download can retry */ });
    ensurePortalQueryPdfJs().catch(function () { /* preview can retry */ });

    var runPreview = function () {
        refreshPortalQueryPrintPreview();
        window.requestAnimationFrame(function () {
            layoutPortalQueryPrintPreview();
            window.setTimeout(layoutPortalQueryPrintPreview, 80);
            window.setTimeout(layoutPortalQueryPrintPreview, 250);
        });
        if (opts.focusAction) {
            focusPortalQueryPrintConfigAction(modalEl, opts.focusAction);
        }
    };

    if (window.bootstrap && bootstrap.Modal) {
        modalEl.addEventListener('shown.bs.modal', runPreview, { once: true });
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
        return;
    }
    $(modalEl).one('shown.bs.modal', runPreview);
    $(modalEl).modal('show');
}

function getPortalQueryPrintConfigOrientation() {
    var checked = document.querySelector('#portalQueryPrintConfigModal input[name="portalQueryPrintOrientation"]:checked');
    return normalizePortalQueryPrintOrientation(checked && checked.value);
}

function setPortalQueryPrintConfigChecks(checked) {
    document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__check').forEach(function (input) {
        input.checked = !!checked;
    });
}

function resetPortalQueryPrintConfigChecks() {
    document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__check').forEach(function (input) {
        input.checked = true;
    });
}

function resetPortalQueryPrintConfigWidths() {
    document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__width').forEach(function (input) {
        input.value = '';
    });
}

function resetPortalQueryPrintConfigOrder() {
    savePortalQueryPrintColumnOrder([]);
    var list = document.getElementById('portalQueryPrintConfigList');
    if (!list) {
        return;
    }
    var table = getPortalQueryPrintTable();
    if (!table || !table.tHead) {
        return;
    }
    var cols = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th, index) {
        if (!th.getAttribute('data-col-key') && !th.getAttribute('data-print-key')) {
            th.setAttribute('data-print-key', 'col_' + index);
        }
        var key = th.getAttribute('data-col-key') || th.getAttribute('data-print-key');
        var labelEl = th.querySelector('.portal-col-head__label');
        var label = ((labelEl ? labelEl.textContent : th.textContent) || '').replace(/\s+/g, ' ').trim() || ('Column ' + (index + 1));
        return {
            index: index,
            key: key,
            label: label,
            visible: true,
            width: null,
            th: th,
            isMedia: isPortalQueryMediaColumn(th)
        };
    });
    renderPortalQueryPrintConfigList(list, cols);
}

function dismissPortalQueryPrintConfigModalSync() {
    var modalEl = document.getElementById('portalQueryPrintConfigModal');
    if (!modalEl) {
        return;
    }

    try {
        if (window.bootstrap && bootstrap.Modal) {
            var instance = bootstrap.Modal.getInstance(modalEl);
            if (instance) {
                instance.dispose();
            }
        }
    } catch (e) {
        /* ignore */
    }

    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.removeAttribute('aria-modal');
    modalEl.removeAttribute('role');
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
        backdrop.remove();
    });
}

function applyPortalQueryPrintConfigSelection(options) {
    var table = getPortalQueryPrintTable();
    if (!table) {
        return null;
    }

    var prefs = {};
    var checkedCount = 0;
    document.querySelectorAll('#portalQueryPrintConfigList .portal-query-print-config__check').forEach(function (input) {
        var index = parseInt(input.getAttribute('data-col-index'), 10);
        var key = input.getAttribute('data-col-key');
        var visible = !!input.checked;
        if (visible) {
            checkedCount++;
        }
        if (key) {
            prefs[key] = visible;
        }
        setPortalQueryColumnPrintVisible(table, index, visible);
    });

    if (checkedCount === 0) {
        window.alert('Select at least one column to print.');
        return null;
    }

    var orientation = getPortalQueryPrintConfigOrientation();
    savePortalQueryPrintColumnPrefs(prefs);
    savePortalQueryPrintColumnWidthPrefs(collectPortalQueryPrintConfigWidthPrefs());
    savePortalQueryPrintColumnOrder(collectPortalQueryPrintConfigOrder());
    savePortalQueryPrintOrientation(orientation);
    applyPortalQueryPrintOrientation(orientation);
    preparePortalQueryPrintMeta();

    // Reloading the preview iframe before print() breaks Safari's user-gesture chain
    // ("This webpage is trying to print"). Print uses the already-rendered preview.
    if (options && options.skipPreviewRefresh) {
        var payload = collectPortalQueryPdfPayload(orientation);
        if (payload) {
            portalQueryPdfPreviewState.title = payload.title;
            portalQueryPdfPreviewState.meta = payload.meta;
            portalQueryPdfPreviewState.matrix = payload.matrix;
            portalQueryPdfPreviewState.orientation = payload.orientation;
        }
    } else {
        refreshPortalQueryPrintPreview();
    }
    return orientation;
}

function commitPortalQueryPrintConfigAndPrint() {
    var orientation = applyPortalQueryPrintConfigSelection({ skipPreviewRefresh: true });
    if (!orientation) {
        return;
    }
    printPortalQueryPdfFromPreview();
}

function commitPortalQueryPrintConfigAndDownload() {
    var orientation = applyPortalQueryPrintConfigSelection();
    if (!orientation) {
        return;
    }
    downloadPortalQueryPdfFromPreview();
}

function commitPortalQueryPrintConfigAndDownloadCsv() {
    var orientation = applyPortalQueryPrintConfigSelection({ skipPreviewRefresh: true });
    if (!orientation) {
        return;
    }
    downloadPortalQueryCsvFromPreview();
}


window.commitPortalQueryPrintConfigAndPrint = commitPortalQueryPrintConfigAndPrint;

function bindPortalApiMethodEndpointDetails() {
    if (document.documentElement.dataset.portalApiMethodEndpointBound === '1') {
        return;
    }
    document.documentElement.dataset.portalApiMethodEndpointBound = '1';
    // Chips reuse the Live Report endpoint modal (portal-query-endpoint).
    enhancePortalApiMethodEndpointChips();
}

/** Upgrade Method/Path rows into the shared Live Report endpoint chip + modal. */
function enhancePortalApiMethodEndpointChips(root) {
    var scope = root || document;
    // Require data-key so Kafka Events cards (method/path for search only) are not rewritten
    // into Live Report endpoint chips — that used the topic <code> and broke the page chrome.
    var cards = scope.querySelectorAll
        ? scope.querySelectorAll('.searchable-card[data-method][data-path][data-key]')
        : [];

    Array.prototype.forEach.call(cards, function (card) {
        var existing = card.querySelector('.portal-query-endpoint, .portal-api-method-endpoint');
        if (existing) {
            applyPortalApiMethodEndpointSchema(existing, card);
            return;
        }

        var method = (card.getAttribute('data-method') || '').trim();
        var pathAttr = (card.getAttribute('data-path') || '').trim();
        var codeEl = card.querySelector('code.portal-query-endpoint__path, code');
        var path = (codeEl && (codeEl.textContent || '').trim()) || pathAttr;
        if (!method || !path) {
            return;
        }

        var key = (card.getAttribute('data-key') || '').trim();
        if (!key) {
            var switchEl = card.querySelector('.ios-switch');
            var groupSelect = document.getElementById('permissionGroupSelect');
            var group = groupSelect ? String(groupSelect.value || '') : '';
            var switchId = switchEl ? String(switchEl.id || '') : '';
            var prefix = group ? ('cbox_' + group + '_') : '';
            if (prefix && switchId.indexOf(prefix) === 0) {
                key = switchId.slice(prefix.length);
            } else if (switchId.indexOf('cbox_') === 0) {
                key = switchId.replace(/^cbox_[^_]+_/, '');
            }
        }

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'portal-query-endpoint portal-api-method-endpoint';
        btn.title = 'View API endpoint details';
        btn.setAttribute('data-endpoint-dynamic', '1');
        btn.setAttribute('data-method', method);
        btn.setAttribute('data-path', path);
        btn.setAttribute('data-key', key);
        btn.setAttribute('data-module', card.getAttribute('data-module') || '');
        btn.setAttribute('data-controller', card.getAttribute('data-controller') || '');
        btn.setAttribute('data-model', card.getAttribute('data-model') || '');
        btn.setAttribute('data-method-name', card.getAttribute('data-method-name') || '');
        btn.setAttribute('data-granted', card.getAttribute('data-granted')
            || (card.querySelector('.ios-switch:checked') ? 'true' : 'false'));
        btn.innerHTML =
            '<span class="portal-query-endpoint__method">' + escapePortalHtml(method) + '</span>' +
            '<span class="portal-query-endpoint__body">' +
            '  <span class="portal-query-endpoint__label">Endpoint</span>' +
            '  <code class="portal-query-endpoint__path">' + escapePortalHtml(path) + '</code>' +
            '</span>' +
            '<span class="portal-query-endpoint__chevron" aria-hidden="true"><i class="fas fa-circle-info"></i></span>';
        applyPortalApiMethodEndpointSchema(btn, card);

        var wrap = codeEl
            ? codeEl.closest('.d-flex, .portal-api-method-endpoint, .portal-query-endpoint')
            : null;
        if (wrap && wrap.parentNode && (wrap.classList.contains('d-flex') || wrap.tagName === 'DIV')) {
            wrap.parentNode.replaceChild(btn, wrap);
        } else if (codeEl && codeEl.parentNode) {
            var parent = codeEl.parentNode;
            if (parent.querySelector('.badge, .portal-query-endpoint__method')) {
                parent.parentNode.replaceChild(btn, parent);
            } else {
                parent.replaceChild(btn, codeEl);
            }
        }
    });
}

function applyPortalApiMethodEndpointSchema(btn, card) {
    if (!btn) {
        return;
    }
    btn.classList.add('portal-query-endpoint', 'portal-api-method-endpoint');
    // Open only via JS — Bootstrap data-api crashes if #portalQueryEndpointModal is missing.
    btn.removeAttribute('data-bs-toggle');
    btn.removeAttribute('data-bs-target');
    btn.setAttribute('data-endpoint-dynamic', '1');
    if (card) {
        [
            'data-method', 'data-path', 'data-key', 'data-module', 'data-controller',
            'data-model', 'data-method-name', 'data-granted',
            'data-response-type', 'data-response-fields'
        ].forEach(function (attr) {
            var fromCard = card.getAttribute(attr);
            if (fromCard && !btn.getAttribute(attr)) {
                btn.setAttribute(attr, fromCard);
            }
        });
    }
    // Prefer generate-time schema from API (data-response-*); JS heuristics are fallback only.
    var existingType = (btn.getAttribute('data-response-type') || '').trim();
    var existingFields = (btn.getAttribute('data-response-fields') || '').trim();
    if (existingType && existingFields && existingFields !== '[]') {
        return;
    }
    var schema = resolvePortalApiMethodResponseSchema(btn);
    if (schema.responseType) {
        btn.setAttribute('data-response-type', schema.responseType);
    }
    btn.setAttribute('data-response-fields', JSON.stringify(schema.fields || []));
}

/** Infer HTTP 200 body schema for Identity API method permission chips. */
function resolvePortalApiMethodResponseSchema(triggerEl) {
    var method = ((triggerEl && triggerEl.getAttribute('data-method')) || 'GET').trim().toUpperCase();
    var methodName = ((triggerEl && triggerEl.getAttribute('data-method-name')) || '').replace(/Async$/i, '').trim();
    var modelName = ((triggerEl && triggerEl.getAttribute('data-model')) || '').trim();
    var path = ((triggerEl && triggerEl.getAttribute('data-path')) || '').trim();
    var pathNoQuery = path.split('?')[0];
    var dto = modelName ? (modelName + 'Dto') : 'object';

    function field(name, type, description) {
        return { name: name, type: type, description: description };
    }

    if (/GetApiPermissions/i.test(methodName) || /get-api-permissions/i.test(pathNoQuery)) {
        return {
            responseType: 'ApiModulePermissions',
            fields: [
                field('permissionGroupName', 'string', 'Permission group these API grants belong to.'),
                field('apiModulePermissionList', 'Dictionary<string, Dictionary<string, List<ApiMethodDefinitionItem>>>', 'Module → controller → API method grant items.')
            ]
        };
    }
    if (/UpdateApiPermission/i.test(methodName) || /update-api-permission/i.test(pathNoQuery)) {
        return {
            responseType: 'bool',
            fields: [field('(body)', 'bool', 'Raw JSON boolean — true when the permission update succeeds. Example: true')]
        };
    }

    // Count/Exists and similar return Ok(primitive) — body is a JSON scalar, not an object.
    if (/^Count/i.test(methodName) || /\/count$/i.test(pathNoQuery)) {
        return {
            responseType: 'int',
            fields: [field('(body)', 'int', 'Raw JSON number — total matching records for this resource. Example: 42')]
        };
    }
    if (/^Exists/i.test(methodName) || /\/exists[-/]/i.test(pathNoQuery) || /\/exists$/i.test(pathNoQuery)) {
        return {
            responseType: 'bool',
            fields: [field('(body)', 'bool', 'Raw JSON boolean — whether a matching record exists. Example: true')]
        };
    }
    if (method === 'DELETE' || /^Delete/i.test(methodName) || /^Clear/i.test(methodName)) {
        return {
            responseType: 'bool',
            fields: [field('(body)', 'bool', 'Raw JSON boolean — true when the delete succeeds. Example: true')]
        };
    }
    if (method === 'PUT' || (/^Update/i.test(methodName) && !/ResponseDto/i.test(methodName))) {
        return {
            responseType: 'bool',
            fields: [field('(body)', 'bool', 'Raw JSON boolean — true when the update succeeds. Example: true')]
        };
    }

    var modelFields = knownPortalApiModelDtoFields(modelName);

    if (method === 'POST' && /^Insert/i.test(methodName)) {
        return { responseType: dto, fields: modelFields };
    }
    if (/^GetItem$/i.test(methodName) || (method === 'GET' && /\{[^}]+\}$/.test(pathNoQuery) && !/get-/i.test(pathNoQuery.split('/').pop() || ''))) {
        return { responseType: dto, fields: modelFields };
    }
    if (/^List$/i.test(methodName) || methodName === '') {
        return { responseType: 'List<' + dto + '>', fields: modelFields };
    }
    if (/^Get|^Search/i.test(methodName)) {
        // Filter / query-style endpoints expose a dedicated response DTO list.
        return {
            responseType: 'List<' + methodName + 'ResponseDto>',
            fields: modelFields.length ? modelFields : []
        };
    }

    if (method === 'GET') {
        return { responseType: 'List<' + dto + '>', fields: modelFields };
    }
    if (method === 'POST') {
        return { responseType: dto, fields: modelFields };
    }
    return { responseType: dto, fields: modelFields };
}

function knownPortalApiModelDtoFields(modelName) {
    var name = (modelName || '').trim();
    if (name === 'ApiMethodDefinition') {
        return [
            { name: 'key', type: 'string', description: 'Unique API method definition key.' },
            { name: 'moduleName', type: 'string', description: 'Owning module name.' },
            { name: 'modelName', type: 'string', description: 'Domain model / resource name.' },
            { name: 'httpMethod', type: 'HttpMethodType', description: 'HTTP verb for this endpoint.' },
            { name: 'controllerName', type: 'string', description: 'ASP.NET controller type name.' },
            { name: 'methodName', type: 'string', description: 'Controller action name.' },
            { name: 'urlPath', type: 'string', description: 'Route template exposed by the API.' }
        ];
    }
    if (name === 'ApiMethodAccessGrant') {
        return [
            { name: 'permissionGroupName', type: 'string', description: 'Permission group that receives the grant.' },
            { name: 'apiMethodDefinitionKey', type: 'string', description: 'Target ApiMethodDefinition key.' },
            { name: 'modifiedBy', type: 'ModificationType', description: 'Who last changed this grant.' },
            { name: 'isActive', type: 'bool', description: 'Whether the grant is currently active.' }
        ];
    }
    return [];
}

function bindPortalQueryEndpointDetails() {
    if (document.documentElement.dataset.portalQueryEndpointBound === '1') {
        return;
    }
    document.documentElement.dataset.portalQueryEndpointBound = '1';

    enhancePortalQueryEndpointChips();
    enhancePortalApiMethodEndpointChips();

    // Capture phase so we run before Bootstrap's document data-api (bubble).
    // BS data-bs-toggle against a missing #portalQueryEndpointModal builds a Modal
    // with undefined _config → TypeError on backdrop.
    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest
            ? e.target.closest('.portal-query-endpoint, .portal-api-method-endpoint')
            : null;
        if (!el || el.disabled) {
            return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        el.removeAttribute('data-bs-toggle');
        el.removeAttribute('data-bs-target');
        openPortalQueryEndpointModal(el);
    }, true);

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') {
            return;
        }
        var el = e.target && e.target.closest
            ? e.target.closest('.portal-query-endpoint, .portal-api-method-endpoint')
            : null;
        if (!el || el.disabled) {
            return;
        }
        e.preventDefault();
        openPortalQueryEndpointModal(el);
    }, true);
}

function enhancePortalQueryEndpointChips() {
    document.querySelectorAll('.portal-query-endpoint').forEach(function (el) {
        if (!el.querySelector('.portal-query-endpoint__body')) {
            var method = el.querySelector('.portal-query-endpoint__method');
            var path = el.querySelector('.portal-query-endpoint__path');
            if (method && path) {
                var body = document.createElement('span');
                body.className = 'portal-query-endpoint__body';
                var label = document.createElement('span');
                label.className = 'portal-query-endpoint__label';
                label.textContent = 'Endpoint';
                body.appendChild(label);
                body.appendChild(path);
                el.insertBefore(body, method.nextSibling);
            }
        }
        if (!el.querySelector('.portal-query-endpoint__chevron')) {
            var chevron = document.createElement('span');
            chevron.className = 'portal-query-endpoint__chevron';
            chevron.setAttribute('aria-hidden', 'true');
            chevron.innerHTML = '<i class="fas fa-circle-info"></i>';
            el.appendChild(chevron);
        }
        if (!el.getAttribute('role') && el.tagName !== 'BUTTON') {
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
        }
        el.setAttribute('title', el.getAttribute('title') || 'View API endpoint details');
        var form = el.closest ? el.closest('form#formList') : null;
        var schema = readPortalQueryResponseSchema(el, form);
        if (!el.getAttribute('data-response-type')) {
            var path = el.querySelector('.portal-query-endpoint__path');
            el.setAttribute(
                'data-response-type',
                (schema && schema.responseType)
                    || guessPortalQueryResponseType(form, path ? path.textContent : '')
            );
        }
        if ((!el.getAttribute('data-response-fields') || el.getAttribute('data-response-fields') === '[]')
            && schema && schema.fields && schema.fields.length) {
            el.setAttribute('data-response-fields', JSON.stringify(schema.fields));
        }
        // Prefer programmatic open (see bindPortalQueryEndpointDetails click handler).
        el.removeAttribute('data-bs-toggle');
        el.removeAttribute('data-bs-target');
        if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
        }
    });
}

function openPortalQueryEndpointModal(triggerEl) {
    var modalEl = ensurePortalQueryEndpointModal(triggerEl);
    if (!modalEl) {
        return;
    }
    if (window.bootstrap && bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
        return;
    }
    $(modalEl).modal('show');
}

function ensurePortalQueryEndpointModal(triggerEl) {
    var form = (triggerEl && triggerEl.closest) ? triggerEl.closest('form#formList') : getPortalQueryForm();
    var pathEl = triggerEl
        ? (triggerEl.querySelector('.portal-query-endpoint__path')
            || triggerEl.querySelector('.portal-api-method-endpoint__path'))
        : null;
    var endpoint = ((triggerEl && triggerEl.getAttribute('data-path')) || '').trim()
        || (pathEl ? (pathEl.textContent || '').trim() : '');
    var httpMethod = ((triggerEl && triggerEl.getAttribute('data-method')) || 'GET').trim().toUpperCase() || 'GET';
    var responseType = (triggerEl && triggerEl.getAttribute('data-response-type')) || '';
    var forceDynamic = !!(triggerEl && (
        triggerEl.getAttribute('data-endpoint-dynamic') === '1'
        || triggerEl.classList.contains('portal-api-method-endpoint')
    ));

    if (triggerEl && triggerEl.classList.contains('portal-api-method-endpoint')) {
        applyPortalApiMethodEndpointSchema(triggerEl, triggerEl.closest('.searchable-card'));
        responseType = triggerEl.getAttribute('data-response-type') || responseType;
    }

    var modalEl = document.getElementById('portalQueryEndpointModal');
    if (!modalEl) {
        modalEl = buildPortalQueryEndpointModalShell();
        document.body.appendChild(modalEl);
    } else {
        ensurePortalQueryEndpointModalResponseSection(modalEl);
    }

    // Drop the old separate API-permission modal if it exists.
    var legacyApiModal = document.getElementById('portalApiMethodEndpointModal');
    if (legacyApiModal && legacyApiModal.parentNode) {
        legacyApiModal.parentNode.removeChild(legacyApiModal);
    }

    var methodEl = modalEl.querySelector('.portal-query-endpoint-modal__method');
    if (methodEl) {
        methodEl.textContent = httpMethod;
    }

    var urlEl = modalEl.querySelector('.portal-query-endpoint-modal__url');
    if (urlEl && endpoint) {
        urlEl.textContent = endpoint;
    }

    var paramIntro = modalEl.querySelector('.portal-query-endpoint-modal__section:not(.portal-query-endpoint-modal__response) .portal-query-endpoint-modal__intro');
    if (paramIntro) {
        paramIntro.textContent = forceDynamic
            ? 'Route and query arguments declared by this module API endpoint.'
            : 'Values bound by this Live Report when it calls the module API.';
    }

    var tbody = modalEl.querySelector('.portal-query-endpoint-modal__section:not(.portal-query-endpoint-modal__response) .portal-query-endpoint-modal__table tbody')
        || modalEl.querySelector('.portal-query-endpoint-modal__table:not(.portal-query-endpoint-modal__table--response) tbody')
        || modalEl.querySelector('.portal-query-endpoint-modal__table tbody');
    if (tbody) {
        var hasServerRows = tbody.querySelector('tr') &&
            !tbody.querySelector('.portal-query-endpoint-modal__empty') &&
            tbody.getAttribute('data-portal-endpoint-filled') !== 'dynamic';
        if (forceDynamic || !hasServerRows || tbody.getAttribute('data-portal-endpoint-filled') === 'dynamic') {
            tbody.innerHTML = buildPortalQueryEndpointParamRowsHtml(endpoint, forceDynamic ? null : form);
            tbody.setAttribute('data-portal-endpoint-filled', 'dynamic');
        }
    }

    var responseBody = modalEl.querySelector('.portal-query-endpoint-modal__response-body');
    if (forceDynamic && responseBody) {
        responseBody.setAttribute('data-portal-response-filled', 'dynamic');
        responseBody.innerHTML = '';
    }

    fillPortalQueryEndpointResponseModel(modalEl, triggerEl, form, endpoint, responseType);

    return modalEl;
}

function ensurePortalQueryEndpointModalResponseSection(modalEl) {
    if (!modalEl || modalEl.querySelector('.portal-query-endpoint-modal__response')) {
        return;
    }
    var body = modalEl.querySelector('.portal-query-endpoint-modal__body');
    if (!body) {
        return;
    }

    // Upgrade legacy modal markup (params-only) to include a Response section.
    if (!body.querySelector('.portal-query-endpoint-modal__section')) {
        var legacyIntro = body.querySelector('.portal-query-endpoint-modal__intro');
        var legacyWrap = body.querySelector('.portal-query-endpoint-modal__table-wrap');
        var section = document.createElement('section');
        section.className = 'portal-query-endpoint-modal__section';
        section.setAttribute('aria-label', 'Request parameters');
        section.innerHTML =
            '<div class="portal-query-endpoint-modal__section-head">' +
            '<h6 class="portal-query-endpoint-modal__section-title">Parameters</h6></div>';
        if (legacyIntro) {
            section.appendChild(legacyIntro);
        } else {
            var intro = document.createElement('p');
            intro.className = 'portal-query-endpoint-modal__intro';
            intro.textContent = 'Values bound by this Live Report when it calls the module API.';
            section.appendChild(intro);
        }
        if (legacyWrap) {
            section.appendChild(legacyWrap);
        }
        var route = body.querySelector('.portal-query-endpoint-modal__route');
        if (route && route.nextSibling) {
            body.insertBefore(section, route.nextSibling);
        } else {
            body.appendChild(section);
        }
    }

    var response = document.createElement('section');
    response.className = 'portal-query-endpoint-modal__section portal-query-endpoint-modal__response';
    response.setAttribute('aria-label', 'Response model');
    response.innerHTML =
        '<div class="portal-query-endpoint-modal__section-head">' +
        '  <h6 class="portal-query-endpoint-modal__section-title">Response</h6>' +
        '  <code class="portal-query-endpoint-modal__response-type"></code>' +
        '</div>' +
        '<p class="portal-query-endpoint-modal__intro">HTTP 200 — body schema returned by the module API.</p>' +
        '<div class="portal-query-endpoint-modal__table-wrap">' +
        '  <table class="portal-query-endpoint-modal__table portal-query-endpoint-modal__table--response">' +
        '    <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Description</th></tr></thead>' +
        '    <tbody class="portal-query-endpoint-modal__response-body"></tbody>' +
        '  </table>' +
        '</div>';
    body.appendChild(response);
}

function fillPortalQueryEndpointResponseModel(modalEl, triggerEl, form, endpoint, responseType) {
    var typeEl = modalEl.querySelector('.portal-query-endpoint-modal__response-type');
    var responseBody = modalEl.querySelector('.portal-query-endpoint-modal__response-body');
    if (!typeEl && !responseBody) {
        return;
    }

    var schema = readPortalQueryResponseSchema(triggerEl, form);
    var resolvedType = (responseType || '').trim()
        || (schema && schema.responseType)
        || (typeEl && (typeEl.textContent || '').trim())
        || guessPortalQueryResponseType(form, endpoint);

    if (typeEl && resolvedType) {
        typeEl.textContent = resolvedType;
    }

    if (!responseBody) {
        return;
    }

    var hasServerRows = responseBody.querySelector('tr') &&
        !responseBody.querySelector('.portal-query-endpoint-modal__empty') &&
        responseBody.getAttribute('data-portal-response-filled') !== 'dynamic';
    if (hasServerRows) {
        return;
    }

    // Prefer embedded response DTO schema (no need to run the report).
    var props = (schema && schema.fields && schema.fields.length)
        ? schema.fields
        : collectPortalQueryResponseProps(form);
    responseBody.innerHTML = buildPortalQueryEndpointResponseRowsHtmlFromProps(props, resolvedType);
    responseBody.setAttribute('data-portal-response-filled', 'dynamic');
}

function readPortalQueryResponseSchema(triggerEl, form) {
    var raw = '';
    var responseType = '';

    if (triggerEl) {
        raw = triggerEl.getAttribute('data-response-fields') || '';
        responseType = (triggerEl.getAttribute('data-response-type') || '').trim();
    }

    var scriptEl = document.getElementById('portalQueryResponseSchema')
        || (form && form.querySelector('#portalQueryResponseSchema'))
        || document.querySelector('#portalQueryResponseSchema');
    if (scriptEl) {
        if (!raw || raw === '[]') {
            raw = (scriptEl.textContent || '').trim();
        }
        if (!responseType) {
            responseType = (scriptEl.getAttribute('data-response-type') || '').trim();
        }
    }

    var fields = [];
    if (raw) {
        try {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                fields = parsed.map(function (item) {
                    return {
                        name: String((item && item.name) || ''),
                        type: String((item && item.type) || 'string'),
                        description: String((item && item.description) || '')
                    };
                }).filter(function (item) { return !!item.name; });
            }
        } catch (err) {
            fields = [];
        }
    }

    return { responseType: responseType, fields: fields };
}

function guessPortalQueryResponseType(form, endpoint) {
    var filterName = '';
    var partialUrl = form && form.getAttribute('data-list-partial-url');
    if (partialUrl) {
        var m = partialUrl.match(/\/Queries\/([^\/\?]+)Partial/i);
        if (m) {
            filterName = m[1];
        }
    }
    if (!filterName && endpoint) {
        var path = String(endpoint).split('?')[0];
        var seg = path.split('/').filter(Boolean).pop() || '';
        filterName = seg.replace(/\{.*$/, '').replace(/-([a-z])/g, function (_, c) {
            return c.toUpperCase();
        });
        if (filterName) {
            filterName = filterName.charAt(0).toUpperCase() + filterName.slice(1);
        }
    }
    if (!filterName) {
        return 'List<object>';
    }
    return 'List<' + filterName + 'ResponseDto>';
}

function buildPortalQueryEndpointResponseRowsHtml(form) {
    return buildPortalQueryEndpointResponseRowsHtmlFromProps(collectPortalQueryResponseProps(form));
}

function buildPortalQueryEndpointResponseRowsHtmlFromProps(props, responseType) {
    if (!props || !props.length) {
        var typeName = String(responseType || '').trim();
        var scalar = describePortalScalarResponse(typeName);
        if (scalar) {
            return '<tr>' +
                '<td><code>(body)</code></td>' +
                '<td><span class="portal-query-endpoint-modal__type">' + escapePortalHtml(scalar.type) + '</span></td>' +
                '<td>' + escapePortalHtml(scalar.description) + '</td>' +
                '</tr>';
        }
        return '<tr><td colspan="3" class="portal-query-endpoint-modal__empty">No response properties resolved for this endpoint.</td></tr>';
    }

    return props.map(function (p) {
        return '<tr>' +
            '<td><code>' + escapePortalHtml(p.name) + '</code></td>' +
            '<td><span class="portal-query-endpoint-modal__type">' + escapePortalHtml(p.type) + '</span></td>' +
            '<td>' + escapePortalHtml(p.description) + '</td>' +
            '</tr>';
    }).join('');
}

/** Human-readable row for Ok(primitive) JSON bodies (e.g. Count → 42). */
function describePortalScalarResponse(typeName) {
    var t = String(typeName || '').trim().toLowerCase();
    if (t === 'int' || t === 'int32' || t === 'long' || t === 'int64') {
        return {
            type: t === 'long' || t === 'int64' ? 'long' : 'int',
            description: 'Raw JSON number body (not an object). Example: 42'
        };
    }
    if (t === 'bool' || t === 'boolean') {
        return {
            type: 'bool',
            description: 'Raw JSON boolean body (not an object). Example: true'
        };
    }
    if (t === 'string') {
        return {
            type: 'string',
            description: 'Raw JSON string body (not an object). Example: "ok"'
        };
    }
    return null;
}

function collectPortalQueryResponseProps(form) {
    var props = [];
    var table = form
        ? form.querySelector('#list-region table')
        : document.querySelector('#list-region table');
    if (!table || !table.tHead || !table.tHead.rows.length) {
        return props;
    }

    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th) {
        var key = (th.getAttribute('data-col-key') || '').trim();
        if (!key || key === '__row') {
            return;
        }
        var kind = (th.getAttribute('data-col-type') || '').toLowerCase();
        var typeName = mapPortalQueryColKindToClrType(kind, key);
        var camel = key.charAt(0).toLowerCase() + key.slice(1);
        props.push({
            name: camel,
            type: typeName,
            description: humanizePortalQueryParamName(key) + ' — field on the response DTO.'
        });
    });
    return props;
}

function mapPortalQueryColKindToClrType(kind, key) {
    var k = (kind || '').toLowerCase();
    if (k === 'int' || k === 'id') return 'int';
    if (k === 'money' || k === 'decimal' || k === 'percent') return 'decimal';
    if (k === 'datetime' || k === 'date') return 'DateTime';
    if (k === 'bool') return 'bool';
    if (k === 'guid') return 'Guid';
    if (k === 'thumb' || k === 'file' || k === 'url' || k === 'email' || k === 'phone' || k === 'short' || k === 'large' || k === 'text' || k === 'fk') {
        return 'string';
    }
    var name = (key || '').toLowerCase();
    if (/(percent|percentage)$/.test(name) || /(amount|price|fee|cost|revenue|rate|total)$/.test(name)) return 'decimal';
    if (/(count|quantity|qty|sessions)$/.test(name) || /id$/.test(name)) return 'int';
    if (/(datetime|timestamp)$/.test(name) || /(?:created|updated|deleted|modified)(?:at|date)$/.test(name) || /(?:checkin|checkout)time$/.test(name)) return 'DateTime';
    return 'string';
}

function buildPortalQueryEndpointModalShell() {
    var wrap = document.createElement('div');
    wrap.innerHTML =
        '<div class="modal fade portal-query-endpoint-modal" id="portalQueryEndpointModal" tabindex="-1" role="dialog" aria-labelledby="portalQueryEndpointModalTitle" aria-hidden="true">' +
        '  <div class="modal-dialog modal-dialog-centered modal-lg" role="document">' +
        '    <div class="modal-content portal-query-endpoint-modal__content">' +
        '      <div class="modal-header portal-query-endpoint-modal__header">' +
        '        <div>' +
        '          <p class="portal-query-endpoint-modal__kicker">API</p>' +
        '          <h5 class="modal-title" id="portalQueryEndpointModalTitle">Endpoint details</h5>' +
        '        </div>' +
        '        <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>' +
        '      </div>' +
        '      <div class="modal-body portal-query-endpoint-modal__body">' +
        '        <div class="portal-query-endpoint-modal__route">' +
        '          <span class="portal-query-endpoint-modal__method">GET</span>' +
        '          <code class="portal-query-endpoint-modal__url"></code>' +
        '        </div>' +
        '        <section class="portal-query-endpoint-modal__section" aria-label="Request parameters">' +
        '          <div class="portal-query-endpoint-modal__section-head">' +
        '            <h6 class="portal-query-endpoint-modal__section-title">Parameters</h6>' +
        '          </div>' +
        '          <p class="portal-query-endpoint-modal__intro">Values bound by this Live Report when it calls the module API.</p>' +
        '          <div class="portal-query-endpoint-modal__table-wrap">' +
        '            <table class="portal-query-endpoint-modal__table">' +
        '              <thead><tr><th scope="col">Name</th><th scope="col">In</th><th scope="col">Type</th><th scope="col">Required</th><th scope="col">Description</th></tr></thead>' +
        '              <tbody></tbody>' +
        '            </table>' +
        '          </div>' +
        '        </section>' +
        '        <section class="portal-query-endpoint-modal__section portal-query-endpoint-modal__response" aria-label="Response model">' +
        '          <div class="portal-query-endpoint-modal__section-head">' +
        '            <h6 class="portal-query-endpoint-modal__section-title">Response</h6>' +
        '            <code class="portal-query-endpoint-modal__response-type"></code>' +
        '          </div>' +
        '          <p class="portal-query-endpoint-modal__intro">HTTP 200 — body schema returned by the module API.</p>' +
        '          <div class="portal-query-endpoint-modal__table-wrap">' +
        '            <table class="portal-query-endpoint-modal__table portal-query-endpoint-modal__table--response">' +
        '              <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Description</th></tr></thead>' +
        '              <tbody class="portal-query-endpoint-modal__response-body"></tbody>' +
        '            </table>' +
        '          </div>' +
        '        </section>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    return wrap.firstElementChild;
}

function buildPortalQueryEndpointParamRowsHtml(endpoint, form) {
    var params = parsePortalQueryEndpointParams(endpoint);
    var fieldMeta = collectPortalQueryFieldMeta(form);
    if (!params.length) {
        return '<tr><td colspan="5" class="portal-query-endpoint-modal__empty">No parameters — this endpoint takes no route or query arguments.</td></tr>';
    }

    return params.map(function (p) {
        var meta = fieldMeta[p.name.toLowerCase()] || {};
        var typeName = meta.type || guessPortalQueryParamType(p.name) || 'string';
        var description = meta.label
            ? (meta.label + ' — ' + (p.in === 'Query' ? 'query' : 'path') + ' parameter.')
            : humanizePortalQueryParamName(p.name) + ' — ' + (p.in === 'Query' ? 'Query' : 'Path') + ' parameter.';
        var reqClass = p.required
            ? 'portal-query-endpoint-modal__req portal-query-endpoint-modal__req--yes'
            : 'portal-query-endpoint-modal__req portal-query-endpoint-modal__req--no';
        return '<tr>' +
            '<td><code>' + escapePortalHtml(p.name) + '</code></td>' +
            '<td><span class="portal-query-endpoint-modal__in">' + escapePortalHtml(p.in) + '</span></td>' +
            '<td><span class="portal-query-endpoint-modal__type">' + escapePortalHtml(typeName) + '</span></td>' +
            '<td><span class="' + reqClass + '">' + (p.required ? 'Yes' : 'No') + '</span></td>' +
            '<td>' + escapePortalHtml(description) + '</td>' +
            '</tr>';
    }).join('');
}

function parsePortalQueryEndpointParams(endpoint) {
    var result = [];
    var seen = {};
    var raw = (endpoint || '').trim();
    if (!raw) {
        return result;
    }

    var pathPart = raw;
    var queryPart = '';
    var qIndex = raw.indexOf('?');
    if (qIndex >= 0) {
        pathPart = raw.slice(0, qIndex);
        queryPart = raw.slice(qIndex + 1);
    }

    var pathRe = /\{([^}:]+)(?::[^}]*)?\}/g;
    var m;
    while ((m = pathRe.exec(pathPart)) !== null) {
        var name = m[1].trim();
        if (!name || seen[name.toLowerCase()]) {
            continue;
        }
        seen[name.toLowerCase()] = true;
        result.push({ name: name, in: 'Path', required: true });
    }

    if (queryPart) {
        queryPart.split('&').forEach(function (pair) {
            if (!pair) {
                return;
            }
            var key = pair.split('=')[0] || '';
            var tokenMatch = key.match(/^\{?([^{}=:]+)\}?$/);
            var qName = tokenMatch ? tokenMatch[1].trim() : key.trim();
            // Also accept pageNumber={pageNumber}
            var valueSide = pair.indexOf('=') >= 0 ? pair.slice(pair.indexOf('=') + 1) : '';
            var valueToken = valueSide.match(/^\{([^}:]+)\}/);
            if (valueToken) {
                qName = valueToken[1].trim();
            } else if (key.indexOf('{') >= 0) {
                var keyToken = key.match(/\{([^}:]+)\}/);
                if (keyToken) {
                    qName = keyToken[1].trim();
                }
            }
            if (!qName || seen[qName.toLowerCase()]) {
                return;
            }
            seen[qName.toLowerCase()] = true;
            result.push({ name: qName, in: 'Query', required: false });
        });
    }

    return result;
}

function collectPortalQueryFieldMeta(form) {
    var map = {};
    if (!form) {
        return map;
    }
    form.querySelectorAll('.portal-query-params .form-group, .portal-query-params .form-group.row').forEach(function (group) {
        var labelEl = group.querySelector('label, .col-form-label, .form-label');
        var input = group.querySelector('input, select, textarea');
        if (!input || !input.name) {
            return;
        }
        var name = input.name.replace(/^Model\./, '').replace(/\./g, '');
        var typeName = 'string';
        if (input.tagName === 'SELECT') {
            typeName = 'enum';
        } else if (input.type === 'checkbox') {
            typeName = 'bool';
        } else if (input.type === 'number') {
            typeName = 'number';
        } else if (input.classList.contains('portal-datetime-input') || (input.closest && input.closest('.flatpickr-datetime'))) {
            typeName = 'DateTime';
        } else if (/guid|uuid/i.test(input.name) || (input.placeholder || '').toLowerCase().indexOf('guid') >= 0) {
            typeName = 'Guid';
        }
        map[name.toLowerCase()] = {
            label: labelEl ? (labelEl.textContent || '').trim() : humanizePortalQueryParamName(name),
            type: typeName
        };
    });
    return map;
}

function guessPortalQueryParamType(name) {
    var n = (name || '').toLowerCase();
    if (n === 'pagenumber' || n === 'pagesize') {
        return 'int';
    }
    if (/guid|uuid/.test(n) || /id$/.test(n)) {
        return 'Guid';
    }
    if (/date|time|utc/.test(n)) {
        return 'DateTime';
    }
    if (/^is[A-Z]/.test(name || '') || /(?:^|_)(?:active|enabled|deleted)$/.test(n)) {
        return 'bool';
    }
    return 'string';
}

function humanizePortalQueryParamName(name) {
    return String(name || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^./, function (c) { return c.toUpperCase(); })
        .trim();
}

function escapePortalHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

window.refreshListRegion = refreshListRegion;
window.finishPortalCrudSuccess = finishPortalCrudSuccess;
window.hidePortalEntityModal = hidePortalEntityModal;
window.syncPortalQueryPrintState = syncPortalQueryPrintState;

/** Bootstrap confirm before Delete modal form submit (runs before per-page AJAX handlers). */
var portalPendingDeleteForm = null;

function ensurePortalDeleteConfirmModal() {
    var existing = document.getElementById('portalDeleteConfirmModal');
    // Drop older markup (entity-styled or missing undo warning) so latest copy is used.
    if (existing && (existing.querySelector('.portal-entity-modal')
        || !(existing.textContent || '').includes('cannot be undone'))) {
        existing.remove();
        existing = null;
    }
    if (existing)
        return existing;

    var wrap = document.createElement('div');
    wrap.innerHTML =
        '<div class="modal fade" id="portalDeleteConfirmModal" tabindex="-1" role="dialog" aria-labelledby="portalDeleteConfirmTitle" aria-hidden="true">' +
        '  <div class="modal-dialog" role="document">' +
        '    <div class="modal-content">' +
        '      <div class="modal-header">' +
        '        <h5 class="modal-title" id="portalDeleteConfirmTitle">Confirm delete</h5>' +
        '        <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>' +
        '      </div>' +
        '      <div class="modal-body">' +
        '        <p class="mb-2">Select "Delete" below if you are sure you want to remove this record.</p>' +
        '        <p class="mb-0 small text-muted">This action cannot be undone.</p>' +
        '      </div>' +
        '      <div class="modal-footer">' +
        '        <button class="btn btn-secondary" type="button" data-bs-dismiss="modal">Cancel</button>' +
        '        <button class="btn btn-danger" type="button" id="portalDeleteConfirmOk">Delete</button>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    var modalEl = wrap.firstElementChild;
    document.body.appendChild(modalEl);

    modalEl.querySelector('#portalDeleteConfirmOk').addEventListener('click', function () {
        var form = portalPendingDeleteForm;
        portalPendingDeleteForm = null;
        var instance = (typeof bootstrap !== 'undefined')
            ? bootstrap.Modal.getInstance(modalEl)
            : null;
        if (instance)
            instance.hide();
        else
            $(modalEl).modal('hide');
        if (!form)
            return;
        form.dataset.portalDeleteConfirmed = '1';
        if (typeof $ === 'function')
            $(form).trigger('submit');
        else if (typeof form.requestSubmit === 'function')
            form.requestSubmit();
        else
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    $(modalEl).on('hidden.bs.modal', function () {
        portalPendingDeleteForm = null;
    });

    return modalEl;
}

function showPortalDeleteConfirm() {
    var modalEl = ensurePortalDeleteConfirmModal();
    if (typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    } else {
        $(modalEl).modal('show');
    }
}

/** Live Report / AJAX list forms: honor bc-required before swapping #list-region. */
function isPortalRequiredFieldEmpty(el) {
    if (!el || el.disabled || el.type === 'hidden' || el.type === 'checkbox' || el.type === 'radio') {
        return false;
    }
    var val = el.value == null ? '' : String(el.value).trim();
    return val === '';
}

function validatePortalListForm(form) {
    if (!form) {
        return true;
    }

    form.querySelectorAll('[bc-required="true"], [bc-required="True"]').forEach(function (el) {
        if (!el.disabled) {
            el.setAttribute('required', 'required');
        }
    });

    var firstInvalid = null;
    form.querySelectorAll(
        'input[required], select[required], textarea[required], [bc-required="true"], [bc-required="True"]'
    ).forEach(function (el) {
        if (isPortalRequiredFieldEmpty(el)) {
            el.classList.add('is-invalid');
            if (!firstInvalid) {
                firstInvalid = el;
            }
        } else {
            el.classList.remove('is-invalid');
        }
    });

    if (!firstInvalid) {
        if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
            if (typeof form.reportValidity === 'function') {
                form.reportValidity();
            }
            return false;
        }
        return true;
    }

    try {
        var $el = typeof jQuery === 'function' ? jQuery(firstInvalid) : null;
        if ($el && $el.length && $el.hasClass('searchable-select') && $el.data('select2')) {
            $el.select2('open');
        } else {
            firstInvalid.focus();
        }
    } catch (err) {
        try { firstInvalid.focus(); } catch (e2) { /* ignore */ }
    }

    if (typeof form.reportValidity === 'function') {
        try { form.reportValidity(); } catch (e3) { /* ignore */ }
    }
    if (typeof showPortalToast === 'function') {
        showPortalToast('Please fill in the required parameters.', 'warning');
    }
    return false;
}

document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM')
        return;

    // Query / list pages: keep the shell in place and swap #list-region via AJAX.
    if (form.id === 'formList'
        && document.getElementById('list-region')
        && (form.dataset.listPartialUrl || form.dataset.pagePartialUrl)
        && typeof refreshListRegion === 'function') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!validatePortalListForm(form)) {
            return;
        }
        var hasRun = document.getElementById('HasRun');
        if (hasRun) {
            hasRun.value = 'true';
        }
        refreshListRegion({ noFallbackSubmit: true });
        return;
    }

    var isDeleteForm = form.id === 'formDelete'
        || (form.classList && form.classList.contains('portal-entity-form')
            && form.closest('.portal-entity-modal[data-operation="Delete"]'));
    if (!isDeleteForm)
        return;
    if (form.dataset.portalDeleteConfirmed === '1') {
        delete form.dataset.portalDeleteConfirmed;
        return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    portalPendingDeleteForm = form;
    showPortalDeleteConfirm();
}, true);

/** List CRUD (Detail/Update/Delete/Insert): full-viewport busy veil until modal HTML arrives. */
function showPortalCrudBusy(triggerBtn) {
    document.body.classList.add('portal-crud-busy-open');
    if (!$('body > .portal-crud-busy').length) {
        $('body').append(
            '<div class="portal-crud-busy" role="status" aria-live="polite" aria-busy="true">' +
            '<div class="portal-crud-busy__panel">' +
            '<span class="portal-crud-busy__spinner" aria-hidden="true"></span>' +
            '<span class="portal-crud-busy__label">Loading…</span>' +
            '</div></div>'
        );
    }
    if (triggerBtn) {
        var $btn = $(triggerBtn);
        $btn.addClass('is-busy').prop('disabled', true).attr('aria-busy', 'true');
        var $icon = $btn.find('i').first();
        if ($icon.length && !$icon.data('portal-busy-icon')) {
            $icon.data('portal-busy-icon', $icon.attr('class'));
            $icon.attr('class', 'fas fa-spinner fa-spin');
        }
    }
    $('.opButtonDetail, .opButtonUpdate, .opButtonDelete, .opButtonInsert')
        .not(triggerBtn)
        .prop('disabled', true);
}

function hidePortalCrudBusy(triggerBtn) {
    document.body.classList.remove('portal-crud-busy-open');
    $('body > .portal-crud-busy').remove();
    $('.opButtonDetail, .opButtonUpdate, .opButtonDelete, .opButtonInsert')
        .prop('disabled', false)
        .removeClass('is-busy')
        .removeAttr('aria-busy');
    if (triggerBtn) {
        var $btn = $(triggerBtn);
        var $icon = $btn.find('i').first();
        var prev = $icon.data('portal-busy-icon');
        if (prev) {
            $icon.attr('class', prev);
            $icon.removeData('portal-busy-icon');
        }
    }
}

function enhancePortalEntityForm(root) {
    if (!root)
        return;

    const form = root.querySelector('form.needs-validation, form.portal-entity-form');
    if (form && !form.querySelector('.portal-entity-actions') && !form.querySelector('.portal-entity-footer')) {
        // Collect trailing buttons after fields (Close / Update / Delete / Insert / Clear)
        const trailing = [];
        for (let i = form.children.length - 1; i >= 0; i--) {
            const el = form.children[i];
            if (el.id === 'actionResultDiv')
                continue;
            if (el.matches && el.matches('hr')) {
                el.remove();
                continue;
            }
            const isAction = el.matches && (
                el.matches('button, .btn, a.btn') ||
                (el.classList && (el.classList.contains('float-left') || el.classList.contains('float-right')))
            );
            if (isAction) {
                trailing.unshift(el);
                continue;
            }
            break;
        }

        if (trailing.length) {
            const wrap = document.createElement('div');
            wrap.className = 'portal-entity-footer';
            const actions = document.createElement('div');
            actions.className = 'portal-entity-actions';
            trailing.forEach(function (el) {
                el.classList.remove('float-left', 'float-right');
                actions.appendChild(el);
            });
            wrap.appendChild(actions);
            form.appendChild(wrap);
        }
    }

    pinPortalEntityFooter(root);

    const title = root.querySelector('.modal-title');
    const modalContent = root.querySelector('.modal-content') || root.closest('.modal-content');
    if (title && modalContent) {
        const t = (title.textContent || '').toLowerCase();
        if (t.includes('delete'))
            modalContent.setAttribute('data-operation', 'Delete');
        else if (t.includes('update') || t.includes('edit'))
            modalContent.setAttribute('data-operation', 'Update');
        else if (t.includes('insert') || t.includes('create'))
            modalContent.setAttribute('data-operation', 'Insert');
        else
            modalContent.setAttribute('data-operation', 'Detail');
    }
}

/**
 * Move the action footer out of the scrolling .modal-body so content cannot
 * scroll underneath it. Buttons keep working via the HTML form= attribute.
 */
function pinPortalEntityFooter(root) {
    if (!root)
        return;

    const modalContent = root.querySelector('.modal-content') || root.closest('.modal-content');
    if (!modalContent)
        return;

    const form = root.querySelector('form.needs-validation, form.portal-entity-form')
        || modalContent.querySelector('form.needs-validation, form.portal-entity-form');
    let footer = root.querySelector('.portal-entity-footer')
        || modalContent.querySelector('.portal-entity-footer');

    // Upgrade bare .portal-entity-actions into a footer wrapper
    if (!footer) {
        const actions = (form && form.querySelector(':scope > .portal-entity-actions'))
            || modalContent.querySelector('.modal-body .portal-entity-actions');
        if (!actions)
            return;
        footer = document.createElement('div');
        footer.className = 'portal-entity-footer';
        actions.parentNode.insertBefore(footer, actions);
        footer.appendChild(actions);
    }

    // Already pinned as a direct child of modal-content (sibling of modal-body)
    if (footer.parentElement === modalContent)
        return;

    if (form && form.id) {
        footer.querySelectorAll('button, input[type="submit"], input[type="reset"]').forEach(function (btn) {
            if (!btn.getAttribute('form'))
                btn.setAttribute('form', form.id);
            btn.classList.remove('float-left', 'float-right');
        });
    }

    modalContent.appendChild(footer);
}

var PORTAL_TOAST_STORAGE_KEY = 'portalToastMessage';

function getPortalAjaxErrorPayload(xhr) {
    if (!xhr) {
        return null;
    }
    if (xhr.responseJSON) {
        return xhr.responseJSON;
    }
    if (!xhr.responseText) {
        return null;
    }
    try {
        return JSON.parse(xhr.responseText);
    } catch (e) {
        return null;
    }
}

/** Prefer ProblemDetails.errors[] / detail / message over raw JSON dumps. */
function getPortalAjaxErrorMessage(xhr, fallbackMessage) {
    var payload = getPortalAjaxErrorPayload(xhr);
    if (!payload) {
        return fallbackMessage || (xhr && xhr.statusText) || 'Request failed';
    }

    // Nested ProblemDetails string (e.g. { message: "{...errors...}" })
    if (typeof payload.message === 'string' && payload.message.trim().charAt(0) === '{') {
        try {
            payload = JSON.parse(payload.message);
        } catch (e) {
            // keep original payload
        }
    }

    if (payload.errors && typeof payload.errors === 'object') {
        var parts = [];
        Object.keys(payload.errors).forEach(function (key) {
            var value = payload.errors[key];
            if (Array.isArray(value)) {
                value.forEach(function (item) {
                    if (item) parts.push(String(item));
                });
            } else if (value) {
                parts.push(String(value));
            }
        });
        if (parts.length) {
            return parts.join(' ');
        }
    }

    if (payload.message && typeof payload.message === 'string' && payload.message.trim().charAt(0) !== '{') {
        return payload.message;
    }
    if (payload.Message && typeof payload.Message === 'string' && payload.Message.trim().charAt(0) !== '{') {
        return payload.Message;
    }
    if (payload.detail && typeof payload.detail === 'string') {
        return payload.detail;
    }
    if (payload.title && typeof payload.title === 'string') {
        var title = payload.title;
        if (/error occurred while processing your request/i.test(title)) {
            return fallbackMessage || 'An unexpected error occurred. Please try again.';
        }
        return title;
    }

    return fallbackMessage || (xhr && xhr.statusText) || 'Request failed';
}

/** True when an AJAX response body is the portal login page (e.g. cookie 302 followed by XHR). */
function isPortalLoginHtml(data) {
    if (typeof data !== 'string' || !data) {
        return false;
    }
    return data.indexOf('auth-card') !== -1
        && (data.indexOf('auth-form') !== -1 || data.indexOf('login-password') !== -1);
}

/**
 * Shared portal AJAX failure handling.
 * Session expiry / unauthorized → login. Other errors → toast (+ optional page reload).
 * @returns {boolean} true when redirected to login
 */
function handlePortalAjaxError(xhr, options) {
    options = options || {};
    if (xhr && xhr.portalErrorHandled) {
        return !!xhr.portalAuthRedirect;
    }
    if (xhr) {
        xhr.portalErrorHandled = true;
    }

    var payload = getPortalAjaxErrorPayload(xhr);
    var redirectUrl = (payload && payload.redirectUrl) || null;
    var responseText = xhr && typeof xhr.responseText === 'string' ? xhr.responseText : '';
    // 401 (legacy) or 403+redirectUrl (session expiry — avoids native browser auth prompts)
    var isAuth = (xhr && xhr.status === 401)
        || !!redirectUrl
        || (payload && payload.statusCode === 401)
        || isPortalLoginHtml(responseText);

    if (isAuth) {
        if (xhr) {
            xhr.portalAuthRedirect = true;
        }
        window.location = redirectUrl || '/Login/Index';
        return true;
    }

    var msg = getPortalAjaxErrorMessage(xhr, options.fallbackMessage);

    if (options.reload) {
        queuePortalToast(msg, 'error');
        document.location.reload(true);
    } else if (typeof showPortalToast === 'function') {
        showPortalToast(msg, 'error');
    }

    return false;
}

function showPortalToast(message, type) {
    if (!message) {
        return;
    }

    var toastEl = document.getElementById('portalToast');
    var toastBody = document.getElementById('portalToastBody');
    var toastIcon = document.getElementById('portalToastIcon');
    if (!toastEl || !toastBody) {
        return;
    }

    var toastType = (type || 'success').toLowerCase();
    toastEl.classList.remove(
        'text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-info',
        'portal-toast--success', 'portal-toast--error');

    var iconClass = 'fas fa-check-circle';
    if (toastType === 'error' || toastType === 'danger') {
        toastEl.classList.add('text-bg-danger', 'portal-toast--error');
        iconClass = 'fas fa-exclamation-circle';
    } else if (toastType === 'warning') {
        toastEl.classList.add('text-bg-warning');
        iconClass = 'fas fa-exclamation-triangle';
    } else if (toastType === 'info') {
        toastEl.classList.add('text-bg-info');
        iconClass = 'fas fa-info-circle';
    } else {
        toastEl.classList.add('text-bg-success', 'portal-toast--success');
        iconClass = 'fas fa-check-circle';
    }

    if (toastIcon) {
        toastIcon.className = iconClass;
    }

    toastBody.textContent = message;

    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        var toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 6000, autohide: true });
        toast.show();
    } else if (typeof $.fn.toast !== 'undefined') {
        $(toastEl).toast({ delay: 6000, autohide: true }).toast('show');
    }
}

function queuePortalToast(message, type) {
    if (!message || typeof sessionStorage === 'undefined') {
        return;
    }

    try {
        sessionStorage.setItem(PORTAL_TOAST_STORAGE_KEY, JSON.stringify({
            message: message,
            type: type || 'success'
        }));
    } catch (e) {
        // Ignore storage failures (private mode / quota).
    }
}

function consumeQueuedPortalToast() {
    if (typeof sessionStorage === 'undefined') {
        return;
    }

    try {
        var raw = sessionStorage.getItem(PORTAL_TOAST_STORAGE_KEY);
        if (!raw) {
            return;
        }
        sessionStorage.removeItem(PORTAL_TOAST_STORAGE_KEY);
        var payload = JSON.parse(raw);
        if (payload && payload.message) {
            showPortalToast(payload.message, payload.type || 'success');
        }
    } catch (e) {
        sessionStorage.removeItem(PORTAL_TOAST_STORAGE_KEY);
    }
}

function getPortalCrudSuccessMessage(operation) {
    switch ((operation || '').toLowerCase()) {
        case 'update':
            return 'Record updated successfully.';
        case 'delete':
            return 'Record deleted successfully.';
        case 'insert':
            return 'Record created successfully.';
        default:
            return 'Operation completed successfully.';
    }
}

function initPortalModuleCombo() {
    var form = document.querySelector('.portal-topbar-filter');
    var select = document.getElementById('selectedModule');
    if (!form || !select || form.dataset.comboReady === '1') {
        return;
    }
    form.dataset.comboReady = '1';

    var control = form.querySelector('.portal-topbar-filter__control');
    if (!control) {
        return;
    }

    if (!form.querySelector('.portal-topbar-filter__copy')) {
        var copy = document.createElement('span');
        copy.className = 'portal-topbar-filter__copy';
        copy.innerHTML = '<span class="portal-topbar-filter__kicker">Module</span>'
            + '<span class="portal-topbar-filter__value" data-module-combo-value></span>';
        var icon = control.querySelector('.portal-topbar-filter__icon');
        if (icon && icon.nextSibling) {
            control.insertBefore(copy, icon.nextSibling);
        } else {
            control.appendChild(copy);
        }
    }

    if (!form.querySelector('.portal-topbar-filter__caret')) {
        var caret = document.createElement('i');
        caret.className = 'fas fa-chevron-down portal-topbar-filter__caret';
        caret.setAttribute('aria-hidden', 'true');
        control.appendChild(caret);
    }

    var trigger = form.querySelector('.portal-topbar-filter__trigger');
    if (!trigger) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'portal-topbar-filter__trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Choose module');
        control.appendChild(trigger);
    }

    var menu = form.querySelector('.portal-topbar-filter__menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.className = 'portal-topbar-filter__menu';
        menu.innerHTML = '<div class="portal-topbar-filter__search">'
            + '<i class="fas fa-search portal-topbar-filter__search-icon" aria-hidden="true"></i>'
            + '<input type="search" placeholder="Search modules" autocomplete="off" />'
            + '</div><ul class="portal-topbar-filter__list" role="listbox"></ul>';
        form.appendChild(menu);
    }

    var valueEl = form.querySelector('[data-module-combo-value]');
    var list = menu.querySelector('.portal-topbar-filter__list');
    var search = menu.querySelector('input');
    var options = Array.from(select.options).map(function (opt) {
        return { value: opt.value, label: opt.textContent.trim() };
    });

    var syncValue = function () {
        var selected = options.find(function (o) { return o.value === select.value; }) || options[0];
        if (valueEl && selected) {
            valueEl.textContent = selected.label;
        }
        list.querySelectorAll('.portal-topbar-filter__option').forEach(function (btn) {
            btn.classList.toggle('is-selected', btn.getAttribute('data-value') === select.value);
        });
    };

    var renderList = function (query) {
        var q = (query || '').trim().toLowerCase();
        var matches = options.filter(function (o) {
            return !q || o.label.toLowerCase().indexOf(q) !== -1;
        });
        list.innerHTML = '';
        if (!matches.length) {
            var empty = document.createElement('li');
            empty.className = 'portal-topbar-filter__empty';
            empty.textContent = 'No modules found';
            list.appendChild(empty);
            return;
        }
        matches.forEach(function (item) {
            var li = document.createElement('li');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'portal-topbar-filter__option' + (item.value === select.value ? ' is-selected' : '');
            btn.setAttribute('data-value', item.value);
            btn.setAttribute('role', 'option');
            btn.innerHTML = '<span></span><i class="fas fa-check portal-topbar-filter__option-check" aria-hidden="true"></i>';
            btn.querySelector('span').textContent = item.label;
            btn.addEventListener('click', function () {
                if (select.value !== item.value) {
                    select.value = item.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                syncValue();
                closeMenu();
            });
            li.appendChild(btn);
            list.appendChild(li);
        });
    };

    var openMenu = function () {
        form.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        renderList(search.value);
        setTimeout(function () { search.focus(); }, 0);
    };

    var closeMenu = function () {
        form.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        search.value = '';
    };

    trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (form.classList.contains('is-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    search.addEventListener('input', function () {
        renderList(search.value);
    });

    document.addEventListener('click', function (e) {
        if (!form.contains(e.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && form.classList.contains('is-open')) {
            closeMenu();
            trigger.focus();
        }
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
    });

    renderList('');
    syncValue();
}

function initPortalAccountMenu() {
    var btn = document.querySelector('.portal-topbar-user-btn');
    var menu = document.querySelector('.portal-topbar-user-menu');
    if (!btn || !menu) {
        return;
    }

    if (!menu.querySelector('.portal-topbar-user-menu__profile')) {
        var source = btn.querySelector('.portal-user-top');
        if (source) {
            var profile = document.createElement('li');
            profile.className = 'portal-topbar-user-menu__profile';
            profile.appendChild(source.cloneNode(true));

            var dividerItem = document.createElement('li');
            var divider = document.createElement('hr');
            divider.className = 'dropdown-divider portal-topbar-user-menu__divider';
            dividerItem.appendChild(divider);

            menu.insertBefore(dividerItem, menu.firstChild);
            menu.insertBefore(profile, menu.firstChild);
        }
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Dropdown) {
        bootstrap.Dropdown.getOrCreateInstance(btn, {
            autoClose: true,
            display: 'static'
        });
    }
}

function validatePasswordPolicy(password) {
    if (!password || password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    if (password.length > 100) {
        return 'Password cannot exceed 100 characters.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter.';
    }
    if (!/\d/.test(password)) {
        return 'Password must contain at least one number.';
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return 'Password must contain at least one symbol.';
    }
    return '';
}

function initChangePasswordForm() {
    var form = document.getElementById('changePasswordForm');
    var modalEl = document.getElementById('changePasswordModal');
    if (!form || !modalEl) {
        return;
    }

    var oldInput = document.getElementById('changePasswordOld');
    var newInput = document.getElementById('changePasswordNew');
    var confirmInput = document.getElementById('changePasswordConfirm');
    var errorEl = document.getElementById('changePasswordError');
    var submitBtn = document.getElementById('changePasswordSubmit');
    var pendingToast = null;

    function setError(message) {
        if (!errorEl) {
            return;
        }
        if (!message) {
            errorEl.classList.add('d-none');
            errorEl.textContent = '';
            return;
        }
        errorEl.textContent = message;
        errorEl.classList.remove('d-none');
    }

    function resetForm() {
        form.reset();
        setError('');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }

    modalEl.addEventListener('hidden.bs.modal', function () {
        resetForm();
        if (pendingToast && typeof showPortalToast === 'function') {
            showPortalToast(pendingToast.message, pendingToast.type || 'success');
            pendingToast = null;
        }
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        setError('');

        var oldPassword = (oldInput && oldInput.value) || '';
        var newPassword = (newInput && newInput.value) || '';
        var confirmPassword = (confirmInput && confirmInput.value) || '';

        if (!oldPassword || !newPassword) {
            setError('Current password and new password are required.');
            return;
        }
        var policyError = validatePasswordPolicy(newPassword);
        if (policyError) {
            setError(policyError);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match.');
            return;
        }
        if (oldPassword === newPassword) {
            setError('New password must be different from the current password.');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
        }

        $.ajax({
            url: '/Login/ChangePassword',
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({
                oldPassword: oldPassword,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            })
        }).done(function (data) {
            var ok = data && (data.success === true || data.Success === true);
            var message = (data && (data.message || data.Message))
                || 'Your password has been changed. A confirmation email was sent to your address.';
            if (!ok) {
                setError(message);
                if (submitBtn) {
                    submitBtn.disabled = false;
                }
                return;
            }
            pendingToast = { message: message, type: 'success' };
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                bootstrap.Modal.getOrCreateInstance(modalEl).hide();
            } else if (typeof showPortalToast === 'function') {
                showPortalToast(message, 'success');
                pendingToast = null;
            }
        }).fail(function (xhr) {
            var payload = xhr.responseJSON || {};
            var message = payload.message || payload.Message
                || 'Could not change password. Please try again.';
            if (payload.redirectUrl || payload.RedirectUrl) {
                window.location.href = payload.redirectUrl || payload.RedirectUrl;
                return;
            }
            setError(message);
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        });
    });
}

function init() {
    // Bootstrap 5 popover initialization
    if (typeof bootstrap !== 'undefined') {
        const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
        [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
        // Also support legacy data-toggle for backward compatibility
        const legacyPopoverList = document.querySelectorAll('[data-toggle="popover"]');
        [...legacyPopoverList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    } else if (typeof $.fn.popover !== 'undefined') {
        // Fallback for Bootstrap 4 or jQuery popover
        $('[data-toggle="popover"]').popover();
        $('[data-bs-toggle="popover"]').popover();
    }
    consumeQueuedPortalToast();
    initPortalAccountMenu();
    initChangePasswordForm();
    initPortalModuleCombo();
    const placeholderElement = $('#itemDetailsContainer');
    // Select2 first — before Flatpickr — so combos do not sit unenhanced for long.
    initSearchableSelects(document);
    initFlatpickrModalFix();
    initDatePickers(document);

    $('button[data-toggle="ajax-modal"]').click(function (event) {
        let url = $(this).data('url');
        $.get(url).done(function (data) {
            placeholderElement.html(data);
            // Bootstrap 5 compatible modal show
            var modalElement = placeholderElement.find('.modal')[0];
            if (modalElement && typeof bootstrap !== 'undefined') {
                var modal = new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                placeholderElement.find('.modal').modal('show');
            }
            initDatePickers(placeholderElement[0]);
        });
    });

    placeholderElement.on('click', '[data-save="modal"]', function (event) {
        event.preventDefault();

        let form = $(this).parents('.modal').find('form');
        let actionUrl = form.attr('action');
        let dataToSend = form.serialize();

        $.post(actionUrl, dataToSend).done(function (data) {
            let isValid = placeholderElement.find('[name="IsValid"]').val() === 'True';
            if (isValid) {
                // Bootstrap 5 compatible modal hide
                var modalElement = placeholderElement.find('.modal')[0];
                if (modalElement && typeof bootstrap !== 'undefined') {
                    var modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    }
                } else {
                    placeholderElement.find('.modal').modal('hide');
                }
            }
        });
    });

    // Immersive image / PDF / video lightbox (BS5-safe; replaces ekko-lightbox).
    $(document).on('click', '[data-toggle="lightbox"]', function (event) {
        event.preventDefault();
        event.stopPropagation();
        // Prevent page-level ekko-lightbox handlers from also opening a Bootstrap modal veil.
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
        var href = $(this).attr('href');
        if (!href) {
            return;
        }
        var type = (($(this).attr('data-type') || 'image') + '').toLowerCase();
        if (type === 'pdf') {
            openPortalPdfLightbox(href);
            return;
        }
        if (type === 'video') {
            openPortalVideoLightbox(href);
            return;
        }
        openPortalImageLightbox(href);
    });

    // Client-side max size for BLOB_* / IMAGE uploads (server still enforces).
    $(document).on('change', 'input[type="file"][data-max-bytes]', function () {
        var input = this;
        var maxBytes = parseInt(input.getAttribute('data-max-bytes') || '0', 10);
        if (!maxBytes || !input.files || !input.files.length) {
            return;
        }
        var file = input.files[0];
        if (file.size <= maxBytes) {
            return;
        }
        var maxMb = Math.round(maxBytes / (1024 * 1024));
        var sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        input.value = '';
        window.alert('File is too large (' + sizeMb + ' MB). Maximum allowed is ' + maxMb + ' MB.');
    });

    bindPortalModalStack();
}

// Nested modals (e.g. Kafka workflow list → detail): BS keeps every backdrop at 1040,
// so only the first blur shows. Raise each modal/backdrop pair so the top veil covers the one below.
var portalModalStackBound = false;

function syncPortalModalStack(openingModal) {
    var openModals = Array.prototype.slice.call(document.querySelectorAll('.modal.show'));
    if (openingModal && openModals.indexOf(openingModal) === -1) {
        openModals.push(openingModal);
    }

    var backdrops = Array.prototype.slice.call(document.querySelectorAll('body > .modal-backdrop'));

    openModals.forEach(function (modal, index) {
        modal.style.zIndex = String(1055 + (index * 20));
        modal.classList.toggle('portal-modal-behind', index < openModals.length - 1);
    });

    backdrops.forEach(function (backdrop, index) {
        backdrop.style.zIndex = String(1050 + (index * 20));
        backdrop.classList.toggle('portal-backdrop-nested', index > 0);
    });
}

function schedulePortalModalStackSync(openingModal) {
    syncPortalModalStack(openingModal);
    // Backdrop is inserted just after show starts — catch it before fade finishes.
    window.requestAnimationFrame(function () {
        syncPortalModalStack(openingModal);
        window.requestAnimationFrame(function () {
            syncPortalModalStack(openingModal);
        });
    });
}

function bindPortalModalStack() {
    if (portalModalStackBound) {
        return;
    }
    portalModalStackBound = true;

    $(document).on('show.bs.modal.portalStack', '.modal', function () {
        var openCount = document.querySelectorAll('.modal.show').length;
        this.style.zIndex = String(1055 + (openCount * 20));
        // Dim parents immediately — waiting for shown.bs.modal felt like a late blur.
        document.querySelectorAll('.modal.show').forEach(function (modal) {
            modal.classList.add('portal-modal-behind');
        });
        schedulePortalModalStackSync(this);
    });

    $(document).on('shown.bs.modal.portalStack', '.modal', function () {
        syncPortalModalStack();
    });

    $(document).on('hidden.bs.modal.portalStack', '.modal', function () {
        this.style.zIndex = '';
        this.classList.remove('portal-modal-behind');
        window.setTimeout(syncPortalModalStack, 10);
    });
}

var portalLightboxState = {
    scale: 1,
    x: 0,
    y: 0,
    min: 1,
    max: 6,
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pointers: new Map(),
    pinchStartDist: 0,
    pinchStartScale: 1,
    pointerOnImage: false,
    pointerAlt: false
};

function ensurePortalImageLightbox() {
    var root = document.getElementById('portalImageLightbox');
    if (root) {
        return root;
    }

    document.body.insertAdjacentHTML('beforeend',
        '<div id="portalImageLightbox" class="portal-lightbox" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="Image preview">' +
        '  <div class="portal-lightbox__veil" data-portal-lightbox-close="1"></div>' +
        '  <button type="button" class="portal-lightbox__close" data-portal-lightbox-close="1" aria-label="Close preview">' +
        '    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        '  </button>' +
        '  <div class="portal-lightbox__toolbar" role="toolbar" aria-label="Zoom controls">' +
        '    <button type="button" class="portal-lightbox__tool" data-portal-lightbox-zoom="-1" title="Zoom out" aria-label="Zoom out">' +
        '      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        '    </button>' +
        '    <span class="portal-lightbox__zoom-label" id="portalImageLightboxZoom" title="Click image to zoom in · Alt-click to zoom out">100%</span>' +
        '    <button type="button" class="portal-lightbox__tool" data-portal-lightbox-zoom="1" title="Zoom in" aria-label="Zoom in">' +
        '      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        '    </button>' +
        '    <button type="button" class="portal-lightbox__tool" data-portal-lightbox-zoom="reset" title="Reset zoom" aria-label="Reset zoom">' +
        '      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '    </button>' +
        '  </div>' +
        '  <figure class="portal-lightbox__stage">' +
        '    <div class="portal-lightbox__frame">' +
        '      <div class="portal-lightbox__viewport">' +
        '        <img id="portalImageLightboxImg" class="portal-lightbox__img" alt="" draggable="false" />' +
        '      </div>' +
        '      <div class="portal-lightbox__shine" aria-hidden="true"></div>' +
        '    </div>' +
        '  </figure>' +
        '</div>');

    root = document.getElementById('portalImageLightbox');
    bindPortalLightboxInteractions(root);
    return root;
}

function syncPortalLightboxAltCursor(e) {
    var root = document.getElementById('portalImageLightbox');
    if (!root || root.hasAttribute('hidden')) {
        return;
    }
    var alt = !!(e && e.altKey);
    root.classList.toggle('is-alt-zoom', alt);
}

function bindPortalLightboxInteractions(root) {
    if (root.dataset.portalLightboxBound === '1') {
        return;
    }
    root.dataset.portalLightboxBound = '1';

    var viewport = root.querySelector('.portal-lightbox__viewport');
    var img = document.getElementById('portalImageLightboxImg');
    var suppressClickUntil = 0;

    root.addEventListener('click', function (e) {
        var zoomEl = e.target && e.target.closest
            ? e.target.closest('[data-portal-lightbox-zoom]')
            : null;
        var zoomAction = zoomEl && zoomEl.getAttribute('data-portal-lightbox-zoom');
        if (zoomAction === '1' || zoomAction === '-1') {
            nudgePortalLightboxZoom(Number(zoomAction) > 0 ? 0.25 : -0.25);
            return;
        }
        if (zoomAction === 'reset') {
            resetPortalLightboxZoom();
            return;
        }
        // Click may land on the SVG/path inside the close button — use closest.
        if (e.target && e.target.closest && e.target.closest('[data-portal-lightbox-close="1"]')) {
            closePortalImageLightbox();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (!root || root.hasAttribute('hidden')) {
            return;
        }
        syncPortalLightboxAltCursor(e);
        if (e.key === 'Escape') {
            closePortalImageLightbox();
        } else if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            nudgePortalLightboxZoom(0.25);
        } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            nudgePortalLightboxZoom(-0.25);
        } else if (e.key === '0') {
            e.preventDefault();
            resetPortalLightboxZoom();
        }
    });

    document.addEventListener('keyup', syncPortalLightboxAltCursor);
    document.addEventListener('mousemove', function (e) {
        if (!root || root.hasAttribute('hidden')) {
            return;
        }
        syncPortalLightboxAltCursor(e);
    });

    if (!viewport || !img) {
        return;
    }

    viewport.addEventListener('wheel', function (e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.12 : 0.12;
        setPortalLightboxZoom(portalLightboxState.scale + delta, e.clientX, e.clientY);
    }, { passive: false });

    // Double-click image → reset zoom (single click still zooms via pointerup).
    img.addEventListener('dblclick', function (e) {
        e.preventDefault();
        e.stopPropagation();
        suppressClickUntil = Date.now() + 350;
        resetPortalLightboxZoom();
    });

    viewport.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) {
            return;
        }
        syncPortalLightboxAltCursor(e);
        portalLightboxState.pointerOnImage = (e.target === img);
        portalLightboxState.pointerAlt = !!e.altKey;
        viewport.setPointerCapture(e.pointerId);
        portalLightboxState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        portalLightboxState.moved = false;

        if (portalLightboxState.pointers.size === 1) {
            // Pan only when zoomed content overflows the viewport and gesture started on the image.
            portalLightboxState.dragging = portalLightboxState.pointerOnImage && portalLightboxCanPan() && !e.altKey;
            portalLightboxState.startX = e.clientX;
            portalLightboxState.startY = e.clientY;
            portalLightboxState.originX = portalLightboxState.x;
            portalLightboxState.originY = portalLightboxState.y;
            viewport.classList.toggle('is-dragging', portalLightboxState.dragging);
        } else if (portalLightboxState.pointers.size === 2) {
            portalLightboxState.dragging = false;
            var pts = Array.from(portalLightboxState.pointers.values());
            portalLightboxState.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            portalLightboxState.pinchStartScale = portalLightboxState.scale;
        }
    });

    viewport.addEventListener('pointermove', function (e) {
        if (!portalLightboxState.pointers.has(e.pointerId)) {
            return;
        }
        portalLightboxState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (portalLightboxState.pointers.size === 2) {
            var pts = Array.from(portalLightboxState.pointers.values());
            var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (portalLightboxState.pinchStartDist > 0) {
                var next = portalLightboxState.pinchStartScale * (dist / portalLightboxState.pinchStartDist);
                var midX = (pts[0].x + pts[1].x) / 2;
                var midY = (pts[0].y + pts[1].y) / 2;
                setPortalLightboxZoom(next, midX, midY);
            }
            return;
        }

        if (!portalLightboxState.dragging) {
            return;
        }
        var dx = e.clientX - portalLightboxState.startX;
        var dy = e.clientY - portalLightboxState.startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) {
            portalLightboxState.moved = true;
        }
        portalLightboxState.x = portalLightboxState.originX + dx;
        portalLightboxState.y = portalLightboxState.originY + dy;
        applyPortalLightboxTransform();
    });

    function endPointer(e) {
        var wasOnImage = portalLightboxState.pointerOnImage;
        var wasAlt = portalLightboxState.pointerAlt || !!(e && e.altKey);
        var wasMoved = portalLightboxState.moved;
        var pointerCountBefore = portalLightboxState.pointers.size;

        if (portalLightboxState.pointers.has(e.pointerId)) {
            portalLightboxState.pointers.delete(e.pointerId);
        }
        if (portalLightboxState.pointers.size < 2) {
            portalLightboxState.pinchStartDist = 0;
        }
        if (portalLightboxState.pointers.size === 0) {
            portalLightboxState.dragging = false;
            viewport.classList.remove('is-dragging');
        }

        // Single-pointer tap (not a drag / pinch): image zooms, outside closes.
        if (pointerCountBefore !== 1 || portalLightboxState.pointers.size !== 0) {
            return;
        }
        if (wasMoved || Date.now() < suppressClickUntil) {
            return;
        }
        if (e.button !== undefined && e.button !== 0) {
            return;
        }

        if (wasOnImage || e.target === img) {
            var delta = wasAlt ? -0.25 : 0.25;
            setPortalLightboxZoom(portalLightboxState.scale + delta, e.clientX, e.clientY);
            return;
        }

        closePortalImageLightbox();
    }

    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);
    viewport.addEventListener('lostpointercapture', endPointer);
}

function getPortalLightboxPanLimits() {
    var img = document.getElementById('portalImageLightboxImg');
    var viewport = document.querySelector('#portalImageLightbox .portal-lightbox__viewport');
    if (!img || !viewport) {
        return { maxX: 0, maxY: 0 };
    }

    var scaledW = img.offsetWidth * portalLightboxState.scale;
    var scaledH = img.offsetHeight * portalLightboxState.scale;
    return {
        maxX: Math.max(0, (scaledW - viewport.clientWidth) / 2),
        maxY: Math.max(0, (scaledH - viewport.clientHeight) / 2)
    };
}

function clampPortalLightboxPan() {
    var limits = getPortalLightboxPanLimits();
    portalLightboxState.x = Math.min(limits.maxX, Math.max(-limits.maxX, portalLightboxState.x));
    portalLightboxState.y = Math.min(limits.maxY, Math.max(-limits.maxY, portalLightboxState.y));
    return limits;
}

function portalLightboxCanPan() {
    var limits = getPortalLightboxPanLimits();
    return limits.maxX > 0.5 || limits.maxY > 0.5;
}

function applyPortalLightboxTransform() {
    var img = document.getElementById('portalImageLightboxImg');
    var root = document.getElementById('portalImageLightbox');
    var label = document.getElementById('portalImageLightboxZoom');
    if (!img) {
        return;
    }

    clampPortalLightboxPan();
    img.style.transform = 'translate(' + portalLightboxState.x + 'px, ' + portalLightboxState.y + 'px) scale(' + portalLightboxState.scale + ')';
    if (label) {
        label.textContent = Math.round(portalLightboxState.scale * 100) + '%';
    }
    if (root) {
        // Grab cursor only when there is overflow to pan inside the viewport.
        root.classList.toggle('is-zoomed', portalLightboxCanPan());
    }
}

function setPortalLightboxZoom(nextScale, clientX, clientY) {
    var img = document.getElementById('portalImageLightboxImg');
    var viewport = document.querySelector('#portalImageLightbox .portal-lightbox__viewport');
    if (!img || !viewport) {
        return;
    }

    var prev = portalLightboxState.scale;
    var next = Math.min(portalLightboxState.max, Math.max(portalLightboxState.min, nextScale));
    if (Math.abs(next - prev) < 0.001) {
        applyPortalLightboxTransform();
        return;
    }

    if (typeof clientX === 'number' && typeof clientY === 'number') {
        var rect = viewport.getBoundingClientRect();
        var cx = clientX - rect.left - rect.width / 2;
        var cy = clientY - rect.top - rect.height / 2;
        var ratio = next / prev;
        portalLightboxState.x = cx - (cx - portalLightboxState.x) * ratio;
        portalLightboxState.y = cy - (cy - portalLightboxState.y) * ratio;
    }

    portalLightboxState.scale = next;
    if (next <= 1.001) {
        portalLightboxState.x = 0;
        portalLightboxState.y = 0;
        portalLightboxState.scale = 1;
    }
    applyPortalLightboxTransform();
}

function nudgePortalLightboxZoom(delta) {
    setPortalLightboxZoom(portalLightboxState.scale + delta);
}

function resetPortalLightboxZoom() {
    portalLightboxState.scale = 1;
    portalLightboxState.x = 0;
    portalLightboxState.y = 0;
    applyPortalLightboxTransform();
}

function lockPortalLightboxBody() {
    // Compensate scrollbar width before overflow:hidden so the page does not jump/shake.
    var gutter = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty('--portal-scrollbar-compensation', gutter + 'px');
    document.documentElement.classList.add('portal-lightbox-open');
    document.body.classList.add('portal-lightbox-open');
}

function markPortalImageLightboxReady(frame) {
    if (!frame) {
        return;
    }
    frame.classList.remove('is-loading');
    frame.classList.add('is-ready');
}

function openPortalImageLightbox(href) {
    var root = ensurePortalImageLightbox();
    var img = document.getElementById('portalImageLightboxImg');
    var frame = root.querySelector('.portal-lightbox__frame');

    if (typeof closePortalPdfLightbox === 'function') {
        closePortalPdfLightbox();
    }
    if (typeof closePortalVideoLightbox === 'function') {
        closePortalVideoLightbox();
    }

    resetPortalLightboxZoom();
    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', 'false');
    lockPortalLightboxBody();

    if (frame) {
        frame.classList.remove('is-ready');
        frame.classList.add('is-loading');
    }

    function finishReady() {
        markPortalImageLightboxReady(frame);
        resetPortalLightboxZoom();
    }

    img.onload = function () {
        // decode() waits for pixels so we never flash a blank/black frame.
        if (img.decode) {
            img.decode().then(finishReady).catch(finishReady);
        } else {
            finishReady();
        }
    };
    img.onerror = function () {
        markPortalImageLightboxReady(frame);
    };

    void root.offsetWidth;
    root.classList.add('is-open');
    img.alt = 'Preview';

    // Force a fresh load even when the browser has the same URL cached
    // (otherwise onload may not fire and the image stays opacity:0 → black screen).
    if (img.getAttribute('src') === href) {
        img.removeAttribute('src');
    }
    img.src = href;

    if (img.complete && img.naturalWidth > 0) {
        finishReady();
    }

    var closeBtn = root.querySelector('.portal-lightbox__close');
    if (closeBtn) {
        closeBtn.focus({ preventScroll: true });
    }
}

function isPortalLightboxVisible(id) {
    var el = document.getElementById(id);
    return !!(el && !el.hasAttribute('hidden'));
}

function releasePortalLightboxBodyLock() {
    if (isPortalLightboxVisible('portalImageLightbox')
        || isPortalLightboxVisible('portalPdfLightbox')
        || isPortalLightboxVisible('portalVideoLightbox')) {
        return;
    }
    document.documentElement.classList.remove('portal-lightbox-open');
    document.body.classList.remove('portal-lightbox-open');
    document.documentElement.style.removeProperty('--portal-scrollbar-compensation');
    if ($('#itemDetailsModal').hasClass('show')) {
        $('body').addClass('modal-open');
    }
}

function closePortalImageLightbox() {
    var root = document.getElementById('portalImageLightbox');
    if (!root || root.hasAttribute('hidden')) {
        return;
    }

    root.classList.remove('is-alt-zoom');
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');

    var img = document.getElementById('portalImageLightboxImg');
    if (img) {
        img.removeAttribute('src');
        img.alt = '';
        img.style.transform = '';
    }
    resetPortalLightboxZoom();
    root.setAttribute('hidden', '');
    releasePortalLightboxBodyLock();
}

function ensurePortalPdfLightbox() {
    var root = document.getElementById('portalPdfLightbox');
    if (root) {
        return root;
    }

    document.body.insertAdjacentHTML('beforeend',
        '<div id="portalPdfLightbox" class="portal-lightbox portal-lightbox--pdf" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="PDF preview">' +
        '  <div class="portal-lightbox__veil" data-portal-pdf-close="1"></div>' +
        '  <button type="button" class="portal-lightbox__close" data-portal-pdf-close="1" aria-label="Close preview">' +
        '    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        '  </button>' +
        '  <div class="portal-lightbox__toolbar portal-lightbox__toolbar--pdf" role="toolbar" aria-label="PDF controls">' +
        '    <a id="portalPdfLightboxOpen" class="portal-lightbox__tool portal-lightbox__tool-link" href="#" target="_blank" rel="noopener noreferrer">Open in new tab</a>' +
        '  </div>' +
        '  <figure class="portal-lightbox__stage portal-lightbox__stage--pdf">' +
        '    <div class="portal-lightbox__frame portal-lightbox__frame--pdf is-loading">' +
        '      <iframe id="portalPdfLightboxFrame" class="portal-lightbox__pdf" title="PDF preview" loading="lazy"></iframe>' +
        '    </div>' +
        '  </figure>' +
        '</div>');

    root = document.getElementById('portalPdfLightbox');
    root.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-portal-pdf-close="1"]')) {
            closePortalPdfLightbox();
        }
    });
    document.addEventListener('keydown', function (e) {
        if (!root || root.hasAttribute('hidden')) {
            return;
        }
        if (e.key === 'Escape') {
            closePortalPdfLightbox();
        }
    });
    return root;
}

function openPortalPdfLightbox(href) {
    var root = ensurePortalPdfLightbox();
    var frame = document.getElementById('portalPdfLightboxFrame');
    var openLink = document.getElementById('portalPdfLightboxOpen');
    var shell = root.querySelector('.portal-lightbox__frame--pdf');

    closePortalImageLightbox();
    if (typeof closePortalVideoLightbox === 'function') {
        closePortalVideoLightbox();
    }

    if (openLink) {
        openLink.href = href;
    }
    if (shell) {
        shell.classList.add('is-loading');
        shell.classList.remove('is-ready');
    }

    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', 'false');
    lockPortalLightboxBody();

    frame.onload = function () {
        if (shell) {
            shell.classList.remove('is-loading');
            shell.classList.add('is-ready');
        }
    };
    frame.onerror = function () {
        if (shell) {
            shell.classList.remove('is-loading');
            shell.classList.add('is-ready');
        }
    };

    // Some browsers need #toolbar=0 hints; keep source clean for public blob URLs.
    frame.src = href;

    void root.offsetWidth;
    root.classList.add('is-open');

    var closeBtn = root.querySelector('.portal-lightbox__close');
    if (closeBtn) {
        closeBtn.focus({ preventScroll: true });
    }
}

function closePortalPdfLightbox() {
    var root = document.getElementById('portalPdfLightbox');
    if (!root || root.hasAttribute('hidden')) {
        return;
    }

    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');

    window.setTimeout(function () {
        var frame = document.getElementById('portalPdfLightboxFrame');
        if (frame) {
            frame.removeAttribute('src');
        }
        var shell = root.querySelector('.portal-lightbox__frame--pdf');
        if (shell) {
            shell.classList.remove('is-ready');
            shell.classList.add('is-loading');
        }
        root.setAttribute('hidden', '');
        releasePortalLightboxBodyLock();
    }, 220);
}

function ensurePortalVideoLightbox() {
    var root = document.getElementById('portalVideoLightbox');
    if (root) {
        return root;
    }

    document.body.insertAdjacentHTML('beforeend',
        '<div id="portalVideoLightbox" class="portal-lightbox portal-lightbox--video" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="Video preview">' +
        '  <div class="portal-lightbox__veil" data-portal-video-close="1"></div>' +
        '  <button type="button" class="portal-lightbox__close" data-portal-video-close="1" aria-label="Close preview">' +
        '    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        '  </button>' +
        '  <div class="portal-lightbox__toolbar portal-lightbox__toolbar--video" role="toolbar" aria-label="Video controls">' +
        '    <a id="portalVideoLightboxOpen" class="portal-lightbox__tool portal-lightbox__tool-link" href="#" target="_blank" rel="noopener noreferrer">Open in new tab</a>' +
        '  </div>' +
        '  <figure class="portal-lightbox__stage portal-lightbox__stage--video">' +
        '    <div class="portal-lightbox__frame portal-lightbox__frame--video is-loading">' +
        '      <video id="portalVideoLightboxPlayer" class="portal-lightbox__video" controls playsinline preload="metadata"></video>' +
        '    </div>' +
        '  </figure>' +
        '</div>');

    root = document.getElementById('portalVideoLightbox');
    root.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('[data-portal-video-close="1"]')) {
            closePortalVideoLightbox();
        }
    });
    document.addEventListener('keydown', function (e) {
        if (!root || root.hasAttribute('hidden')) {
            return;
        }
        if (e.key === 'Escape') {
            closePortalVideoLightbox();
        }
    });
    return root;
}

function openPortalVideoLightbox(href) {
    var root = ensurePortalVideoLightbox();
    var player = document.getElementById('portalVideoLightboxPlayer');
    var openLink = document.getElementById('portalVideoLightboxOpen');
    var shell = root.querySelector('.portal-lightbox__frame--video');

    closePortalImageLightbox();
    closePortalPdfLightbox();

    if (openLink) {
        openLink.href = href;
    }
    if (shell) {
        shell.classList.add('is-loading');
        shell.classList.remove('is-ready');
    }

    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', 'false');
    lockPortalLightboxBody();

    player.onloadeddata = function () {
        if (shell) {
            shell.classList.remove('is-loading');
            shell.classList.add('is-ready');
        }
    };
    player.onerror = function () {
        if (shell) {
            shell.classList.remove('is-loading');
            shell.classList.add('is-ready');
        }
    };

    player.pause();
    player.removeAttribute('src');
    player.load();
    player.src = href;
    player.load();

    void root.offsetWidth;
    root.classList.add('is-open');

    var closeBtn = root.querySelector('.portal-lightbox__close');
    if (closeBtn) {
        closeBtn.focus({ preventScroll: true });
    }
}

function closePortalVideoLightbox() {
    var root = document.getElementById('portalVideoLightbox');
    if (!root || root.hasAttribute('hidden')) {
        return;
    }

    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');

    var player = document.getElementById('portalVideoLightboxPlayer');
    if (player) {
        try {
            player.pause();
        } catch (e) { /* ignore */ }
    }

    window.setTimeout(function () {
        if (player) {
            player.removeAttribute('src');
            player.load();
        }
        var shell = root.querySelector('.portal-lightbox__frame--video');
        if (shell) {
            shell.classList.remove('is-ready');
            shell.classList.add('is-loading');
        }
        root.setAttribute('hidden', '');
        releasePortalLightboxBodyLock();
    }, 220);
}

function initFlatpickrModalFix() {
    if (window._flatpickrModalFixInitialized) {
        return;
    }
    window._flatpickrModalFixInitialized = true;
    document.addEventListener('focusin', function (e) {
        if (e.target.closest && e.target.closest('.flatpickr-calendar')) {
            e.stopImmediatePropagation();
        }
    });
}

function isSentinelDateValue(value) {
    if (!value || !String(value).trim()) {
        return true;
    }

    var text = String(value).trim();
    if (/0001/.test(text)) {
        return true;
    }

    var parsed = Date.parse(text);
    if (!isNaN(parsed)) {
        return new Date(parsed).getFullYear() <= 1;
    }

    return false;
}

function formatPortalDateTime(date) {
    // Display format aligned with grid ISO-style (minute precision for form inputs).
    var d = date instanceof Date ? date : new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
        + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function formatPortalDateTimeIso(date) {
    var d = date instanceof Date ? date : new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
        + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
}

function isPortalInsertContext(el) {
    return !!(el && el.closest && el.closest('.portal-entity-modal[data-operation="Insert"]'));
}

function normalizePortalDateTimeFormData(formData) {
    if (!formData || typeof formData.keys !== 'function') {
        return;
    }

    var keys = Array.from(formData.keys());
    keys.forEach(function (key) {
        var value = formData.get(key);
        if (typeof value !== 'string') {
            return;
        }

        var escaped = (typeof CSS !== 'undefined' && CSS.escape)
            ? CSS.escape(key)
            : key.replace(/"/g, '\\"');
        var input = document.querySelector(
            'input.portal-datetime-input[name="' + escaped + '"], .flatpickr-datetime input[name="' + escaped + '"]'
        );
        if (!input) {
            return;
        }

        if (isSentinelDateValue(value)) {
            var now = new Date();
            var displayValue = formatPortalDateTime(now);
            formData.set(key, formatPortalDateTimeIso(now));
            input.value = displayValue;
            var wrap = input.closest('.flatpickr-datetime');
            if (wrap && wrap._flatpickr) {
                wrap._flatpickr.setDate(displayValue, false);
            }
            return;
        }

        var text = String(value).trim();

        // Legacy flatpickr display: d.m.Y H:i → ISO for server binding.
        var legacy = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
        if (legacy) {
            formData.set(key,
                legacy[3] + '-' + legacy[2].padStart(2, '0') + '-' + legacy[1].padStart(2, '0')
                + 'T' + legacy[4].padStart(2, '0') + ':' + legacy[5] + ':00');
            return;
        }

        // Current portal display: yyyy-MM-dd HH:mm[:ss] → ISO with T.
        var isoDisplay = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (isoDisplay) {
            formData.set(key,
                isoDisplay[1] + '-' + isoDisplay[2] + '-' + isoDisplay[3]
                + 'T' + isoDisplay[4] + ':' + isoDisplay[5] + ':' + (isoDisplay[6] || '00'));
        }
    });
}

function initSearchableSelects(root, attempt) {
    attempt = attempt || 0;
    if (typeof $.fn.select2 === 'undefined') {
        // CDN may lag behind site.js; retry briefly instead of leaving native selects visible.
        if (attempt < 40) {
            setTimeout(function () { initSearchableSelects(root, attempt + 1); }, 50);
        }
        return;
    }

    var container = root || document;
    $(container).find('.searchable-select').each(function () {
        var $select = $(this);
        if ($select.hasClass('select2-hidden-accessible')) {
            return;
        }

        // Bootstrap modals clip overflow; Select2 must render inside the modal.
        var $modal = $select.closest('.modal');
        var options = {
            placeholder: function () {
                return $select.data('placeholder') || '';
            },
            allowClear: true,
            width: '100%'
        };

        if ($modal.length) {
            options.dropdownParent = $modal;
        }

        $select.select2(options);
    });
}

/* Boot combos as soon as DOM is ready — do not wait for other init work. */
(function bootSearchableSelectsEarly() {
    function run() {
        if (typeof window.jQuery === 'undefined') {
            return;
        }
        initSearchableSelects(document);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();

function initDatePickers(root) {
    if (typeof flatpickr === 'undefined') {
        return;
    }

    var container = root || document;
    var pickers = container.querySelectorAll('.flatpickr-datetime');
    pickers.forEach(function (el) {
        if (el._flatpickr) {
            return;
        }

        var input = el.querySelector('[data-input]');
        var useNowForInsert = isPortalInsertContext(el);
        if (input && isSentinelDateValue(input.value)) {
            input.value = useNowForInsert ? formatPortalDateTime(new Date()) : '';
        }

        var options = {
            enableTime: true,
            enableSeconds: false,
            dateFormat: 'Y-m-d H:i',
            allowInput: true,
            time_24hr: true,
            wrap: true,
            disableMobile: true,
            onReady: function (_selectedDates, _dateStr, instance) {
                if (instance.input && isSentinelDateValue(instance.input.value)) {
                    if (useNowForInsert) {
                        instance.setDate(formatPortalDateTime(new Date()), false);
                    } else {
                        instance.clear();
                    }
                }

                // enableTime disables flatpickr's closeOnSelect — close when a calendar day is clicked.
                if (instance.daysContainer && !instance.daysContainer._portalDayCloseBound) {
                    instance.daysContainer._portalDayCloseBound = true;
                    instance.daysContainer.addEventListener('click', function (e) {
                        var day = e.target && e.target.closest
                            ? e.target.closest('.flatpickr-day')
                            : null;
                        if (!day || day.classList.contains('flatpickr-disabled')) {
                            return;
                        }
                        window.setTimeout(function () {
                            if (instance.isOpen) {
                                instance.close();
                            }
                        }, 0);
                    });
                }
            }
        };

        var htmlLang = (document.documentElement.lang || '').toLowerCase();
        if (htmlLang.startsWith('tr') && flatpickr.l10ns && flatpickr.l10ns.tr) {
            options.locale = flatpickr.l10ns.tr;
        }

        flatpickr(el, options);
    });
}

function loadJsonAllEditors() {
    let jsonEditors = $('.jsoneditor-class');
    jsonEditors.each(function (index) {
        const itemName = jsonEditors[index].id;
        const jsonReadonlyPrefix = "jsonEditorRO_";
        const isReadonly = itemName.startsWith(jsonReadonlyPrefix);
        const jsonPrefix = isReadonly ? jsonReadonlyPrefix : jsonReadonlyPrefix.replace('RO_', '_');
        loadJsonEditor(itemName, itemName.replace(jsonPrefix, ''), isReadonly);
    });
}

function ensureAceLoaded(callback) {
    if (typeof ace !== 'undefined') {
        callback();
        return;
    }
    if (window.__aceLoading) {
        window.__aceLoading.push(callback);
        return;
    }
    window.__aceLoading = [callback];
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.18.0/ace.js';
    script.onload = function () {
        var pending = window.__aceLoading || [];
        window.__aceLoading = null;
        pending.forEach(function (fn) { fn(); });
    };
    document.head.appendChild(script);
}

function loadYamlAllEditors(root) {
    const scope = root ? $(root) : $(document);
    if (!scope.find('.yamleditor-class, .umleditor-class').length)
        return;

    ensureAceLoaded(function () {
        loadYamlAllEditorsAfterAce(root);
        loadUmlAllEditors();
    });
}

function loadYamlAllEditorsAfterAce(root) {
    const scope = root ? $(root) : $(document);
    scope.find('.yamleditor-class').each(function () {
        const el = this;
        const itemName = el.id;
        if (!itemName || typeof ace === 'undefined')
            return;

        // Already mounted (e.g. list modal behind a detail popup) — don't wipe content.
        if (el.env && el.env.editor) {
            el.env.editor.resize(true);
            return;
        }

        // Capture newlines via textContent BEFORE Ace mounts.
        // Ace's own DOM extraction uses innerText and collapses line breaks.
        const initialValue = (el.textContent || '').replace(/\r\n/g, '\n');
        el.textContent = '';

        el.style.width = el.style.width || '100%';
        el.style.height = el.style.height || '300px';
        el.style.maxWidth = '100%';
        el.style.whiteSpace = 'pre-wrap';
        el.style.overflow = 'hidden';
        el.style.position = 'relative';
        el.style.display = 'block';

        try {
            const jsonReadonlyPrefix = "yamlEditorRO_";
            const isReadonly = itemName.startsWith(jsonReadonlyPrefix);
            let editor = ace.edit(el);
            editor.session.setMode("ace/mode/yaml");
            editor.setTheme("ace/theme/github");
            editor.setReadOnly(isReadonly);
            editor.setOptions({
                wrap: true,
                autoScrollEditorIntoView: true
            });
            editor.setValue(initialValue, -1);
            editor.resize(true);
        } catch (err) {
            // Fallback: keep readable YAML if Ace fails to mount.
            el.textContent = initialValue;
            el.style.overflow = 'auto';
            el.style.visibility = 'visible';
            console.error('YAML editor failed to initialize', err);
        }
    });
}

function loadUmlAllEditors() {
    if (typeof ace === 'undefined')
        return;
    let jsonEditors = $('.umleditor-class');
    jsonEditors.each(function (index) {
        const itemName = jsonEditors[index].id;
        const jsonReadonlyPrefix = "umlEditorRO_";
        const isReadonly = itemName.startsWith(jsonReadonlyPrefix);
        let editor = ace.edit(itemName);
        editor.session.setMode("ace/mode/markdown");
        editor.setTheme("ace/theme/github");
        editor.setReadOnly(isReadonly);
    });
}

function addYamlEditorsToFormData(formData) {
    const yamlEditorPrefix = 'yamlEditor_';
    const yamlEditors = document.querySelectorAll(`[id^='${yamlEditorPrefix}']`);

    yamlEditors.forEach(editor => {
        const editorId = editor.id.replace(yamlEditorPrefix, '').replace('_','.');
        const aceEditor = ace.edit(editor.id);
        const editorContent = aceEditor.getValue().trim();
        formData.append(editorId, editorContent);
    });

    prepareFormData(formData);
}

function setPage(pageId) {
    var form = document.getElementById("formList");
    var currentPage = document.getElementById("CurrentPage");
    if (!form || !currentPage) return;
    currentPage.value = pageId;
    if (document.getElementById("list-region") && typeof refreshListRegion === "function") {
        refreshListRegion();
        return;
    }
    form.submit();
}

function setPageSize(pageSize) {
    var form = document.getElementById("formList");
    if (!form) return;

    var size = parseInt(pageSize, 10);
    if (!size || size < 1) return;

    var pageSizeInput = document.getElementById("PageSize");
    if (!pageSizeInput) {
        pageSizeInput = document.createElement("input");
        pageSizeInput.type = "hidden";
        pageSizeInput.id = "PageSize";
        pageSizeInput.name = "PageSize";
        form.appendChild(pageSizeInput);
    }

    var currentPage = document.getElementById("CurrentPage");
    pageSizeInput.value = String(size);
    if (currentPage) currentPage.value = "1";
    if (document.getElementById("list-region") && typeof refreshListRegion === "function") {
        refreshListRegion();
        return;
    }
    form.submit();
}

function needsBase64Encoding(value) {
    if (typeof value !== "string") return false;
    if (/^\s*[\{\[]/.test(value)) return true;
    if (/[\u0000-\u001F\u007F-\u009F<>"{}\[\]]/.test(value)) return true;
    if( /<[a-zA-Z][\s\S]*?>/.test(value)) return  true;
    return (value.length > 10000);
}

function base64Encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode("0x" + p1)
    ));
}

function base64Decode(str) {
    return decodeURIComponent(
        Array.prototype.map.call(atob(str), c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
    );
}

function prepareFormData(formData) {
    normalizePortalDateTimeFormData(formData);
    for (const key of formData.keys()) {
        let value = formData.get(key);
        if (needsBase64Encoding(value)) {
            formData.set(key, base64Encode(value) + "_IsBase64");
        }
    }
}

function loadJsonEditor(jsonEditorName, jsonDataItem, isReadonly) {
    const container = document.getElementById(jsonEditorName);
    let modes = ['code', 'text', 'tree'];
    const options = {
        mainMenuBar: true,
        navigationBar: true,
        statusBar: true,
        mode: 'code',
        modes: modes,
        onEditable: function (path, field, value) {
            return !isReadonly;
        },
        onChangeText: function (jsonString) {
            $('#' + jsonDataItem).val(jsonString);
        }
    }

    setJsonDataToEditor(container, options, jsonDataItem);
}

function setJsonDataToEditor(container, options, jsonDataItem) {
    const editor = new JSONEditor(container, options);
    let jsonValue = $('#' + jsonDataItem).val();
    let emptyJson = "{}";

    if (jsonValue.length === 0) {
        jsonValue = emptyJson;
    }
    try {
        const initialJson = JSON.parse(jsonValue);
        editor.set(initialJson);
    } catch {
        const initialJson = JSON.parse(emptyJson);
        editor.set(initialJson);
    }
}



if (window.jQuery && $.validator && $.validator.methods) {
    $.validator.methods.range = function (value, element, param) {
        let globalizedValue = value.replace(",", ".");
        return this.optional(element) || (globalizedValue >= param[0] && globalizedValue <= param[1]);
    };

    $.validator.methods.number = function (value, element) {
        return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:[\s\.,]\d{3})+)(?:[\.,]\d+)?$/.test(value);
    };
}

/**
 * Sticky topbar: compact when the page has scrolled (keeps chrome pinned, frees vertical space).
 * Uses IntersectionObserver on a sentinel so nested scrollports still work.
 */
(function initPortalTopbarCompactOnScroll() {
    // Hysteresis avoids flicker / hard snap near the threshold.
    var COMPACT_ENTER = 28;
    var COMPACT_EXIT = 6;
    var topbar = null;
    var contentArea = null;
    var sentinel = null;
    var ticking = false;
    var lastCompact = null;
    var offsetRaf = 0;

    function measureAndPublishOffset() {
        if (!topbar || !contentArea) {
            return;
        }
        var height = Math.ceil(topbar.getBoundingClientRect().height);
        if (height > 0) {
            contentArea.style.setProperty('--portal-topbar-sticky-offset', height + 'px');
        }
    }

    function trackOffsetDuringTransition() {
        if (offsetRaf) {
            cancelAnimationFrame(offsetRaf);
        }
        var start = performance.now();
        function frame(now) {
            measureAndPublishOffset();
            if (now - start < 480) {
                offsetRaf = requestAnimationFrame(frame);
            } else {
                offsetRaf = 0;
                measureAndPublishOffset();
            }
        }
        offsetRaf = requestAnimationFrame(frame);
    }

    function setCompact(compact) {
        if (!topbar || compact === lastCompact) {
            measureAndPublishOffset();
            return;
        }
        lastCompact = compact;
        topbar.classList.toggle('is-compact', compact);
        trackOffsetDuringTransition();
    }

    function readScrollY() {
        var y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        if (!y && contentArea) {
            var node = contentArea.parentElement;
            while (node && node !== document.body) {
                if (node.scrollTop) {
                    y = node.scrollTop;
                    break;
                }
                node = node.parentElement;
            }
        }
        return y;
    }

    function syncFromScrollPosition() {
        ticking = false;
        if (!topbar) {
            return;
        }
        var y = readScrollY();
        var sentTop = sentinel ? sentinel.getBoundingClientRect().top : 0;
        var scrolledAway = sentTop < -1;
        var next = lastCompact
            ? (y > COMPACT_EXIT || scrolledAway)
            : (y > COMPACT_ENTER || scrolledAway);
        setCompact(next);
    }

    function onScrollOrResize() {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(syncFromScrollPosition);
        }
    }

    function boot() {
        topbar = document.querySelector('.content-area > .portal-topbar');
        contentArea = topbar ? topbar.parentElement : null;
        sentinel = contentArea
            ? contentArea.querySelector('.portal-topbar-scroll-sent')
            : null;
        if (!topbar || !contentArea) {
            return;
        }

        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.className = 'portal-topbar-scroll-sent';
            sentinel.setAttribute('aria-hidden', 'true');
            contentArea.insertBefore(sentinel, topbar);
        }

        window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
        window.addEventListener('resize', onScrollOrResize, { passive: true });
        document.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });

        if (typeof IntersectionObserver !== 'undefined') {
            var io = new IntersectionObserver(function () {
                onScrollOrResize();
            }, { root: null, threshold: [0, 0.01, 1] });
            io.observe(sentinel);
        }

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(measureAndPublishOffset).observe(topbar);
        }

        syncFromScrollPosition();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

