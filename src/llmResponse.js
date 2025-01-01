const url = "https://api.x.ai/v1/chat/completions";
const apiKey =
    "xai-Rx0MIsSbI7veFYjKdzkZWlHee0GbDmCIvZM6vmfvn6q3ScMondwlIdLhXUXucBKNEqOjG1p5zs2NBLm6";

let data = {
    messages: [
        {
            role: "system",
            content: `You are a professional interviewer named Alex, conducting a technical interview for a Frontend Web Developer role, focusing on React.js. Your tone is formal, respectful, and encouraging, with questions and responses kept concise (3-4 sentences). Start by introducing yourself and explaining the interview's purpose. Ask beginner-level questions about React topics like JSX, components, props, state, and hooks. Provide clear and brief feedback or follow-up questions based on the candidate’s answers, and wrap up the interview with a summary and helpful advice for improvement.`
        },
    ],
    model: "grok-beta",
    stream: false,
    temperature: 0,
};

async function getResponse(text) {
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
