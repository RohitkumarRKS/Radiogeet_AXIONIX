/* =========================================
   Splash Page JavaScript
   Progress bar animation + particles + redirect
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize particle background
    initParticles();
    
    // Animate progress bar
    animateProgress();
});

function animateProgress() {
    const fill = document.getElementById('progress-fill');
    const percentText = document.getElementById('progress-percent');
    let progress = 0;
    const totalDuration = 4000; // 4 seconds total
    const steps = 100;
    const interval = totalDuration / steps;

    const timer = setInterval(() => {
        // Non-linear progress for realistic feel
        if (progress < 30) {
            progress += Math.random() * 3 + 1;
        } else if (progress < 60) {
            progress += Math.random() * 2 + 0.5;
        } else if (progress < 85) {
            progress += Math.random() * 4 + 1;
        } else if (progress < 95) {
            progress += Math.random() * 1.5 + 0.3;
        } else {
            progress += Math.random() * 0.8 + 0.2;
        }

        if (progress >= 100) {
            progress = 100;
            clearInterval(timer);
            
            // Redirect after completion
            setTimeout(() => {
                window.location.href = '/welcome/';
            }, 600);
        }

        fill.style.width = progress + '%';
        percentText.textContent = Math.floor(progress) + '%';
    }, interval);
}

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const numParticles = 80;
    const connectionDistance = 120;

    // Create particles
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2,
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(76, 175, 80, ${p.opacity})`;
            ctx.fill();

            // Draw connections
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(76, 175, 80, ${0.15 * (1 - dist / connectionDistance)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        });

        requestAnimationFrame(animate);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}
