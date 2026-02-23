import { GoogleGenerativeAI } from "@google/generative-ai";

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔹 Common function to generate text
const generateResponse = async (systemInstruction, userInput) => {
    const model = genAi.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction
    });

    const response = await model.generateContent(userInput);
    return response.response.text();
};

/* =========================
   1️⃣ Grammar Rephrase
========================= */
export const rephraseText = async (req, res) => {
    try {
        const { text } = req.body;

        const result = await generateResponse(
            "You are a grammar correction tool. Fix only grammar, spelling, and verb tense errors. Do not rewrite stylistically. Do not make it more engaging. Do not add new information. Return only the corrected sentence.",
            text
        );

        res.json({ success: true, result });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


/* =========================
   2️⃣ Summarize
========================= */
export const summarizesText = async (req, res) => {
    try {
        const { text } = req.body;

        const result = await generateResponse(
            "Rewrite the text to be short and clear. Keep the meaning same. Return only the rewritten sentence.",
            text
        );

        res.json({ success: true, result });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


/* =========================
   3️⃣ Tone Changer
========================= */
export const changeTone = async (req, res) => {
    try {
        const { text, tone } = req.body;

        const result = await generateResponse(
            `Rewrite the text in a ${tone} tone. Keep the meaning same. Return only the rewritten sentence.`,
            text
        );

        res.json({ success: true, result });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


/* =========================
   4️⃣ Emotion Softener
========================= */
export const softenText = async (req, res) => {
    try {
        const { text } = req.body;

        const result = await generateResponse(
            "Rewrite this message in a polite, emotionally intelligent, and calm way. Do not change the meaning. Return only the rewritten sentence.",
            text
        );

        res.json({ success: true, result });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


//    Smart Reply Generator
export const smartReply = async (req, res) => {
    try {
        const { conversation } = req.body;

        const result = await generateResponse(
            "Based on this conversation, suggest exactly 3 short natural replies. Separate each reply with a newline. Do not add numbering.",
            conversation
        );

        // Split into array for frontend buttons
        const replies = result.split("\n").filter(r => r.trim() !== "");

        res.json({ success: true, replies });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};