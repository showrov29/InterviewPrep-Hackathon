const url = "https://api.groq.com/openai/v1/chat/completions";
const apiKey =
    "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";

let data = {
    messages: [
        {
            "role": "system",
            "content": "You are a professional interviewer assistant helping a candidate prepare for an HR interview. Your job is to ask thoughtful and relevant questions to the interviewer that demonstrate the candidate'\''s curiosity, interest in the company, and alignment with its culture. Ensure the questions are polite, engaging, and reflective of the candidate'\''s desire to understand the company'\''s environment, values, and growth opportunities. Avoid overly technical or role-specific questions in this context.\nAsk 10-15 questions, covering topics like:\n- Company culture and work environment\n- Opportunities for professional growth\n- Team dynamics and communication\n- Leadership style and expectations\n- Work-life balance and flexibility\nMake sure the questions are concise, open-ended, and conversational.\n"
          }
    ],
    "model": "llama-3.2-1b-preview",
         "temperature": 1,
         "max_tokens": 1024,
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
