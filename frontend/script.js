document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const feedbackContainer = document.getElementById('feedback-container');
    const correctAnswerInput = document.getElementById('correct-answer-input');
    const saveAnswerBtn = document.getElementById('save-answer-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const userRole = sessionStorage.getItem('userRole');
    let lastQuestion = '';

    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        const paragraph = document.createElement('p');
        paragraph.innerHTML = text;
        messageElement.appendChild(paragraph);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showLoadingIndicator() {
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('chat-message', 'loading');
        loadingElement.id = 'loading-indicator';
        loadingElement.innerHTML = '<p>...</p>';
        chatBox.appendChild(loadingElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function hideLoadingIndicator() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            chatBox.removeChild(loadingElement);
        }
    }

    function showTeachForm() {
        feedbackContainer.style.display = 'flex';
    }

    function hideTeachForm() {
        feedbackContainer.style.display = 'none';
        correctAnswerInput.value = '';
    }

    async function saveNewAnswer() {
        const correctAnswer = correctAnswerInput.value.trim();
        if (correctAnswer === '' || lastQuestion === '') return;

        try {
            const response = await fetch('http://127.0.0.1:8000/ensinar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: lastQuestion,
                    correct_answer: correctAnswer,
                }),
            });

            if (response.ok) {
                addMessage('Obrigado! Aprendi a nova resposta.', 'bot');
            } else {
                addMessage('Desculpe, não consegui salvar o aprendizado.', 'bot');
            }

        } catch (error) {
            console.error('Erro ao ensinar:', error);
            addMessage('Erro de conexão ao tentar ensinar o bot.', 'bot');
        } finally {
            hideTeachForm();
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('userRole'); 
        window.location.href = 'login.html';
    }    

    async function sendMessage() {
        const question = userInput.value.trim();
        if (question === '') return;

        lastQuestion = question;
        hideTeachForm();
        addMessage(question, 'user');
        userInput.value = '';
        showLoadingIndicator();

        try {
            const response = await fetch('http://127.0.0.1:8000/perguntar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question }),
            });

            hideLoadingIndicator();

            if (!response.ok) {
                addMessage('Desculpe, ocorreu um erro no servidor.', 'bot');
                return;
            }

            const data = await response.json();
            const formattedAnswer = data.answer.replace(/\n/g, '<br>');
            addMessage(formattedAnswer, 'bot');

            
            
            const lowerCaseAnswer = data.answer.toLowerCase();
            if ((lowerCaseAnswer.includes("não sei") || lowerCaseAnswer.includes("não encontrei")) && userRole === 'admin') {
                showTeachForm();
            }

        } catch (error) {
            hideLoadingIndicator();
            console.error('Erro:', error);
            addMessage('Não foi possível conectar ao chatbot.', 'bot');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') sendMessage();
    });
    saveAnswerBtn.addEventListener('click', saveNewAnswer);
    logoutBtn.addEventListener('click', handleLogout);
});