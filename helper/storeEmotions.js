function extractTopThreeEmotions(message) {
	// extract emotion scores from the message
	const scores = message.models.prosody?.scores;

	// convert the emotions object into an array of key-value pairs
	const scoresArray = Object.entries(scores || {});

	// sort the array by the values in descending order
	scoresArray.sort((a, b) => b[1] - a[1]);

	// extract the top three emotions and convert them back to an object
	const topThreeEmotions = scoresArray.slice(0, 3).map(([emotion, score]) => ({
		emotion,
		score: (Math.round(Number(score) * 100) / 100).toFixed(2),
	}));

	return topThreeEmotions;
}

function appendMessage() {
	// generate chat card component with message content and emotion scores
	// const chatCard = new ChatCard({
	// 	role,
	// 	timestamp: new Date().toLocaleTimeString(),
	// 	content,
	// 	scores: topThreeEmotions,
	// });

	// append chat card to the UI
	// chat?.appendChild(chatCard.render());

	// scroll to the bottom to view most recently added message
	// if (chat) chat.scrollTop = chat.scrollHeight;
}
export { extractTopThreeEmotions, appendMessage };
