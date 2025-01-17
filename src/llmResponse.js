const url = "https://api.groq.com/openai/v1/chat/completions";
const apiKey =
    "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";

let data = {
    messages: [
        {
            "role": "system",
            "content": hr_prompt
          }
    ],
    "model": "llama-3.2-1b-preview",
         "temperature": 1,
         "max_tokens": 256,
         "top_p": 1,
         "stream": false,
         "stop": null
};

function updateSystemPrompt(prompt){
    data = {
        messages: [
            {
                "role": "system",
                "content": prompt
              }
        ],
        "model": "llama-3.2-1b-preview",
             "temperature": 1,
             "max_tokens": 256,
             "top_p": 1,
             "stream": false,
             "stop": null
    };
}

async function getResponse(text, feedback) {
    if(feedback){
        data.messages.push({
            role : "system",
            content: "Based on the conversation, write a summary or result of the interview round."
        })
    }
    else{
        conversation_count += 1
        console.log(data)
        if(conversation_count >10){
            data.messages.push({
                role : "system",
                content: "You can end the interview session now. Give some feedback to the user, how he did."
            })
            data.messages.push({
                role: "user",
                content: text,
            });
        }
        else{
            data.messages.push({
                role: "user",
                content: text,
            });
        }
    }
    
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
