(function () {
  'use strict';

  function fireResize() {
    requestAnimationFrame(function () {
      window.dispatchEvent(new Event('resize'));
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 80);
    });
  }

  function initLab3DUI() {
    var stage = document.querySelector('.stage');
    var side = document.querySelector('.side');
    var hud = document.querySelector('.hud');
    if (!stage || !side || !hud) return;

    // Đảm bảo có .hud-right để đặt nút Toàn màn hình / Ẩn bảng
    var hudRight = hud.querySelector('.hud-right');
    if (!hudRight) {
      hudRight = document.createElement('div');
      hudRight.className = 'hud-right';
      hud.appendChild(hudRight);
    }

    var isEmbedded = false;
    try { isEmbedded = window.self !== window.top; } catch (e) { isEmbedded = true; }
    var isFs = false;

    // 1. Nút Ẩn/Hiện bảng điều khiển (Desktop)
    var btnSide = document.createElement('button');
    btnSide.type = 'button';
    btnSide.className = 'h10-ui-btn';
    btnSide.id = 'h10-side-btn';
    btnSide.title = 'Ẩn hoặc hiện bảng điều khiển bên cạnh (phím H)';
    btnSide.textContent = '◧ Rộng 3D';
    btnSide.onclick = function () {
      if (window.innerWidth <= 860) {
        setMobState(document.body.classList.contains('h10-mob-max') ? 'split' : 'max');
      } else {
        var wide = document.body.classList.toggle('h10-desk-wide');
        btnSide.classList.toggle('on', wide);
        btnSide.textContent = wide ? '◧ Hiện bảng' : '◧ Rộng 3D';
        fireResize();
      }
    };
    hudRight.appendChild(btnSide);

    // 2. Nút Toàn màn hình tại chỗ (không đổi link/tab!)
    var btnFs = document.createElement('button');
    btnFs.type = 'button';
    btnFs.className = 'h10-ui-btn';
    btnFs.id = 'h10-fs-btn';
    btnFs.title = 'Toàn màn hình tại chỗ (phím F)';
    btnFs.textContent = '⛶';

    function syncFsBtn() {
      var nativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      var active = isFs || nativeFs;
      btnFs.classList.toggle('on', active);
      btnFs.textContent = active ? '✕ Thu nhỏ' : '⛶';
    }

    btnFs.onclick = function () {
      isFs = !isFs;
      if (window.innerWidth <= 860) {
        setMobState(isFs ? 'max' : 'split');
      }
      if (isEmbedded && window.parent) {
        try { window.parent.postMessage({ type: 'h10-lab-fs', on: isFs }, '*'); } catch (e) {}
      } else {
        var el = document.documentElement;
        if (isFs) {
          var req = el.requestFullscreen || el.webkitRequestFullscreen;
          if (req) { try { req.call(el); } catch (e) {} }
        } else {
          var ex = document.exitFullscreen || document.webkitExitFullscreen;
          if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) {
            try { ex.call(document); } catch (e) {}
          }
        }
      }
      syncFsBtn();
      fireResize();
    };
    hudRight.appendChild(btnFs);

    document.addEventListener('fullscreenchange', function () {
      isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      syncFsBtn();
      fireResize();
    });

    window.addEventListener('message', function (ev) {
      if (!ev || !ev.data || ev.data.type !== 'h10-lab-fs-state') return;
      isFs = !!ev.data.on;
      if (window.innerWidth <= 860 && !isFs && document.body.classList.contains('h10-mob-max')) {
        setMobState('split');
      }
      syncFsBtn();
      fireResize();
    });

    // 3. Thanh 3 chế độ cho Mobile (Rộng 3D / Chia đôi / Đọc thêm)
    var mobBar = document.createElement('div');
    mobBar.className = 'h10-mob-sheet-bar';
    mobBar.innerHTML =
      '<div class="h10-mob-pill-group">' +
        '<button type="button" data-ms="max">👁️ Rộng 3D</button>' +
        '<button type="button" data-ms="split" class="on">⬓ Chia đôi</button>' +
        '<button type="button" data-ms="tall">📖 Đọc thêm</button>' +
      '</div>';
    side.insertBefore(mobBar, side.firstChild);

    // Nút nổi khôi phục bảng điều khiển khi đang ở chế độ Rộng 3D trên mobile
    var btnRestore = document.createElement('button');
    btnRestore.type = 'button';
    btnRestore.className = 'h10-ui-btn h10-mob-restore';
    btnRestore.textContent = '⬆️ Mở bảng điều khiển';
    btnRestore.onclick = function () { setMobState('split'); };
    stage.appendChild(btnRestore);

    function setMobState(st) {
      document.body.classList.toggle('h10-mob-max', st === 'max');
      document.body.classList.toggle('h10-mob-tall', st === 'tall');
      mobBar.querySelectorAll('[data-ms]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-ms') === st);
      });
      if (window.innerWidth <= 860) {
        btnSide.classList.toggle('on', st === 'max');
        btnSide.textContent = st === 'max' ? '⬆️ Bảng ĐK' : '👁️ Rộng';
      }
      fireResize();
    }

    mobBar.querySelectorAll('[data-ms]').forEach(function (b) {
      b.onclick = function () { setMobState(b.getAttribute('data-ms')); };
    });

    // 4. Gộp cam-bar thành nút 🎥 xổ ra trên điện thoại (tránh đè che mô hình 3D)
    var camBar = stage.querySelector('.cam-bar');
    if (camBar) {
      var btnCam = document.createElement('button');
      btnCam.type = 'button';
      btnCam.className = 'h10-ui-btn h10-cam-toggle';
      btnCam.textContent = '🎥 Góc máy';
      btnCam.onclick = function (e) {
        e.stopPropagation();
        camBar.classList.toggle('h10-cam-open');
      };
      camBar.addEventListener('click', function () {
        camBar.classList.remove('h10-cam-open');
      });
      stage.addEventListener('pointerdown', function (e) {
        if (!camBar.contains(e.target) && e.target !== btnCam) {
          camBar.classList.remove('h10-cam-open');
        }
      });
      stage.appendChild(btnCam);
    }

    // Đồng bộ nhãn nút theo kích thước màn hình
    function syncViewportLabels() {
      if (window.innerWidth <= 860) {
        var isMax = document.body.classList.contains('h10-mob-max');
        btnSide.textContent = isMax ? '⬆️ Bảng ĐK' : '👁️ Rộng';
      } else {
        var isWide = document.body.classList.contains('h10-desk-wide');
        btnSide.textContent = isWide ? '◧ Hiện bảng' : '◧ Rộng 3D';
      }
    }
    window.addEventListener('resize', syncViewportLabels);
    syncViewportLabels();

    // Phím tắt trên máy tính: H (ẩn/hiện bảng), F (toàn màn hình)
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'h' || e.key === 'H') btnSide.click();
      else if (e.key === 'f' || e.key === 'F') btnFs.click();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLab3DUI);
  } else {
    initLab3DUI();
  }
})();
