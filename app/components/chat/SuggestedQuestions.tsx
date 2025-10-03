import React from 'react';

interface SuggestedQuestionsProps {
    questions: string[];
    onQuestionClick: (question: string) => void;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
    questions,
    onQuestionClick
}) => {
    if (questions.length === 0) return null;

    return (
        <div className="flex gap-1.5 mb-2 flex-wrap">
            {questions.map((q, idx) => (
                <button
                    key={idx}
                    onClick={() => onQuestionClick(q)}
                    className="text-[10px] bg-warm-50 hover:bg-warm-100 text-warm-600 px-2 py-1 rounded border border-warm-200 transition-colors"
                >
                    💡 {q}
                </button>
            ))}
        </div>
    );
};

export default SuggestedQuestions;
