// ملف: netlify/functions/solve-integral.js

// هذا السطر مهم إذا كنت تستخدم متغيرات بيئة محليًا مع `netlify dev`،
// ولكن عند النشر، متغيرات البيئة ستأتي من واجهة Netlify.
require('dotenv').config();

// لا حاجة لـ express أو cors هنا

exports.handler = async function (event, context) {
    // التحقق من أن الطلب هو POST
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405, // Method Not Allowed
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Method Not Allowed. Please use POST." })
        };
    }

    let requestBody;
    try {
        // جسم الطلب (body) يأتي كـ string من Netlify، لذا يجب تحليله
        requestBody = JSON.parse(event.body);
    } catch (e) {
        console.error("Invalid JSON body:", e);
        return {
            statusCode: 400, // Bad Request
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Invalid JSON body provided." })
        };
    }

    const integralExpression = requestBody.integral;
    const requestType = requestBody.type;

    if (!integralExpression) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Integral expression is missing.' })
        };
    }
    if (!requestType || (requestType !== 'solve' && requestType !== 'steps')) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Invalid request type. Must be "solve" or "steps".' })
        };
    }

    // الحصول على مفتاح API من متغيرات البيئة المعرفة في واجهة Netlify
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("FATAL ERROR: GEMINI_API_KEY is not set in Netlify environment variables.");
        return {
            statusCode: 500, // Internal Server Error
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Server configuration error: API key is missing.' })
        };
    }

    // بناء الـ prompt بناءً على نوع الطلب
    let prompt;
    if (requestType === 'solve') {
        prompt = `You are a highly advanced symbolic mathematics assistant. Your task is to evaluate the given definite or indefinite integral.

Integral to evaluate: "${integralExpression}"

Instructions for output:
1. Accuracy is paramount. Provide the most precise and mathematically correct solution.
2. Return ONLY the final mathematical result as a single, clean LaTeX string (for symbolic results) or a plain number/fraction (for definite integrals).
3. Absolutely NO:
   - Explanations, introductions, or conclusions.
   - Markdown formatting (e.g., \`\`\`latex\`\`\`, quotes).
   - Conversational phrases or apologies.
   - Repetition of the result.
4. LaTeX formatting:
   - Use complete, correct LaTeX with standard commands like \\frac{}{}, \\sin(), \\cos(), \\ln(), \\exp(), \\sqrt{}, \\int, _{}, ^{}, etc.
   - For indefinite integrals, include the constant of integration "+ C".
5. Error handling:
   - If the integral is invalid, unsolvable in elementary functions, or beyond current capabilities, return exactly: "Error: Integral is invalid, unsolvable, or beyond current capabilities."
6. Examples:
   - For "∫x^2 dx", return: "\\frac{x^3}{3} + C"
   - For "∫₀¹ x dx", return: "0.5" or "1/2"
   - For "∫sin(x)cos(x) dx", return: "\\frac{\\sin^2(x)}{2} + C" (or an equivalent form)
   - For "∫1/x dx", return: "\\ln{\\left|x \\right|} + C"

Provide ONLY the solution for the integral: "${integralExpression}"`;

    } else { // requestType === 'steps'
        prompt = `أنت مساعد رياضي متخصص في تقديم حلول تكاملات بدقة ووضوح.

مهمتك هي تقديم حل تفصيلي خطوة بخطوة للتكامل التالي:
${integralExpression}

**تعليمات الحل:**
1. اشرح في كل خطوة القاعدة أو الخاصية الرياضية المستخدمة **باللغة العربية** (مثلاً: "بتطبيق قاعدة القوة للتكامل: ∫x^n dx = \\frac{x^{n+1}}{n+1} + C"، أو "باستخدام التكامل بالتعويض، نفرض أن u = ..."، أو "باستخدام التكامل بالتجزئة: ∫u dv = uv - ∫v du").
2. قم بعرض **جميع الحسابات الوسيطة الهامة**، والتبسيطات الجبرية.
3. يجب أن تكون **كل المعادلات الرياضية بصيغة LaTeX** فقط.
4. صِغ الإجابة على شكل **قائمة مرقمة (Markdown ordered list)** توضح كل خطوة بشكل منظم.
5. **لا تضف أي تعليق** يشير إلى أن الحل تم توليده بواسطة نموذج ذكاء صناعي.
6. في نهاية الحل، **اعرض النتيجة النهائية للتكامل بصيغة LaTeX** في خطوة منفصلة.

التكامل هو:
${integralExpression}`;
    }


    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    // تأكد من استخدام اسم النموذج الصحيح الذي لديك صلاحية الوصول إليه
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const fetch = (await import('node-fetch')).default; // استيراد node-fetch ديناميكيًا

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const apiResponseData = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error(`Gemini API Error: ${apiResponse.status} ${apiResponse.statusText}`, JSON.stringify(apiResponseData, null, 2));
            let errorMessage = 'Error from Gemini API.';
            if (apiResponseData.error && apiResponseData.error.message) {
                errorMessage = apiResponseData.error.message;
            }
            return {
                statusCode: apiResponse.status,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: errorMessage, details: apiResponseData })
            };
        }

        if (apiResponseData.candidates && apiResponseData.candidates.length > 0 &&
            apiResponseData.candidates[0].content && apiResponseData.candidates[0].content.parts &&
            apiResponseData.candidates[0].content.parts.length > 0) {

            let resultText = apiResponseData.candidates[0].content.parts[0].text.trim();
            console.log("Raw response from Gemini:", `"${resultText}"`);

            // معالجة أساسية لإزالة تنسيق Markdown
            if (resultText.startsWith("```latex")) {
                resultText = resultText.substring(7);
                if (resultText.endsWith("```")) {
                    resultText = resultText.substring(0, resultText.length - 3);
                }
                resultText = resultText.trim();
            } else if (resultText.startsWith("```")) {
                resultText = resultText.substring(3);
                if (resultText.endsWith("```")) {
                    resultText = resultText.substring(0, resultText.length - 3);
                }
                resultText = resultText.trim();
            }

            console.log("Cleaned response for frontend:", `"${resultText}"`);

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ result: resultText })
            };

        } else {
            console.error('Unexpected Gemini API response structure:', JSON.stringify(apiResponseData, null, 2));
            if (apiResponseData.promptFeedback && apiResponseData.promptFeedback.blockReason) {
                return {
                    statusCode: 400, // أو كود خطأ مناسب آخر
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ error: `Request blocked by API: ${apiResponseData.promptFeedback.blockReason}`, details: apiResponseData.promptFeedback })
                };
            }
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: 'Failed to get a valid response from Gemini API (unexpected structure).' })
            };
        }

    } catch (error) {
        console.error('Error in Netlify function execution:', error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Internal server error while processing integral.', details: error.message })
        };
    }
};