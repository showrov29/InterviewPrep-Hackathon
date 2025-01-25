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
        data.model = "llama-3.3-70b-versatile"
        data.max_tokens = 1024
        data.messages.push({
            role : "system",
            content: `The interview session has been ended. Based on the conversation, write a summary or result of the interview round. Write with you word. Give a point based summary. Add score out of 10 for every point. Don't give markdown. Add - before each point. End each line with a :::`
        })
        data.messages.push({
            role : "user",
            content: "How did I do? Give me a point based summary. Don't give markdown. Write them line by line separated by :::"
        })
    }
    else if(change_complexity){
        data.model = "llama-3.3-70b-versatile"
        data.max_tokens = 1024
        data.messages.push({
            role : "system",
            content: `Based on the conversation, adjust the difficulty level of the questions. If the user is performing well, increase the difficulty level. If the user is struggling, decrease the difficulty level.`
        })
        data.messages.push({
            role : "user",
            content: "How did I do? Give me a point based summary. Don't give markdown. Write them line by line separated by :::"
        })
    }
    else{
        let end_button = document.getElementById("end-button")
        if(end_button.style.display == 'none' && conversation_count>2){
            console.log('enabling end')
            end_button.style.display = 'inline-block';
        }
        conversation_count += 1
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
            let responseLLM = response.data.choices[0].message.content;
            data.messages.push({
                role: "assistant",
                content: responseLLM,
            });
            console.log(responseLLM);
            return responseLLM;
        })
        .catch((error) => {
            console.error("Error:", error);
        });
}
