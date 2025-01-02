const mongoose = require('mongoose');

// Candidate Schema
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  position: { type: String, required: true },
  interview_date: { type: Date },
  status: { type: String, enum: ['Pending', 'Completed', 'Rejected'] },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Question Schema
const questionSchema = new mongoose.Schema({
  question_text: { type: String, required: true },
  category: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  tags: [{ type: String }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Answer Schema
const answerSchema = new mongoose.Schema({
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  answer_text: { type: String, required: true },
  score: { type: Number, min: 0, max: 10 },
  comments: { type: String },
  answered_at: { type: Date, default: Date.now }
});

// Interview Session Schema
const interviewSessionSchema = new mongoose.Schema({
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  interviewer: { type: String, required: true },
  questions: [
    {
      question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      answer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }
    }
  ],
  status: { type: String, enum: ['In Progress', 'Completed'] },
  session_date: { type: Date, default: Date.now },
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Export Models
const Candidate = mongoose.model('Candidate', candidateSchema);
const Question = mongoose.model('Question', questionSchema);
const Answer = mongoose.model('Answer', answerSchema);
const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

module.exports = { Candidate, Question, Answer, InterviewSession };
