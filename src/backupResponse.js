function getBackupResponse() {
      let backup = {};
        if(current_role === "hr"){
          backup = {
            "Improvements": [
              "Ask more open-ended questions",
              "Show more enthusiasm",
            ],
            "score": 50,
            "confidence": 30,
            "communication": 20,
            "attitude": 40,
            "backstory": "The user participated in an HR interview for a Junior Software Engineer position, but provided brief and unclear answers, showing limited interest in the company and its culture."

          }
        } else if(current_role === "barista"){
            backup = {
                "Improvements": [
                "Be more welcoming",
                "Offer more recommendations",
                ],
                "score": 50,
                "confidence": 40,
                "communication": 30,
                "attitude": 40,
                "backstory": "The user ordered coffee, but needed guidance from the barista."
            }
            }
            else if(current_role === "visa"){
                backup = {
                    "Improvements": [
                    "Ask more structured questions",
                    "Maintain a neutral tone",
                    ],
                    "score": 30,
                    "confidence": 20,
                    "communication": 30,
                    "attitude": 20,
                    "backstory": "The user applied for a visa but was unclear about their travel plans, stating a desire to 'eat chips'."

                }
                }
                else if(current_role === "technical"){
                    backup = {
                        "Improvements": [
                        "Explain concepts more clearly",
                        "Improve problem-solving skills",
                        ],
                        "score": 20,
                        "confidence": 30,
                        "communication": 20,
                        "attitude": 40,
                        "backstory": "The user attended the final round of the interview for a Junior Software Engineer role."
                    }
                    }
    return backup;
  }