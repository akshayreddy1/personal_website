// This is a Vercel Serverless Function, which runs in a secure Node.js environment.
export const config = { runtime: 'edge' };
export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // 2. Securely get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Using API Key:', apiKey ? 'Present' : 'Missing');
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        // 3. Get profile data from the request body sent by the front end
        const { aboutText1, aboutText2, skills, experience, projects } = req.body;

        // Basic validation to ensure we have some data
        if (!aboutText1 || !skills || !experience) {
            return res.status(400).json({ error: 'Missing required profile data.' });
        }

        // 4. Construct the user query and system prompt
        const userQuery = `
            Here is the profile of a software engineer:
            ---
            ABOUT:
            ${aboutText1}
            ${aboutText2}
            ---
            SKILLS:
            ${skills}
            ---
            EXPERIENCE:
            ${experience}
            ---
            PROJECTS:
            ${projects}
        `;
        
        const systemPrompt = "Act as a world-class tech recruiter. Your task is to provide a concise, professional, and enthusiastic summary of a software engineer's profile based on the information provided. The summary should be one paragraph and highlight their key strengths, experience level, and technical abilities in a way that would impress a hiring manager. Do not use markdown, just plain text.";

        // 5. Call the Google Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorDetails = await apiResponse.json();
            console.error('Google API Error:', errorDetails);
            throw new Error(errorDetails?.error?.message || 'Failed to fetch response from Google AI.');
        }

        const result = await apiResponse.json();
        const summaryText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!summaryText) {
            throw new Error('The API returned an empty or invalid response.');
        }

        // 6. Send the successful response back to the front end
        return res.status(200).json({ summary: summaryText });

    } catch (error) {
        // 7. Handle any errors that occurred during the process
        console.error('Error in summarize function:', error);
        return res.status(500).json({ error: 'Failed to generate summary.' });
    }
}