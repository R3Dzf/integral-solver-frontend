// Particle class for background animation (كما هي بدون تغيير)
class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
        this.decay = 0.005;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update(ctx) {
        this.x += this.velocity.y;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
        if (this.alpha < 0) this.alpha = 0;
        this.draw(ctx);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- عناصر DOM ---
    const mathliveInput = document.getElementById('mathliveInput'); // عنصر MathLive الجديد
    const solveButton = document.getElementById('solveButton');
    const showStepsButton = document.getElementById('showStepsButton');
    const resultDisplay = document.getElementById('resultDisplay');
    const keyboardPanelsContainer = document.getElementById('keyboardPanels');
    const categoryNavButtonsContainer = document.getElementById('categoryNavButtons');
    const categoryNameSpan = document.getElementById('categoryName');
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    const stepsModal = document.getElementById('stepsModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const stepsModalBody = document.getElementById('stepsModalBody');

    let lastSolvedIntegral = '';
    let cachedSteps = null;

    const categories = [
        { id: 'panel-calculus-basic', name: 'تفاضل وتكامل وعمليات أساسية', icon: '∫' },
        { id: 'panel-constants-inequalities', name: 'ثوابت ومقارنات', icon: 'π' },
        { id: 'panel-trig', name: 'دوال مثلثية', icon: 'sin' },
        { id: 'panel-hyper-log', name: 'دوال زائدية ولوغاريتمية', icon: 'e^x' },
        { id: 'panel-greek-logic', name: 'أحرف يونانية ومنطق', icon: 'α' }
    ];
    let currentCategoryIndex = 0;

    // --- Background Animation Logic (كما هي) ---
    const canvas = document.getElementById('backgroundCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function getParticleColor() {
        if (htmlElement.classList.contains('dark')) {
            const colors = ['#88c0d0', '#81a1c1', '#b48ead', '#a3be8c', '#5e81ac', '#4c566a'];
            return colors[Math.floor(Math.random() * colors.length)];
        } else {
            const colors = ['#a5d6a7', '#81d4fa', '#ffab91', '#c5cae9', '#b2ebf2', '#e0f7fa'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
    }

    function createParticle() {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 2 + 1;
        const color = getParticleColor();
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.1;
        const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        particles.push(new Particle(x, y, radius, color, velocity));
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = particles.filter(particle => particle.alpha > 0);
        if (particles.length < 100) { createParticle(); }
        particles.forEach(particle => { particle.update(ctx); });
        animationFrameId = requestAnimationFrame(animateParticles);
    }

    function startAnimation() {
        if (!animationFrameId) { animateParticles(); }
    }
    startAnimation();

    // --- Theme Toggle Logic (كما هي) ---
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        htmlElement.classList.add(currentTheme);
        themeToggle.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    } else {
        htmlElement.classList.add('light'); // الوضع الافتراضي هو الفاتح
        themeToggle.innerHTML = '🌙';
    }
    themeToggle.addEventListener('click', () => {
        if (htmlElement.classList.contains('dark')) {
            htmlElement.classList.remove('dark');
            htmlElement.classList.add('light');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '🌙';
        } else {
            htmlElement.classList.remove('light');
            htmlElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '☀️';
        }
        particles.forEach(p => p.color = getParticleColor());
    });

    // --- تهيئة MathLive ---
    mathliveInput.setOptions({
        virtualKeyboardMode: "onfocus", // "manual" أو "off" أو "onfocus"
        virtualKeyboards: "all", // يمكنك تحديد لوحات مفاتيح معينة
        placeholder: "writehere", // النص المؤقت
        mathModeSpace: "\\,", // ضبط المسافة في وضع الرياضيات
        smartFence: true,
        // للمزيد من الخيارات: https://cortexjs.io/mathlive/guides/options/
    });
    mathliveInput.value = "\\int {#0} \\,dx"; // قيمة ابتدائية مقترحة
    // mathliveInput.focus(); // للتركيز على الحقل عند تحميل الصفحة (اختياري)

    // مستمع لتغييرات الإدخال في MathLive
    mathliveInput.addEventListener('input', (ev) => {
        // console.log(ev.target.value); // قيمة LaTeX الحالية
        cachedSteps = null;
        showStepsButton.style.display = 'none';
    });


    // --- منطق لوحة المفاتيح المخصصة ---
    function showCategory(index) {
        const panels = keyboardPanelsContainer.querySelectorAll('.keyboard-panel');
        const navButtons = categoryNavButtonsContainer.querySelectorAll('.category-nav-button');

        panels.forEach((panel, i) => {
            panel.classList.toggle('active', i === index);
        });
        navButtons.forEach((button, i) => {
            button.classList.toggle('active', i === index);
        });

        categoryNameSpan.textContent = categories[index].name;
        currentCategoryIndex = index;

        // إعادة عرض MathJax للأزرار إذا كانت تحتوي على صيغ (إذا لزم الأمر بعد الآن)
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([panels[index]]);
            navButtons.forEach(button => {
                if (button.innerHTML.includes('$')) {
                    const tempSpan = document.createElement('span');
                    tempSpan.innerHTML = button.innerHTML;
                    window.MathJax.typesetPromise([tempSpan]).then(() => {
                        button.innerHTML = tempSpan.innerHTML;
                    });
                }
            });
        }
    }

    categories.forEach((category, index) => {
        const button = document.createElement('button');
        button.classList.add('category-nav-button');
        button.dataset.index = index;
        if (category.icon.startsWith('\\') || category.icon.includes('$')) {
            button.innerHTML = `$$${category.icon}$$`;
        } else {
            button.innerHTML = category.icon;
        }
        button.addEventListener('click', () => showCategory(index));
        categoryNavButtonsContainer.appendChild(button);
    });

    // --- التعامل مع أزرار لوحة المفاتيح المخصصة ---
    // ملاحظة: هذا هو الجزء الذي يحتاج إلى تطوير أكبر ليتوافق تمامًا مع MathLive
    // إذا كنت ستعتمد على لوحة مفاتيح MathLive المدمجة، يمكنك تبسيط هذا الجزء أو إزالته.
    keyboardPanelsContainer.addEventListener('click', (event) => {
        const button = event.target.closest('.integral-keyboard');
        if (button && button.dataset.value) {
            const value = button.dataset.value;

            // طريقة مبسطة للإدخال، قد تحتاج لتحسينها باستخدام خيارات .insert() المتقدمة
            if (value === "\\frac{}{}") {
                mathliveInput.insert('\\frac{#0}{#1}', { focus: true, selectionMode: 'placeholder' });
            } else if (value === "^") {
                mathliveInput.insert('^{#0}', { focus: true, selectionMode: 'placeholder' });
            } else if (value.endsWith('()')) { // للدوال مثل sin(), cos()
                mathliveInput.insert(value.slice(0, -2) + '({#0})', { focus: true, selectionMode: 'placeholder' });
            } else if (value === "\\abs{}") {
                mathliveInput.insert('\\left|{#0}\\right|', { focus: true, selectionMode: 'placeholder' });
            } else if (value === "\\int_{}^{}") {
                mathliveInput.insert('\\int_{#0}^{#1} {#2} d{#3}', { focus: true, selectionMode: 'placeholder' });
            }
            else {
                mathliveInput.insert(value, { focus: true, insertionMode: 'insertPastDistributingPlaceholder' });
            }
            // mathliveInput.focus(); // إعادة التركيز قد تكون مزعجة مع لوحة مفاتيح MathLive
        }
    });

    const bottomKeyboardControls = document.querySelector('.keyboard-container .flex.justify-center.mt-4.space-x-2');
    if (bottomKeyboardControls) {
        bottomKeyboardControls.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (button && button.dataset.value) {
                const value = button.dataset.value;
                if (value === 'clear') {
                    mathliveInput.value = '\\int {#0} \\,dx'; // أو قيمة ابتدائية أخرى
                    cachedSteps = null;
                    showStepsButton.style.display = 'none';
                } else if (value === ' ') {
                    mathliveInput.insert(' ');
                }
                // mathliveInput.focus();
            }
        });
    } else {
        console.error("Error: Could not find the bottom keyboard controls element.");
    }

    // --- NEW FUNCTION: Centralized fetch to backend proxy (كما هي) ---
    async function fetchFromBackend(integralExpression, requestType) {
        const cleanedExpression = integralExpression.replace(/\\text{write here..}/g, '').trim();
        const backendUrl = '/api/solve-integral';

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    integral: cleanedExpression,
                    type: requestType
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error communicating with backend proxy:', error);
            throw error;
        }
    }

    // --- Modified function to fetch and cache steps (كما هي) ---
    async function fetchAndCacheSteps(integralExpression) {
        try {
            cachedSteps = await fetchFromBackend(integralExpression, 'steps');
        } catch (error) {
            console.error('Failed to fetch steps via backend:', error);
            cachedSteps = null;
        }
    }

    // --- زر حل التكامل ---
    solveButton.addEventListener('click', async function () {
        const integralExpression = mathliveInput.value.trim(); // الحصول على القيمة من MathLive

        if (integralExpression === '' || integralExpression === '\\int {#0} \\,dx' || integralExpression === '\\int_{}^{}  dx') {
            resultDisplay.innerHTML = '<p class="text-red-300">الرجاء إدخال تعبير تكاملي صحيح.</p>';
            showStepsButton.style.display = 'none';
            cachedSteps = null;
            return;
        }

        resultDisplay.innerHTML = `
            <div class="flex flex-col items-center justify-center">
                <div class="spinner"></div>
                <p class="mt-4 text-yellow-300">جاري حل التكامل، يرجى الانتظار...</p>
            </div>
        `;
        showStepsButton.style.display = 'none';
        cachedSteps = null;

        try {
            const resultText = await fetchFromBackend(integralExpression, 'solve');

            if (resultText.startsWith('خطأ:')) {
                resultDisplay.innerHTML = `<p class="text-red-300">${resultText}</p>`;
                lastSolvedIntegral = '';
                cachedSteps = null;
            } else {
                let text = resultText;
                // ... (باقي كود تنظيف LaTeX كما هو) ...
                text = text.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
                text = text.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
                text = text.replace(/\\left\{/g, '{').replace(/\\right\}/g, '}');
                text = text.replace(/\\left\|/g, '|').replace(/\\right\|/g, '|');
                text = text.replace(/^\((.*)\)\s*\+ C$/, '$1 + C');
                text = text.replace(/^\((.*)\)$/, '$1');
                text = text.replace(/\\ /g, ' ');
                text = text.replace(/sin\(/g, '\\sin(');
                text = text.replace(/cos\(/g, '\\cos(');
                text = text.replace(/tan\(/g, '\\tan(');
                text = text.replace(/log\(/g, '\\log(');
                text = text.replace(/ln\(/g, '\\ln(');
                text = text.replace(/sqrt\(/g, '\\sqrt{');
                text = text.replace(/inf/g, '\\infty');
                text = text.replace(/pi/g, '\\pi');

                const commonFunctions = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth', 'log', 'ln', 'lim', 'sum', 'prod', 'sqrt', 'frac', 'infty', 'pi'];
                commonFunctions.forEach(func => {
                    const regex = new RegExp(`(?<!\\\\)(?<![a-zA-Z])(${func})(?![a-zA-Z])`, 'g');
                    text = text.replace(regex, `\\${func}`);
                });
                text = text.replace(/([a-zA-Z0-9\(\)]+)\^([^{]+?)\/([0-9.]+)/g, '\\frac{$1^{$2}}{$3}');
                text = text.replace(/([a-zA-Z0-9\(\)]+)\/([0-9.]+)/g, '\\frac{$1}{$2}');


                if (!text.startsWith('$$')) {
                    text = `$$${text}$$`;
                }

                resultDisplay.innerHTML = text;
                if (window.MathJax) {
                    window.MathJax.typesetPromise([resultDisplay]);
                }
                lastSolvedIntegral = integralExpression;
                showStepsButton.style.display = 'block';

                fetchAndCacheSteps(integralExpression);
            }

        } catch (error) {
            console.error('Error solving integral:', error);
            resultDisplay.innerHTML = `<p class="text-red-300">حدث خطأ: ${error.message || 'يرجى التحقق من اتصالك بالإنترنت وخادم الواجهة الخلفية.'}</p>`;
            lastSolvedIntegral = '';
            cachedSteps = null;
        }
    });

    // --- عرض خطوات الحل (Modal) ---
    showStepsButton.addEventListener('click', async () => {
        if (!lastSolvedIntegral) {
            stepsModalBody.innerHTML = '<p class="text-red-300">لا يوجد تكامل تم حله لعرض الخطوات.</p>';
            stepsModal.classList.add('show');
            bodyElement.classList.add('modal-open');
            return;
        }

        if (cachedSteps) {
            displayStepsInModal(cachedSteps);
            stepsModal.classList.add('show');
            bodyElement.classList.add('modal-open');
            return;
        }

        stepsModalBody.innerHTML = `
            <div class="flex flex-col items-center justify-center">
                <div class="spinner"></div>
                <p class="mt-4 text-yellow-300">جاري تحميل الخطوات...</p>
            </div>
        `;
        stepsModal.classList.add('show');
        bodyElement.classList.add('modal-open');

        await fetchAndCacheSteps(lastSolvedIntegral);
        if (cachedSteps) {
            displayStepsInModal(cachedSteps);
        } else {
            stepsModalBody.innerHTML = '<p class="text-red-300">فشل تحميل الخطوات. يرجى المحاولة مرة أخرى.</p>';
        }
    });

    function displayStepsInModal(stepsText) {
        // ... (كود displayStepsInModal كما هو) ...
        stepsText = stepsText.replace(/si\\nel/g, 'sin');
        stepsText = stepsText.replace(/co\\secant/g, 'csc');
        stepsText = stepsText.replace(/c\\dot/g, 'c');
        stepsText = stepsText.replace(/\\ /g, ' ');
        stepsText = stepsText.replace(/~/g, '');

        let htmlContent = marked.parse(stepsText);

        const latexCommandsInSteps = [
            'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
            'arcsin', 'arccos', 'arctan',
            'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth',
            'log', 'ln', 'lim', 'sum', 'prod', 'sqrt', 'frac',
            'infty', 'pi', 'Delta', 'Sigma', 'Omega', 'Gamma', 'Lambda', 'Phi', 'Psi',
            'forall', 'exists', 'cup', 'cap', 'emptyset',
            'le', 'ge', 'ne', 'approx', 'pm',
            'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
            'kappa', 'lambda', 'mu', 'nu', 'xi', 'rho', 'sigma', 'tau', 'phi',
            'chi', 'psi', 'omega', 'd', 'int'
        ];
        latexCommandsInSteps.forEach(cmd => {
            const regex = new RegExp(`(?<!\\\\)(?<![a-zA-Z])(${cmd})(?![a-zA-Z])`, 'g');
            htmlContent = htmlContent.replace(regex, `\\${cmd}`);
        });

        htmlContent = htmlContent.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
        htmlContent = htmlContent.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
        htmlContent = htmlContent.replace(/\\left\{/g, '{').replace(/\\right\}/g, '}');
        htmlContent = htmlContent.replace(/\\left\|/g, '|').replace(/\\right\|/g, '|');
        htmlContent = htmlContent.replace(/\\([\[\]\{\}\(\)\|\+\-\*\/])/g, '$1');


        stepsModalBody.innerHTML = htmlContent;
        if (window.MathJax) {
            window.MathJax.typesetPromise([stepsModalBody]);
        }
    }

    closeModalButton.addEventListener('click', () => {
        stepsModal.classList.remove('show');
        bodyElement.classList.remove('modal-open');
    });

    stepsModal.addEventListener('click', (event) => {
        if (event.target === stepsModal) {
            stepsModal.classList.remove('show');
            bodyElement.classList.remove('modal-open');
        }
    });

    // --- Initial MathJax readiness check and category display ---
    const checkMathJaxReady = () => {
        if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
            window.MathJax.startup.promise.then(() => {
                showCategory(currentCategoryIndex); // اعرض الفئة الأولى
            }).catch(error => {
                console.error("MathJax startup promise failed:", error);
                showCategory(currentCategoryIndex); // fallback
            });
        } else {
            setTimeout(checkMathJaxReady, 100);
        }
    };
    checkMathJaxReady();

});