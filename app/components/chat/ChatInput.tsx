import React from 'react';

interface ChatInputProps {
    question: string;
    asking: boolean;
    onQuestionChange: (question: string) => void;
    onSubmit: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    question,
    asking,
    onQuestionChange,
    onSubmit
}) => {
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !asking) {
            onSubmit();
        }
    };

    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={question}
                onChange={(e) => onQuestionChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Задайте вопрос о документах..."
                className="flex-1 bg-white text-warm-800 placeholder-warm-400 px-4 py-2 rounded-lg border border-warm-200 focus:border-accent-400 focus:outline-none transition-colors text-sm"
                disabled={asking}
            />
            <button
                onClick={onSubmit}
                disabled={!question.trim() || asking}
                className="bg-accent-500 hover:bg-accent-600 disabled:bg-warm-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm transition-colors"
            >
                {asking ? '⏳' : '📤'}
            </button>
        </div>
    );
};

export default ChatInput;
