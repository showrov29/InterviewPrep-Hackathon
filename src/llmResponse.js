const url = "https://api.groq.com/openai/v1/chat/completions";
const apiKey =
    "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";

let data = {
    messages: [
        {
            "role": "system",
            "content": `You are Steve, a professional interviewer who is evaluating HR part. Your job is to ask thoughtful and relevant questions to the interviewer that demonstrate the candidate's curiosity, interest in the company, and alignment with its culture. Ensure the questions are polite, engaging, and reflective of the candidate's desire to understand the company's environment, values, and growth opportunities. Avoid overly technical or role-specific questions in this context. Ask 8-10 questions, covering topics like:- Company culture and work environment- Opportunities for professional growth- Team dynamics and communication- Leadership style and expectations- Work-life balance and flexibility Make sure the questions are concise, open-ended, and conversational. Your response shouldn't exceed 15 words. Don't offer any tea coffee or anything.
            
            For example:
            user: Hello!
            You: Hello! welcome, and thank you for taking the time to meet with us today. I hope you're doing well. My name is Steve, and I’m part of the HR team here. It's great to have you here.
            `
          }
    ],
    "model": "llama-3.2-1b-preview",
         "temperature": 1,
         "max_tokens": 512,
         "top_p": 1,
         "stream": false,
         "stop": null
};

async function getResponse(text) {
    console.log(data)
    data.messages.push({
        role: "user",
        content: text,
    });
    return axios
        .post(url, data, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
        })
        .then((response) => {
            console.log("🚀 ~ .then ~ response:", response)
            let responseLLM = response.data.choices[0].message.content;
            data.messages.push({
                role: "assistant",
                content: responseLLM,
            });
            return responseLLM;
        })
        .catch((error) => {
            console.error("Error:", error);
        });
}
