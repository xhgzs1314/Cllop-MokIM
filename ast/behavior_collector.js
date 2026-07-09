(function () {
    'use strict';
    let mouseTrajectory = [];
    let lastMousePos = {
        x: 0,
        y: 0
    };
    let clickStartTime = 0;

    document.addEventListener('mousemove', function (e) {
        const now = Date.now();
        mouseTrajectory.push({
            x: e.clientX,
            y: e.clientY,
            t: now
        });
        if (mouseTrajectory.length > 100) {
            mouseTrajectory = mouseTrajectory.slice(-100);
        }
    });
    document.addEventListener('mousedown', function (e) {
        clickStartTime = Date.now();
    });
    document.addEventListener('mouseup', function (e) {
        const clickDuration = Date.now() - clickStartTime;
        window._clickData = {
            x: e.clientX,
            y: e.clientY,
            duration: clickDuration
        };
    });
    let lastKeyTime = 0;
    let keyIntervals = [];
    document.addEventListener('keydown', function (e) {
        const now = Date.now();
        if (lastKeyTime > 0) {
            const interval = now - lastKeyTime;
            if (interval < 1000) {
                keyIntervals.push(interval);
                if (keyIntervals.length > 20) {
                    keyIntervals = keyIntervals.slice(-20);
                }
            }
        }
        lastKeyTime = now;
    });
    let scrollEvents = [];
    let lastScrollTime = 0;
    window.addEventListener('scroll', function () {
        const now = Date.now();
        if (now - lastScrollTime > 16) {
            scrollEvents.push({
                y: window.scrollY,
                delta: now - lastScrollTime,
                t: now
            });
            lastScrollTime = now;

            if (scrollEvents.length > 50) {
                scrollEvents = scrollEvents.slice(-50);
            }
        }
    });
    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
        if (options && options.body && typeof options.body === 'string') {
            const formData = new URLSearchParams(options.body);
            if (mouseTrajectory.length > 0) {
                formData.append('_mouse_data', JSON.stringify({
                    trajectory: mouseTrajectory.slice(-30),
                    click_duration: window._clickData?.duration || null,
                    click_position: window._clickData ? {
                        x: window._clickData.x,
                        y: window._clickData.y
                    } : null
                }));
            }
            if (keyIntervals.length > 0) {
                const avgSpeed = keyIntervals.reduce((a, b) => a + b, 0) / keyIntervals.length;
                formData.append('_keyboard_data', JSON.stringify({
                    typing_speed: avgSpeed,
                    samples: keyIntervals.length
                }));
            }
            if (scrollEvents.length > 0) {
                formData.append('_scroll_data', JSON.stringify({
                    scrolls: scrollEvents.slice(-20),
                    total_scrolls: scrollEvents.length
                }));
            }

            options.body = formData.toString();
        }

        return originalFetch.call(this, url, options);
    };
    window.getWebGLFingerprint = function (nonce) {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return null;
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

            return crypto.subtle.digest('SHA-256',
                new TextEncoder().encode(nonce + renderer + vendor + navigator.userAgent)
            ).then(hash => {
                return Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            });
        }
        return Promise.resolve(null);
    };
})();