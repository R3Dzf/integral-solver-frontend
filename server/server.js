// يجب أن يكون هذا السطر أول سطر في الملف لضمان تحميل متغيرات البيئة من .env
require('dotenv').config();

const express = require('express'); // لإعداد الخادم والتوجيه
const cors = require('cors'); // للتعامل مع سياسة أصل الموارد المشتركة (CORS)

const app = express();
const port = process.env.PORT || 3000; // المنفذ الذي سيعمل عليه الخادم، افتراضياً 3000

app.use(cors()); // تفعيل CORS للسماح بالاتصال من الواجهة الأمامية
app.use(express.json()); // Middleware لتحليل جسم الطلب بصيغة JSON

app.post('/api/solve-integral', async (req, res) => {
    const integralExpression = req.body.integral;
    const requestType = req.body.type; // 'solve' أو 'steps'

    if (!integralExpression) {
        return res.status(400).json({ error: 'Integral expression is missing.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    let prompt;
    if (requestType === 'solve') {
        // --- هذا هو الـ "Prompt الأقوى" المقترح ---
        prompt = `Evaluate the definite or indefinite integral: "${integralExpression}".
Strictly return ONLY the final mathematical result as a single, clean LaTeX string or a plain number.
ABSOLUTELY NO other text, explanations, context, apologies, or markdown formatting (such as \`\`\`latex or \`\`\`).
For example:
- If the integral is "∫x dx", return "\\frac{x^2}{2} + C".
- If the integral is "∫(from 0 to 1) of 2x dx", return "1".
- If the integral is invalid or cannot be solved, return exactly the string "Error: Invalid or unsolvable integral."
Do not repeat the result. Ensure the LaTeX is complete and correct for rendering.
The integral to solve is: "${integralExpression}"`;
        // --- نهاية الـ Prompt الأقوى ---

    } else if (requestType === 'steps') {
        // prompt معدل لطلب الخطوات مع الشرح باللغة العربية
        prompt = `قدم حلاً مفصلاً، خطوة بخطوة، للتكامل التالي: ${integralExpression}.
    لكل خطوة، اشرح بوضوح قاعدة التكامل أو الخاصية الرياضية المطبقة باللغة العربية (مثال: "بتطبيق قاعدة القوة للتكامل: ∫x^n dx = (x^(n+1))/(n+1) + C"، "باستخدام التكامل بالتعويض، نفرض أن u = ..."، "بتطبيق التكامل بالتجزيء: ∫u dv = uv - ∫v du").
    اعرض جميع الحسابات الجبرية الوسيطة والتبسيطات الهامة بوضوح.
    يجب أن تكون جميع المعادلات الرياضية بصيغة LaTeX. قم بتنسيق الإجابة كقائمة مرتبة في Markdown.
    لا تضف أي نص يشير إلى أن الحل تم إنشاؤه بواسطة ذكاء اصطناعي أو نموذج لغوي.
    التكامل هو: ${integralExpression}`;
    } else {
        return res.status(400).json({ error: 'Invalid request type.' });
    }

    let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    // تأكد من أنك تستخدم الإصدار المناسب من النموذج، مثلاً gemini-1.5-flash أو gemini-pro
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;


    try {
        const fetch = (await import('node-fetch')).default;

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const apiResponseData = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error(`Gemini API Error: ${apiResponse.status} ${apiResponse.statusText}`, apiResponseData);
            let errorMessage = 'Error from Gemini API.';
            if (apiResponseData.error && apiResponseData.error.message) {
                errorMessage = apiResponseData.error.message;
            }
            return res.status(apiResponse.status).json({ error: errorMessage, details: apiResponseData });
        }

        if (apiResponseData.candidates && apiResponseData.candidates.length > 0 &&
            apiResponseData.candidates[0].content && apiResponseData.candidates[0].content.parts &&
            apiResponseData.candidates[0].content.parts.length > 0) {

            let resultText = apiResponseData.candidates[0].content.parts[0].text.trim();
            // تسجيل الرد الخام المستلم من Gemini (مع علامات اقتباس لرؤية المسافات البادئة/اللاحقة)
            console.log("Raw response from Gemini:", `"${resultText}"`);

            // --- معالجة أساسية لإزالة تنسيق Markdown الشائع '''latex ---
            if (resultText.startsWith("```latex")) {
                resultText = resultText.substring(7); // إزالة ```latex
                if (resultText.endsWith("```")) {
                    resultText = resultText.substring(0, resultText.length - 3); // إزالة ``` اللاحقة
                }
                resultText = resultText.trim(); // إزالة أي مسافات بيضاء ناتجة
            } else if (resultText.startsWith("```")) { // في حال كانت فقط ``` بدون كلمة latex
                resultText = resultText.substring(3);
                if (resultText.endsWith("```")) {
                    resultText = resultText.substring(0, resultText.length - 3);
                }
                resultText = resultText.trim();
            }
            // --- نهاية المعالجة الأساسية ---

            // تسجيل الرد بعد التنظيف (إن وجد) وقبل إرساله للواجهة الأمامية
            console.log("Cleaned response for frontend:", `"${resultText}"`);

            res.json({ result: resultText });

        } else {
            // إذا لم يكن هناك "مرشحون" أو "أجزاء" في الرد، فهذا يعني أن بنية الرد غير متوقعة
            console.error('Unexpected Gemini API response structure (no candidates or parts):', JSON.stringify(apiResponseData, null, 2));
            // تحقق مما إذا كان هناك خطأ ضمني في الرد لم يتم اكتشافه بواسطة !apiResponse.ok
            if (apiResponseData.promptFeedback && apiResponseData.promptFeedback.blockReason) {
                return res.status(400).json({ error: `Request blocked by API: ${apiResponseData.promptFeedback.blockReason}`, details: apiResponseData.promptFeedback });
            }
            res.status(500).json({ error: 'Failed to get a valid response from Gemini API (unexpected structure).' });
        }

    } catch (error) {
        console.error('Error proxying request to Gemini API:', error);
        res.status(500).json({ error: 'Internal server error while processing integral.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`Access backend via: http://localhost:${port}`);
});